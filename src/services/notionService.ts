import { Client } from '@notionhq/client'
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { buildTaskData } from '../models/task.model'
import type { BlockWithChildren } from '../models/types/block.types'
import { isNotionTask, type NotionTask, type TaskData } from '../models/types/task.types'
import { BlockFetchError, NotionAPIError } from '../utils/errors'

export type { BlockWithChildren }

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

export const fetchBlockChildren = async (pageId: string, notionToken: string): Promise<BlockWithChildren[]> => {
  const client = new Client({ auth: notionToken })
  try {
    return await fetchChildrenRecursively(client, pageId)
  } catch (error) {
    throw new BlockFetchError(pageId, error)
  }
}

export const processReport = async (taskDatabaseId: string, notionToken: string): Promise<TaskData[]> => {
  const tasks = await fetchTasks(taskDatabaseId, notionToken)
  return Promise.all(
    tasks.map(async (task) => {
      const blocks = await fetchBlockChildren(task.id, notionToken)
      return buildTaskData(task, blocks)
    })
  )
}
