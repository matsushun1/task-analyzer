// Notion APIから返ってくる形式
export interface NotionTask {
  id: string
  properties: {
    Name: {
      title: Array<{ plain_text: string }>
    }
    Status: {
      select: { name: string } | null
    }
    'Date Created': {
      created_time: string
    }
  }
}

export const isNotionTask = (item: unknown): item is NotionTask => {
  if (typeof item !== 'object' || item === null) return false

  const { id, properties } = item as Record<string, unknown>
  if (typeof id !== 'string') return false
  if (typeof properties !== 'object' || properties === null) return false

  const props = properties as Record<string, unknown>

  const name = props['Name']
  if (typeof name !== 'object' || name === null) return false
  if (!Array.isArray((name as Record<string, unknown>)['title'])) return false

  const status = props['Status']
  if (typeof status !== 'object' || status === null) return false

  const dateCreated = props['Date Created']
  if (typeof dateCreated !== 'object' || dateCreated === null) return false
  if (typeof (dateCreated as Record<string, unknown>)['created_time'] !== 'string') return false

  return true
}

// サブタスク（to_doブロック配下）の内部形式
export interface SubTaskData {
  name: string
  deadline?: string
  details: string[]
}

// アプリケーション内部で使う形式
export interface TaskData {
  id: string
  name: string
  status: string
  createdAt: Date
  deadline?: string
  subTasks: SubTaskData[]
}
