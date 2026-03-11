// Notion APIから返ってくる形式
export interface NotionDailyNote {
  id: string
  properties: {
    日付: {
      date: { start: string } | null
    }
  }
}

export const isNotionDailyNote = (item: unknown): item is NotionDailyNote => {
  if (typeof item !== 'object' || item === null) return false

  const { id, properties } = item as Record<string, unknown>
  if (typeof id !== 'string') return false
  if (typeof properties !== 'object' || properties === null) return false

  const props = properties as Record<string, unknown>

  const dateField = props['日付']
  if (typeof dateField !== 'object' || dateField === null) return false

  const date = (dateField as Record<string, unknown>)['date']
  // date は { start: string } または null
  if (date !== null) {
    if (typeof date !== 'object') return false
    if (typeof (date as Record<string, unknown>)['start'] !== 'string') return false
  }

  return true
}

// アプリケーション内部で使う形式
export interface DailyNoteData {
  date: string // YYYY-MM-DD
  todayTasks: string[]
  nextTasks: string[]
  issues: string[]
  healthStatus: string
}
