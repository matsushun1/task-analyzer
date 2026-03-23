import type { Client } from '@notionhq/client'
import type { AppendBlockChildrenParameters, BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { buildDailyNoteData } from '../models/dailyNote.model'
import { buildTaskData } from '../models/task.model'
import type { BlockWithChildren } from '../models/types/block.types'
import { isNotionDailyNote, type DailyNoteData, type NotionDailyNote } from '../models/types/dailyNote.types'
import { isNotionTask, type NotionTask, type TaskData } from '../models/types/task.types'
import type { ClaudeAnalysisResult } from '../models/types/analysis.types'
import { BlockFetchError, NotionAPIError } from '../utils/errors'
import type { NotionClient } from '../clients/notionClient'

export type { BlockWithChildren }

const EXCLUDED_BLOCK_TYPES = new Set(['code', 'image', 'video', 'file', 'audio'])

const isBlockObjectResponse = (block: unknown): block is BlockObjectResponse =>
  typeof block === 'object' && block !== null && 'type' in block


const queryDatabase = async (
  databaseId: string,
  token: string,
  filter: Record<string, unknown>
): Promise<unknown[]> => {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({ filter }),
  })
  if (!response.ok) {
    throw new Error(`Notion API error: ${response.status} ${await response.text()}`)
  }
  const data = (await response.json()) as { results: unknown[] }
  return data.results
}

export const fetchTasks = async (databaseId: string, client: NotionClient): Promise<NotionTask[]> => {
  try {
    const results = await queryDatabase(databaseId, client.token, {
      property: 'Status',
      select: { equals: 'Doing' },
    })
    return results.filter(isNotionTask)
  } catch (error) {
    throw new NotionAPIError('Failed to fetch tasks', error)
  }
}

const fetchChildrenRecursively = async (client: Client, blockId: string): Promise<BlockWithChildren[]> => {
  const response = await client.blocks.children.list({ block_id: blockId })
  const blocks = response.results.filter(isBlockObjectResponse).filter((block) => !EXCLUDED_BLOCK_TYPES.has(block.type))

  return Promise.all(
    blocks.map(async (block) => {
      const children = block.has_children ? await fetchChildrenRecursively(client, block.id) : []
      return { ...block, children }
    })
  )
}

export const fetchBlockChildren = async (pageId: string, client: NotionClient): Promise<BlockWithChildren[]> => {
  try {
    return await fetchChildrenRecursively(client.inner, pageId)
  } catch (error) {
    throw new BlockFetchError(pageId, error)
  }
}

export const processReport = async (taskDatabaseId: string, client: NotionClient): Promise<TaskData[]> => {
  const tasks = await fetchTasks(taskDatabaseId, client)
  return Promise.all(
    tasks.map(async (task) => {
      const blocks = await fetchBlockChildren(task.id, client)
      return buildTaskData(task, blocks)
    })
  )
}

export const fetchDailyNotes = async (databaseId: string, client: NotionClient): Promise<NotionDailyNote[]> => {
  // UTC基準で14日前の日付を算出する（Cloud Run はUTCで動作するため問題なし）
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
  const dateString = fourteenDaysAgo.toISOString().split('T')[0]

  try {
    const results = await queryDatabase(databaseId, client.token, {
      property: '日付',
      date: { on_or_after: dateString },
    })
    return results.filter(isNotionDailyNote)
  } catch (error) {
    throw new NotionAPIError('Failed to fetch daily notes', error)
  }
}

export const processDailyNotes = async (databaseId: string, client: NotionClient): Promise<DailyNoteData[]> => {
  const notes = await fetchDailyNotes(databaseId, client)
  return Promise.all(
    notes.map(async (note) => {
      const blocks = await fetchBlockChildren(note.id, client)
      return buildDailyNoteData(note, blocks)
    })
  )
}

export const fetchDoTodayTasksPageId = async (databaseId: string, client: NotionClient): Promise<string | null> => {
  try {
    const results = await queryDatabase(databaseId, client.token, {
      property: 'Status',
      select: { equals: 'DoToday' },
    })
    const tasks = results.filter(isNotionTask)
    return tasks.length > 0 ? tasks[0].id : null
  } catch (error) {
    throw new NotionAPIError('Failed to fetch DoToday tasks', error)
  }
}

export const appendReportToPage = async (
  pageId: string,
  result: ClaudeAnalysisResult,
  client: NotionClient
): Promise<void> => {
  const richText = (content: string): AppendBlockChildrenParameters['children'][number] & {
    type: 'paragraph'
  } => ({
    type: 'paragraph' as const,
    paragraph: { rich_text: [{ type: 'text' as const, text: { content } }] },
  })

  const heading = (content: string): AppendBlockChildrenParameters['children'][number] => ({
    type: 'heading_2' as const,
    heading_2: { rich_text: [{ type: 'text' as const, text: { content } }] },
  })

  const divider = (): AppendBlockChildrenParameters['children'][number] => ({
    type: 'divider' as const,
    divider: {},
  })

  const todayTaskBlocks: AppendBlockChildrenParameters['children'] = result.todayTasks.map((task) => {
    const content = task.deadline ? `${task.name} (期限: ${task.deadline})` : task.name
    return {
      type: 'numbered_list_item' as const,
      numbered_list_item: {
        rich_text: [{ type: 'text' as const, text: { content } }],
        children: [
          {
            type: 'bulleted_list_item' as const,
            bulleted_list_item: {
              rich_text: [{ type: 'text' as const, text: { content: task.reason } }],
            },
          },
        ],
      },
    }
  })

  const overdueTaskBlocks: AppendBlockChildrenParameters['children'] = result.overdueTasks.map((task) => ({
    type: 'bulleted_list_item' as const,
    bulleted_list_item: {
      rich_text: [{ type: 'text' as const, text: { content: `${task.name} - 期限: ${task.deadline}` } }],
    },
  }))

  const children: AppendBlockChildrenParameters['children'] = [
    divider(),
    heading('🎯 今日やるべきタスク'),
    ...todayTaskBlocks,
    divider(),
    heading('⚠️ 期限切れタスク'),
    ...(result.overdueTasks.length > 0 ? overdueTaskBlocks : [richText('なし')]),
    divider(),
    heading('💪 体調アドバイス'),
    richText(result.healthAdvice),
    divider(),
    heading('📝 タスク管理アドバイス'),
    richText(result.taskManagementAdvice),
  ]

  try {
    await client.inner.blocks.children.append({ block_id: pageId, children })
  } catch (error) {
    throw new NotionAPIError('Failed to append report to page', error)
  }
}
