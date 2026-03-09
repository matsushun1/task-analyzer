import type {
  BulletedListItemBlockObjectResponse,
  ToDoBlockObjectResponse,
  ToggleBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints'
import type { BlockWithChildren } from './types/block.types'
import type { NotionTask, SubTaskData, TaskData } from './types/task.types'

const DEADLINE_PATTERN = /^期限：(.+)$/

type TextBlock = (ToDoBlockObjectResponse | BulletedListItemBlockObjectResponse) & {
  children: BlockWithChildren[]
}

type TodoBlock = ToDoBlockObjectResponse & { children: BlockWithChildren[] }

type ToggleBlock = ToggleBlockObjectResponse & { children: BlockWithChildren[] }

const isTextBlock = (block: BlockWithChildren): block is TextBlock =>
  block.type === 'to_do' || block.type === 'bulleted_list_item'

const isTodoBlock = (block: BlockWithChildren): block is TodoBlock => block.type === 'to_do'

const isToggleBlock = (block: BlockWithChildren): block is ToggleBlock => block.type === 'toggle'

const extractText = (block: TextBlock): string =>
  block.type === 'to_do'
    ? block.to_do.rich_text.map((t) => t.plain_text).join('')
    : block.bulleted_list_item.rich_text.map((t) => t.plain_text).join('')

const buildSubTaskData = (block: ToDoBlockObjectResponse & { children: BlockWithChildren[] }): SubTaskData => {
  let deadline: string | undefined
  const details: string[] = []

  for (const child of block.children) {
    if (isToggleBlock(child)) {
      // toggle ブロック自身はラベル（「詳細」等）なので内容は無視し、
      // その子ブロックのみを details として収集する
      for (const grandChild of child.children) {
        if (!isTextBlock(grandChild)) continue
        if (grandChild.type === 'to_do' && grandChild.to_do.checked) continue
        details.push(extractText(grandChild))
      }
    } else if (isTextBlock(child)) {
      const text = extractText(child)
      const match = DEADLINE_PATTERN.exec(text)
      if (match) {
        deadline = match[1]
      } else {
        details.push(text)
      }
    }
  }

  return {
    name: block.to_do.rich_text.map((t) => t.plain_text).join(''),
    deadline,
    details,
  }
}

export const buildTaskData = (task: NotionTask, blocks: BlockWithChildren[]): TaskData => {
  const subTasks: SubTaskData[] = []

  for (const block of blocks) {
    if (!isTodoBlock(block)) continue
    if (block.to_do.checked) continue
    subTasks.push(buildSubTaskData(block))
  }

  return {
    id: task.id,
    name: task.properties.Name.title.map((t) => t.plain_text).join(''),
    status: task.properties.Status.select?.name ?? '',
    createdAt: new Date(task.properties['Date Created'].created_time),
    subTasks,
  }
}
