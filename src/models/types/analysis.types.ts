export interface TodayTask {
  name: string
  deadline?: string
  reason: string
}

export interface OverdueTask {
  name: string
  deadline: string
}

export interface ClaudeAnalysisResult {
  todayTasks: TodayTask[]
  overdueTasks: OverdueTask[]
  healthAdvice: string
  taskManagementAdvice: string
}

const isTodayTask = (item: unknown): item is TodayTask => {
  if (typeof item !== 'object' || item === null) return false
  const obj = item as Record<string, unknown>
  if (typeof obj['name'] !== 'string') return false
  if (typeof obj['reason'] !== 'string') return false
  if ('deadline' in obj && obj['deadline'] !== undefined && typeof obj['deadline'] !== 'string') return false
  return true
}

const isOverdueTask = (item: unknown): item is OverdueTask => {
  if (typeof item !== 'object' || item === null) return false
  const obj = item as Record<string, unknown>
  if (typeof obj['name'] !== 'string') return false
  if (typeof obj['deadline'] !== 'string') return false
  return true
}

export const isClaudeAnalysisResult = (value: unknown): value is ClaudeAnalysisResult => {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>

  if (!Array.isArray(obj['todayTasks'])) return false
  if (!obj['todayTasks'].every(isTodayTask)) return false

  if (!Array.isArray(obj['overdueTasks'])) return false
  if (!obj['overdueTasks'].every(isOverdueTask)) return false

  if (typeof obj['healthAdvice'] !== 'string') return false
  if (typeof obj['taskManagementAdvice'] !== 'string') return false

  return true
}
