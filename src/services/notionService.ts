import type { Client } from '@notionhq/client'
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { buildDailyNoteData } from '../models/dailyNote.model'
import { buildTaskData } from '../models/task.model'
import type { BlockWithChildren } from '../models/types/block.types'
import { isNotionDailyNote, type DailyNoteData, type NotionDailyNote } from '../models/types/dailyNote.types'
import { isNotionTask, type NotionTask, type TaskData } from '../models/types/task.types'
import type { TodayTask } from '../models/types/analysis.types'
import { BlockFetchError, NotionAPIError } from '../utils/errors'
import type { NotionClient } from '../clients/notionClient'

export type { BlockWithChildren }

const EXCLUDED_BLOCK_TYPES = new Set(['code', 'image', 'video', 'file', 'audio'])

const isBlockObjectResponse = (block: unknown): block is BlockObjectResponse =>
  typeof block === 'object' && block !== null && 'type' in block


export const fetchTasks = async (databaseId: string, client: NotionClient): Promise<NotionTask[]> => {
  try {
    const response = await client.inner.dataSources.query({
      data_source_id: databaseId,
      filter: {
        property: 'Status',
        select: { equals: 'Doing' },
      },
    })
    return (response.results as unknown[]).filter(isNotionTask)
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
    const response = await client.inner.dataSources.query({
      data_source_id: databaseId,
      filter: { property: '日付', date: { on_or_after: dateString } },
    })
    return (response.results as unknown[]).filter(isNotionDailyNote)
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
    const response = await client.inner.dataSources.query({
      data_source_id: databaseId,
      filter: {
        property: 'Status',
        select: { equals: 'DoToday' },
      },
    })
    const tasks = (response.results as unknown[]).filter(isNotionTask)
    return tasks.length > 0 ? tasks[0].id : null
  } catch (error) {
    throw new NotionAPIError('Failed to fetch DoToday tasks', error)
  }
}

export const appendTodayTasksToPage = async (
  pageId: string,
  todayTasks: TodayTask[],
  client: NotionClient
): Promise<void> => {
  if (todayTasks.length === 0) return

  const children = todayTasks.map((task) => {
    const content = task.deadline ? `${task.name} (期限: ${task.deadline})` : task.name
    return {
      type: 'numbered_list_item' as const,
      numbered_list_item: {
        rich_text: [{ type: 'text' as const, text: { content } }],
      },
    }
  })

  try {
    await (client.inner.blocks.children as { append: (args: unknown) => Promise<unknown> }).append({
      block_id: pageId,
      children,
    })
  } catch (error) {
    throw new NotionAPIError('Failed to append today tasks to page', error)
  }
}
