import { Client } from '@notionhq/client'
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { isNotionTask, type NotionTask } from '../models/types/task.types'
import { BlockFetchError, NotionAPIError } from '../utils/errors'

const EXCLUDED_BLOCK_TYPES = new Set(['code', 'image', 'video', 'file', 'audio'])

const isBlockObjectResponse = (block: unknown): block is BlockObjectResponse =>
  typeof block === 'object' && block !== null && 'type' in block

export const fetchTasks = async (databaseId: string, notionToken: string): Promise<NotionTask[]> => {
  const client = new Client({ auth: notionToken })
  try {
    const response = await client.dataSources.query({
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

export const fetchBlockChildren = async (
  pageId: string,
  notionToken: string
): Promise<BlockObjectResponse[]> => {
  const client = new Client({ auth: notionToken })
  try {
    const response = await client.blocks.children.list({ block_id: pageId })
    return response.results
      .filter(isBlockObjectResponse)
      .filter((block) => !EXCLUDED_BLOCK_TYPES.has(block.type))
  } catch (error) {
    throw new BlockFetchError(pageId, error)
  }
}

export const processReport = async (taskDatabaseId: string, notionToken: string): Promise<void> => {
  const tasks = await fetchTasks(taskDatabaseId, notionToken)
  await Promise.all(tasks.map((task) => fetchBlockChildren(task.id, notionToken)))
}
