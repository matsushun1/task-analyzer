import Anthropic from '@anthropic-ai/sdk'
import { isClaudeAnalysisResult, type ClaudeAnalysisResult } from '../models/types/analysis.types'
import type { TaskData } from '../models/types/task.types'
import type { DailyNoteData } from '../models/types/dailyNote.types'
import { ClaudeAPIError } from '../utils/errors'
import { logger } from '../utils/logger'
import type { ClaudeClient } from '../clients/claudeClient'

const SYSTEM_PROMPT = `あなたはWebエンジニアのタスク管理の専門家です。
必ず有効なJSONのみを返してください。説明文やコードブロックは不要です。`

const buildPrompt = (tasks: TaskData[], notes: DailyNoteData[]): string => {
  const today = new Date().toISOString().split('T')[0]

  const taskSection = tasks
    .map((task) => {
      const subTaskLines = task.subTasks
        .map((st) => {
          const deadline = st.deadline ? ` (期限: ${st.deadline})` : ''
          const details = st.details.length > 0 ? `\n      詳細: ${st.details.join(' / ')}` : ''
          return `    - ${st.name}${deadline}${details}`
        })
        .join('\n')
      return `タスク名: ${task.name}
期限: ${task.deadline ?? 'なし'}
サブタスク:
${subTaskLines || '    (なし)'}`
    })
    .join('\n\n')

  const noteSection = notes
    .map(
      (note) => `### ${note.date}
今日行ったこと: ${note.todayTasks.join(', ') || 'なし'}
翌営業日に行うこと: ${note.nextTasks.join(', ') || 'なし'}
課題・懸念事項: ${note.issues.join(', ') || 'なし'}
健康状態: ${note.healthStatus || 'なし'}`
    )
    .join('\n\n')

  return `今日の日付: ${today}

## 進行中のタスク一覧

${taskSection || '(タスクなし)'}

## 直近14日間のデイリーノート

${noteSection || '(ノートなし)'}

---
以下のJSON形式で分析結果を返してください:

{
  "todayTasks": [
    { "name": "タスク名（期限あり）", "deadline": "2/20", "reason": "選定理由" },
    { "name": "タスク名（期限なし）", "reason": "選定理由" }
  ],
  "overdueTasks": [
    { "name": "タスク名", "deadline": "2/15" }
  ],
  "healthAdvice": "体調アドバイス（100-200文字）",
  "taskManagementAdvice": "タスク管理アドバイス（100-200文字）"
}

分析の条件:
- todayTasks: 今日やるべきタスクを優先度順に最大10件。期限が今日（${today}）以前のタスクを最優先。デイリーノートの「翌営業日に行うこと」に記載されているタスクも考慮する。deadlineがない場合はフィールドを省略してください。
- overdueTasks: 期限が今日（${today}）より前のタスクをすべて列挙する。
- healthAdvice: 直近14日間の健康状態の傾向を分析し、改善提案を100-200文字で記述。
- taskManagementAdvice: 工数や課題・懸念事項を踏まえたタスク管理の助言を100-200文字で記述。`
}

export const analyzeTasksAndNotes = async (
  tasks: TaskData[],
  notes: DailyNoteData[],
  client: ClaudeClient
): Promise<ClaudeAnalysisResult> => {
  logger.info('Calling Claude API for task analysis')

  let response: Anthropic.Message
  try {
    response = await client.inner.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt(tasks, notes) }],
    })
  } catch (error) {
    throw new ClaudeAPIError('Failed to call Claude API', error)
  }

  if (response.content.length === 0) {
    throw new ClaudeAPIError('Empty response from Claude API')
  }

  const firstContent = response.content[0]
  if (firstContent.type !== 'text') {
    throw new ClaudeAPIError('Unexpected response format from Claude API')
  }

  // コードブロック（```json ... ```）が付いている場合に中身だけ取り出す
  const jsonText = firstContent.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch (error) {
    throw new ClaudeAPIError('Failed to parse Claude API response as JSON', error)
  }

  if (!isClaudeAnalysisResult(parsed)) {
    throw new ClaudeAPIError('Claude API response does not match expected schema')
  }

  logger.info('Claude API analysis completed')

  return parsed
}
