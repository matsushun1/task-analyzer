import { Client } from '@notionhq/client'
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { fetchTasks, fetchBlockChildren, processReport, type BlockWithChildren } from '../../../src/services/notionService'
import { NotionAPIError, BlockFetchError } from '../../../src/utils/errors'

jest.mock('@notionhq/client')

const MockedClient = Client as jest.MockedClass<typeof Client>

describe('notionService', () => {
  let mockQuery: jest.Mock
  let mockListBlockChildren: jest.Mock

  beforeEach(() => {
    mockQuery = jest.fn()
    mockListBlockChildren = jest.fn()

    MockedClient.mockImplementation(
      () =>
        ({
          dataSources: { query: mockQuery },
          blocks: { children: { list: mockListBlockChildren } },
        }) as unknown as Client
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchTasks', () => {
    it('Status=Doingのフィルタでデータベースをクエリする', async () => {
      mockQuery.mockResolvedValue({ results: [] })

      await fetchTasks('database-id-123', 'notion-token')

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
      mockQuery.mockResolvedValue({ results: [notionTask] })

      const result = await fetchTasks('database-id-123', 'notion-token')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(notionTask)
    })

    it('タスクが0件のときは空配列を返す', async () => {
      mockQuery.mockResolvedValue({ results: [] })

      const result = await fetchTasks('database-id-123', 'notion-token')

      expect(result).toEqual([])
    })

    it('Notion APIがエラーを返したとき NotionAPIError をthrowする', async () => {
      mockQuery.mockRejectedValue(new Error('Notion API error'))

      await expect(fetchTasks('database-id-123', 'notion-token')).rejects.toThrow(NotionAPIError)
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
      mockListBlockChildren.mockResolvedValue({ results: [paragraphBlock] })

      const result = await fetchBlockChildren('page-id-1', 'notion-token')

      expect(mockListBlockChildren).toHaveBeenCalledWith({ block_id: 'page-id-1' })
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject(paragraphBlock)
    })

    it('has_children: true のブロックの子ブロックを再帰的に取得する', async () => {
      const childBlock = { id: 'child-1', type: 'bulleted_list_item', has_children: false }
      const parentBlock = { id: 'parent-1', type: 'to_do', has_children: true }

      mockListBlockChildren
        .mockResolvedValueOnce({ results: [parentBlock] })
        .mockResolvedValueOnce({ results: [childBlock] })

      const result = await fetchBlockChildren('page-id-1', 'notion-token')

      expect(mockListBlockChildren).toHaveBeenCalledTimes(2)
      expect(mockListBlockChildren).toHaveBeenNthCalledWith(2, { block_id: 'parent-1' })
      expect(result[0]).toMatchObject({ ...parentBlock, children: [expect.objectContaining(childBlock)] })
    })

    it('has_children: false のブロックは子を取得しない', async () => {
      const leafBlock = { id: 'leaf-1', type: 'paragraph', has_children: false }
      mockListBlockChildren.mockResolvedValue({ results: [leafBlock] })

      await fetchBlockChildren('page-id-1', 'notion-token')

      expect(mockListBlockChildren).toHaveBeenCalledTimes(1)
    })

    it('深さ2以上の入れ子を再帰的に取得する', async () => {
      const grandChildBlock = { id: 'grand-child-1', type: 'bulleted_list_item', has_children: false }
      const childBlock = { id: 'child-1', type: 'toggle', has_children: true }
      const parentBlock = { id: 'parent-1', type: 'to_do', has_children: true }

      mockListBlockChildren
        .mockResolvedValueOnce({ results: [parentBlock] })
        .mockResolvedValueOnce({ results: [childBlock] })
        .mockResolvedValueOnce({ results: [grandChildBlock] })

      const result = await fetchBlockChildren('page-id-1', 'notion-token')

      expect(mockListBlockChildren).toHaveBeenCalledTimes(3)
      const child = result[0].children[0]
      expect(child).toMatchObject({ ...childBlock, children: [expect.objectContaining(grandChildBlock)] })
    })

    it('除外ブロックの子は取得しない', async () => {
      const codeBlock = { id: 'code-1', type: 'code', has_children: true }
      mockListBlockChildren.mockResolvedValue({ results: [codeBlock] })

      const result = await fetchBlockChildren('page-id-1', 'notion-token')

      expect(mockListBlockChildren).toHaveBeenCalledTimes(1)
      expect(result).toHaveLength(0)
    })

    it('typeがcodeのブロックを除外する', async () => {
      const codeBlock = { id: 'block-code', type: 'code' }
      const paragraphBlock = { id: 'block-para', type: 'paragraph' }
      mockListBlockChildren.mockResolvedValue({ results: [codeBlock, paragraphBlock] })

      const result = await fetchBlockChildren('page-id-1', 'notion-token')

      expect(result).toHaveLength(1)
      expect((result[0] as BlockObjectResponse).type).toBe('paragraph')
    })

    it('typeがimageのブロックを除外する', async () => {
      const imageBlock = { id: 'block-image', type: 'image' }
      const paragraphBlock = { id: 'block-para', type: 'paragraph' }
      mockListBlockChildren.mockResolvedValue({ results: [imageBlock, paragraphBlock] })

      const result = await fetchBlockChildren('page-id-1', 'notion-token')

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
      mockListBlockChildren.mockResolvedValue({ results: blocks })

      const result = await fetchBlockChildren('page-id-1', 'notion-token')

      expect(result).toHaveLength(2)
      expect(result.map((b) => (b as BlockObjectResponse).type)).toEqual([
        'to_do',
        'bulleted_list_item',
      ])
    })

    it('ブロックが0件のときは空配列を返す', async () => {
      mockListBlockChildren.mockResolvedValue({ results: [] })

      const result = await fetchBlockChildren('page-id-1', 'notion-token')

      expect(result).toEqual([])
    })

    it('Notion APIがエラーを返したとき BlockFetchError をthrowする', async () => {
      mockListBlockChildren.mockRejectedValue(new Error('Notion API error'))

      await expect(fetchBlockChildren('page-id-1', 'notion-token')).rejects.toThrow(BlockFetchError)
    })
  })

  describe('processReport', () => {
    it('fetchTasksをtaskDatabaseIdとnotionTokenで呼ぶ', async () => {
      mockQuery.mockResolvedValue({ results: [] })

      await processReport('task-db-id', 'notion-token')

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
      mockQuery.mockResolvedValue({ results: tasks })
      mockListBlockChildren.mockResolvedValue({ results: [] })

      await processReport('task-db-id', 'notion-token')

      expect(mockListBlockChildren).toHaveBeenCalledWith({ block_id: 'task-1' })
      expect(mockListBlockChildren).toHaveBeenCalledWith({ block_id: 'task-2' })
    })

    it('fetchTasksが失敗したときエラーをthrowする', async () => {
      mockQuery.mockRejectedValue(new Error('Notion API error'))

      await expect(processReport('task-db-id', 'notion-token')).rejects.toThrow(NotionAPIError)
    })
  })
})
