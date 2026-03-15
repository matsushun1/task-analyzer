import type { Client } from '@notionhq/client'
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import {
  fetchTasks,
  fetchBlockChildren,
  processReport,
  fetchDailyNotes,
  processDailyNotes,
  fetchDoTodayTasksPageId,
  appendReportToPage,
} from '../../../services/notionService'
import { NotionAPIError, BlockFetchError } from '../../../utils/errors'
import type { NotionClient } from '../../../clients/notionClient'
import type { ClaudeAnalysisResult } from '../../../models/types/analysis.types'

const makeNotionClient = (overrides: Partial<{ query: jest.Mock; listBlockChildren: jest.Mock }>): NotionClient => {
  const query = overrides.query ?? jest.fn()
  const listBlockChildren = overrides.listBlockChildren ?? jest.fn()
  return {
    inner: {
      dataSources: { query },
      blocks: { children: { list: listBlockChildren } },
    } as unknown as Client,
  }
}

describe('notionService', () => {
  describe('fetchTasks', () => {
    it('Status=Doingのフィルタでデータベースをクエリする', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ results: [] })
      const client = makeNotionClient({ query: mockQuery })

      await fetchTasks('database-id-123', client)

      expect(mockQuery).toHaveBeenCalledWith({
        data_source_id: 'database-id-123',
        filter: {
          property: 'Status',
          select: { equals: 'Doing' },
        },
      })
    })

    it('Notionから取得したタスクを返す', async () => {
      const notionTask = {
        id: 'task-id-1',
        properties: {
          Name: { title: [{ plain_text: 'テストタスク' }] },
          Status: { select: { name: 'Doing' } },
          'Date Created': { created_time: '2026-03-08T00:00:00.000Z' },
        },
      }
      const client = makeNotionClient({ query: jest.fn().mockResolvedValue({ results: [notionTask] }) })

      const result = await fetchTasks('database-id-123', client)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(notionTask)
    })

    it('タスクが0件のときは空配列を返す', async () => {
      const client = makeNotionClient({ query: jest.fn().mockResolvedValue({ results: [] }) })

      const result = await fetchTasks('database-id-123', client)

      expect(result).toEqual([])
    })

    it('Notion APIがエラーを返したとき NotionAPIError をthrowする', async () => {
      const client = makeNotionClient({ query: jest.fn().mockRejectedValue(new Error('Notion API error')) })

      await expect(fetchTasks('database-id-123', client)).rejects.toThrow(NotionAPIError)
    })
  })

  describe('fetchBlockChildren', () => {
    it('指定したページIDのブロック一覧を取得する', async () => {
      const paragraphBlock = {
        id: 'block-1',
        type: 'paragraph',
        has_children: false,
        paragraph: { rich_text: [{ plain_text: 'テスト' }] },
      }
      const mockList = jest.fn().mockResolvedValue({ results: [paragraphBlock] })
      const client = makeNotionClient({ listBlockChildren: mockList })

      const result = await fetchBlockChildren('page-id-1', client)

      expect(mockList).toHaveBeenCalledWith({ block_id: 'page-id-1' })
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject(paragraphBlock)
    })

    it('has_children: true のブロックの子ブロックを再帰的に取得する', async () => {
      const childBlock = { id: 'child-1', type: 'bulleted_list_item', has_children: false }
      const parentBlock = { id: 'parent-1', type: 'to_do', has_children: true }
      const mockList = jest.fn()
        .mockResolvedValueOnce({ results: [parentBlock] })
        .mockResolvedValueOnce({ results: [childBlock] })
      const client = makeNotionClient({ listBlockChildren: mockList })

      const result = await fetchBlockChildren('page-id-1', client)

      expect(mockList).toHaveBeenCalledTimes(2)
      expect(mockList).toHaveBeenNthCalledWith(2, { block_id: 'parent-1' })
      expect(result[0]).toMatchObject({ ...parentBlock, children: [expect.objectContaining(childBlock)] })
    })

    it('has_children: false のブロックは子を取得しない', async () => {
      const leafBlock = { id: 'leaf-1', type: 'paragraph', has_children: false }
      const mockList = jest.fn().mockResolvedValue({ results: [leafBlock] })
      const client = makeNotionClient({ listBlockChildren: mockList })

      await fetchBlockChildren('page-id-1', client)

      expect(mockList).toHaveBeenCalledTimes(1)
    })

    it('深さ2以上の入れ子を再帰的に取得する', async () => {
      const grandChildBlock = { id: 'grand-child-1', type: 'bulleted_list_item', has_children: false }
      const childBlock = { id: 'child-1', type: 'toggle', has_children: true }
      const parentBlock = { id: 'parent-1', type: 'to_do', has_children: true }
      const mockList = jest.fn()
        .mockResolvedValueOnce({ results: [parentBlock] })
        .mockResolvedValueOnce({ results: [childBlock] })
        .mockResolvedValueOnce({ results: [grandChildBlock] })
      const client = makeNotionClient({ listBlockChildren: mockList })

      const result = await fetchBlockChildren('page-id-1', client)

      expect(mockList).toHaveBeenCalledTimes(3)
      const child = result[0].children[0]
      expect(child).toMatchObject({ ...childBlock, children: [expect.objectContaining(grandChildBlock)] })
    })

    it('除外ブロックの子は取得しない', async () => {
      const codeBlock = { id: 'code-1', type: 'code', has_children: true }
      const mockList = jest.fn().mockResolvedValue({ results: [codeBlock] })
      const client = makeNotionClient({ listBlockChildren: mockList })

      const result = await fetchBlockChildren('page-id-1', client)

      expect(mockList).toHaveBeenCalledTimes(1)
      expect(result).toHaveLength(0)
    })

    it('typeがcodeのブロックを除外する', async () => {
      const codeBlock = { id: 'block-code', type: 'code' }
      const paragraphBlock = { id: 'block-para', type: 'paragraph' }
      const mockList = jest.fn().mockResolvedValue({ results: [codeBlock, paragraphBlock] })
      const client = makeNotionClient({ listBlockChildren: mockList })

      const result = await fetchBlockChildren('page-id-1', client)

      expect(result).toHaveLength(1)
      expect((result[0] as BlockObjectResponse).type).toBe('paragraph')
    })

    it('typeがimageのブロックを除外する', async () => {
      const imageBlock = { id: 'block-image', type: 'image' }
      const paragraphBlock = { id: 'block-para', type: 'paragraph' }
      const mockList = jest.fn().mockResolvedValue({ results: [imageBlock, paragraphBlock] })
      const client = makeNotionClient({ listBlockChildren: mockList })

      const result = await fetchBlockChildren('page-id-1', client)

      expect(result).toHaveLength(1)
      expect((result[0] as BlockObjectResponse).type).toBe('paragraph')
    })

    it('typeがvideo, file, audioのブロックをまとめて除外する', async () => {
      const blocks = [
        { id: 'b1', type: 'video' },
        { id: 'b2', type: 'file' },
        { id: 'b3', type: 'audio' },
        { id: 'b4', type: 'to_do' },
        { id: 'b5', type: 'bulleted_list_item' },
      ]
      const mockList = jest.fn().mockResolvedValue({ results: blocks })
      const client = makeNotionClient({ listBlockChildren: mockList })

      const result = await fetchBlockChildren('page-id-1', client)

      expect(result).toHaveLength(2)
      expect(result.map((b) => (b as BlockObjectResponse).type)).toEqual([
        'to_do',
        'bulleted_list_item',
      ])
    })

    it('ブロックが0件のときは空配列を返す', async () => {
      const mockList = jest.fn().mockResolvedValue({ results: [] })
      const client = makeNotionClient({ listBlockChildren: mockList })

      const result = await fetchBlockChildren('page-id-1', client)

      expect(result).toEqual([])
    })

    it('Notion APIがエラーを返したとき BlockFetchError をthrowする', async () => {
      const mockList = jest.fn().mockRejectedValue(new Error('Notion API error'))
      const client = makeNotionClient({ listBlockChildren: mockList })

      await expect(fetchBlockChildren('page-id-1', client)).rejects.toThrow(BlockFetchError)
    })
  })

  describe('processReport', () => {
    it('fetchTasksをtaskDatabaseIdとclientで呼ぶ', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ results: [] })
      const client = makeNotionClient({ query: mockQuery })

      await processReport('task-db-id', client)

      expect(mockQuery).toHaveBeenCalledWith({
        data_source_id: 'task-db-id',
        filter: { property: 'Status', select: { equals: 'Doing' } },
      })
    })

    it('fetchTasksで取得したタスクIDでfetchBlockChildrenを呼ぶ', async () => {
      const tasks = [
        {
          id: 'task-1',
          properties: {
            Name: { title: [{ plain_text: 'タスク1' }] },
            Status: { select: { name: 'Doing' } },
            'Date Created': { created_time: '2026-03-08T00:00:00.000Z' },
          },
        },
        {
          id: 'task-2',
          properties: {
            Name: { title: [{ plain_text: 'タスク2' }] },
            Status: { select: { name: 'Doing' } },
            'Date Created': { created_time: '2026-03-08T00:00:00.000Z' },
          },
        },
      ]
      const mockQuery = jest.fn().mockResolvedValue({ results: tasks })
      const mockList = jest.fn().mockResolvedValue({ results: [] })
      const client = makeNotionClient({ query: mockQuery, listBlockChildren: mockList })

      await processReport('task-db-id', client)

      expect(mockList).toHaveBeenCalledWith({ block_id: 'task-1' })
      expect(mockList).toHaveBeenCalledWith({ block_id: 'task-2' })
    })

    it('TaskData[] を返す', async () => {
      const task = {
        id: 'task-1',
        properties: {
          Name: { title: [{ plain_text: 'タスク1' }] },
          Status: { select: { name: 'Doing' } },
          'Date Created': { created_time: '2026-03-08T00:00:00.000Z' },
        },
      }
      const client = makeNotionClient({
        query: jest.fn().mockResolvedValue({ results: [task] }),
        listBlockChildren: jest.fn().mockResolvedValue({ results: [] }),
      })

      const result = await processReport('task-db-id', client)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'task-1',
        name: 'タスク1',
        status: 'Doing',
        subTasks: [],
      })
    })

    it('タスクが0件のとき空配列を返す', async () => {
      const client = makeNotionClient({ query: jest.fn().mockResolvedValue({ results: [] }) })

      const result = await processReport('task-db-id', client)

      expect(result).toEqual([])
    })

    it('fetchTasksが失敗したときエラーをthrowする', async () => {
      const client = makeNotionClient({ query: jest.fn().mockRejectedValue(new Error('Notion API error')) })

      await expect(processReport('task-db-id', client)).rejects.toThrow(NotionAPIError)
    })
  })

  describe('fetchDailyNotes', () => {
    afterEach(() => {
      jest.useRealTimers()
    })

    it('日付プロパティのフィルタでデータベースをクエリする', async () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-03-11T00:00:00.000Z'))
      const mockQuery = jest.fn().mockResolvedValue({ results: [] })
      const client = makeNotionClient({ query: mockQuery })

      await fetchDailyNotes('daily-db-id', client)

      expect(mockQuery).toHaveBeenCalledWith({
        data_source_id: 'daily-db-id',
        filter: {
          property: '日付',
          date: { on_or_after: '2026-02-25' },
        },
      })
    })

    it('isNotionDailyNote を通過したノートのみ返す', async () => {
      const validNote = {
        id: 'note-1',
        properties: { 日付: { date: { start: '2026-03-10' } } },
      }
      const invalidNote = { id: 'note-2', properties: {} }
      const client = makeNotionClient({ query: jest.fn().mockResolvedValue({ results: [validNote, invalidNote] }) })

      const result = await fetchDailyNotes('daily-db-id', client)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(validNote)
    })

    it('ノートが0件のとき空配列を返す', async () => {
      const client = makeNotionClient({ query: jest.fn().mockResolvedValue({ results: [] }) })

      const result = await fetchDailyNotes('daily-db-id', client)

      expect(result).toEqual([])
    })

    it('Notion APIがエラーを返したとき NotionAPIError をthrowする', async () => {
      const client = makeNotionClient({ query: jest.fn().mockRejectedValue(new Error('Notion API error')) })

      await expect(fetchDailyNotes('daily-db-id', client)).rejects.toThrow(NotionAPIError)
    })
  })

  describe('processDailyNotes', () => {
    it('fetchDailyNotes で取得したノートIDで fetchBlockChildren を呼ぶ', async () => {
      const note = {
        id: 'note-1',
        properties: { 日付: { date: { start: '2026-03-10' } } },
      }
      const mockQuery = jest.fn().mockResolvedValue({ results: [note] })
      const mockList = jest.fn().mockResolvedValue({ results: [] })
      const client = makeNotionClient({ query: mockQuery, listBlockChildren: mockList })

      await processDailyNotes('daily-db-id', client)

      expect(mockList).toHaveBeenCalledWith({ block_id: 'note-1' })
    })

    it('DailyNoteData[] を返す', async () => {
      const note = {
        id: 'note-1',
        properties: { 日付: { date: { start: '2026-03-10' } } },
      }
      const client = makeNotionClient({
        query: jest.fn().mockResolvedValue({ results: [note] }),
        listBlockChildren: jest.fn().mockResolvedValue({ results: [] }),
      })

      const result = await processDailyNotes('daily-db-id', client)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        date: '2026-03-10',
        todayTasks: [],
        nextTasks: [],
        issues: [],
        healthStatus: '',
      })
    })

    it('ノートが0件のとき空配列を返す', async () => {
      const client = makeNotionClient({ query: jest.fn().mockResolvedValue({ results: [] }) })

      const result = await processDailyNotes('daily-db-id', client)

      expect(result).toEqual([])
    })

    it('fetchDailyNotes が失敗したときエラーをthrowする', async () => {
      const client = makeNotionClient({ query: jest.fn().mockRejectedValue(new Error('Notion API error')) })

      await expect(processDailyNotes('daily-db-id', client)).rejects.toThrow(NotionAPIError)
    })
  })

  describe('fetchDoTodayTasksPageId', () => {
    it('Status=DoTodayのフィルタでデータベースをクエリする', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ results: [] })
      const client = makeNotionClient({ query: mockQuery })

      await fetchDoTodayTasksPageId('database-id-123', client)

      expect(mockQuery).toHaveBeenCalledWith({
        data_source_id: 'database-id-123',
        filter: {
          property: 'Status',
          select: { equals: 'DoToday' },
        },
      })
    })

    it('最初のページのIDを返す', async () => {
      const task = {
        id: 'do-today-page-id',
        properties: {
          Name: { title: [{ plain_text: '今日のタスク' }] },
          Status: { select: { name: 'DoToday' } },
          'Date Created': { created_time: '2026-03-15T00:00:00.000Z' },
        },
      }
      const client = makeNotionClient({ query: jest.fn().mockResolvedValue({ results: [task] }) })

      const result = await fetchDoTodayTasksPageId('database-id-123', client)

      expect(result).toBe('do-today-page-id')
    })

    it('DoTodayページが存在しないとき null を返す', async () => {
      const client = makeNotionClient({ query: jest.fn().mockResolvedValue({ results: [] }) })

      const result = await fetchDoTodayTasksPageId('database-id-123', client)

      expect(result).toBeNull()
    })

    it('Notion APIがエラーを返したとき NotionAPIError をthrowする', async () => {
      const client = makeNotionClient({ query: jest.fn().mockRejectedValue(new Error('Notion API error')) })

      await expect(fetchDoTodayTasksPageId('database-id-123', client)).rejects.toThrow(NotionAPIError)
    })
  })

  describe('appendReportToPage', () => {
    const makeClientWithAppend = (appendMock: jest.Mock): NotionClient => ({
      inner: {
        dataSources: { query: jest.fn() },
        blocks: {
          children: {
            list: jest.fn(),
            append: appendMock,
          },
        },
      } as unknown as Client,
    })

    const baseResult: ClaudeAnalysisResult = {
      firstTask: { name: 'タスクA', firstStep: '最初のステップ' },
      todayTasks: [{ name: 'タスクA', deadline: '3/20', reason: '期限が過ぎています' }],
      overdueTasks: [{ name: '期限切れタスク', deadline: '3/10' }],
      healthAdvice: '体調は良好です',
      taskManagementAdvice: 'タスクを整理しましょう',
    }

    it('指定したページIDに blocks.children.append を呼ぶ', async () => {
      const mockAppend = jest.fn().mockResolvedValue({})
      const client = makeClientWithAppend(mockAppend)

      await appendReportToPage('page-id-1', baseResult, client)

      expect(mockAppend).toHaveBeenCalledWith(
        expect.objectContaining({ block_id: 'page-id-1' })
      )
    })

    it('todayTasks が numbered_list_item として書き込まれる', async () => {
      const mockAppend = jest.fn().mockResolvedValue({})
      const client = makeClientWithAppend(mockAppend)
      const result: ClaudeAnalysisResult = {
        ...baseResult,
        todayTasks: [
          { name: 'タスクA', deadline: '3/20', reason: '期限が過ぎています' },
          { name: 'タスクB', reason: '優先度が高い' },
        ],
      }

      await appendReportToPage('page-id-1', result, client)

      const call = mockAppend.mock.calls[0][0] as { children: unknown[] }
      const numberedItems = (call.children as Array<{ type: string }>).filter(
        (b) => b.type === 'numbered_list_item'
      )
      expect(numberedItems).toHaveLength(2)
      expect(numberedItems[0]).toMatchObject({
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [expect.objectContaining({ text: expect.objectContaining({ content: expect.stringContaining('タスクA') }) })],
        },
      })
    })

    it('overdueTasks が bulleted_list_item として書き込まれる', async () => {
      const mockAppend = jest.fn().mockResolvedValue({})
      const client = makeClientWithAppend(mockAppend)
      const result: ClaudeAnalysisResult = {
        ...baseResult,
        overdueTasks: [
          { name: '期限切れタスクX', deadline: '3/10' },
          { name: '期限切れタスクY', deadline: '3/12' },
        ],
      }

      await appendReportToPage('page-id-1', result, client)

      const call = mockAppend.mock.calls[0][0] as { children: unknown[] }
      const bulletedItems = (call.children as Array<{ type: string }>).filter(
        (b) => b.type === 'bulleted_list_item'
      )
      expect(bulletedItems).toHaveLength(2)
      expect(bulletedItems[0]).toMatchObject({
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [expect.objectContaining({ text: expect.objectContaining({ content: expect.stringContaining('期限切れタスクX') }) })],
        },
      })
    })

    it('overdueTasks が空のとき「なし」の paragraph が書き込まれる', async () => {
      const mockAppend = jest.fn().mockResolvedValue({})
      const client = makeClientWithAppend(mockAppend)
      const result: ClaudeAnalysisResult = {
        ...baseResult,
        overdueTasks: [],
      }

      await appendReportToPage('page-id-1', result, client)

      const call = mockAppend.mock.calls[0][0] as { children: unknown[] }
      const paragraphs = (call.children as Array<{ type: string; paragraph?: { rich_text: Array<{ text: { content: string } }> } }>).filter(
        (b) => b.type === 'paragraph'
      )
      const noneparagraph = paragraphs.find(
        (b) => b.paragraph?.rich_text[0]?.text.content === 'なし'
      )
      expect(noneparagraph).toBeDefined()
    })

    it('healthAdvice が paragraph として書き込まれる', async () => {
      const mockAppend = jest.fn().mockResolvedValue({})
      const client = makeClientWithAppend(mockAppend)

      await appendReportToPage('page-id-1', baseResult, client)

      const call = mockAppend.mock.calls[0][0] as { children: unknown[] }
      const paragraphs = (call.children as Array<{ type: string; paragraph?: { rich_text: Array<{ text: { content: string } }> } }>).filter(
        (b) => b.type === 'paragraph'
      )
      const healthParagraph = paragraphs.find(
        (b) => b.paragraph?.rich_text[0]?.text.content === '体調は良好です'
      )
      expect(healthParagraph).toBeDefined()
    })

    it('taskManagementAdvice が paragraph として書き込まれる', async () => {
      const mockAppend = jest.fn().mockResolvedValue({})
      const client = makeClientWithAppend(mockAppend)

      await appendReportToPage('page-id-1', baseResult, client)

      const call = mockAppend.mock.calls[0][0] as { children: unknown[] }
      const paragraphs = (call.children as Array<{ type: string; paragraph?: { rich_text: Array<{ text: { content: string } }> } }>).filter(
        (b) => b.type === 'paragraph'
      )
      const adviceParagraph = paragraphs.find(
        (b) => b.paragraph?.rich_text[0]?.text.content === 'タスクを整理しましょう'
      )
      expect(adviceParagraph).toBeDefined()
    })

    it('Notion APIがエラーを返したとき NotionAPIError をthrowする', async () => {
      const mockAppend = jest.fn().mockRejectedValue(new Error('Notion API error'))
      const client = makeClientWithAppend(mockAppend)

      await expect(appendReportToPage('page-id-1', baseResult, client)).rejects.toThrow(NotionAPIError)
    })
  })
})
