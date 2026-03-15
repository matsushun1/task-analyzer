import Anthropic from '@anthropic-ai/sdk'
import { isClaudeAnalysisResult, type ClaudeAnalysisResult } from '../models/types/analysis.types'
import type { TaskData } from '../models/types/task.types'
import type { DailyNoteData } from '../models/types/dailyNote.types'
import { ClaudeAPIError } from '../utils/errors'
import { logger } from '../utils/logger'
import type { ClaudeClient } from '../clients/claudeClient'

const SYSTEM_PROMPT = `あなたはADHDを持つWebエンジニアの認知特性を熟知したタスク管理コーチです。
ユーザーは優先順位付け・時間感覚・先延ばしに困難を抱えることがある一方、適切なサポートがあれば高いパフォーマンスを発揮できます。
以下の原則でフィードバックを生成してください:
- 「今日まず1つだけ」を最重要事項として明確に提示する
- 残り日数は「残り2日」「昨日が期限」のように具体的な数値で示す
- 期限切れタスクは責めずに「次にどう動くか」の行動に焦点を当てる
- タスクの「最初の一手」を物理的な行動レベルで具体化する（例: 「PRのURLをSlackに貼る」「ファイルを開いてコメントを確認する」）
- 1日の情報量を絞り、シンプルに保つ
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
  "firstTask": {
    "name": "今日最初に着手するタスク名",
    "firstStep": "最初にやる具体的な一手（15文字以内）"
  },
  "todayTasks": [
    { "name": "タスク名（期限あり）", "deadline": "2/20", "reason": "期限まで残り2日。今日着手しないと間に合わない" },
    { "name": "タスク名（期限なし）", "reason": "選定理由" }
  ],
  "overdueTasks": [
    { "name": "タスク名", "deadline": "2/15" }
  ],
  "healthAdvice": "体調アドバイス（100-200文字）",
  "taskManagementAdvice": "具体的な次の一手を含むアドバイス（100-200文字）"
}

分析の条件:
- firstTask: todayTasksの中から「今日まず最初にやること」を1件だけ選ぶ。firstStepはその作業の最初の物理的な行動を15文字以内で具体的に記述する（例: 「PRのURLをSlackに貼る」「ファイルを開く」）。
- todayTasks: 今日やるべきタスクを優先度順に最大5件。期限が今日（${today}）以前のタスクを最優先。デイリーノートの「翌営業日に行うこと」に記載されているタスクも考慮する。reasonには「なぜ今日やる必要があるか」を残り日数の数値を使って具体的に書く。deadlineがない場合はフィールドを省略してください。
- overdueTasks: 期限が今日（${today}）より前のタスクをすべて列挙する。
- healthAdvice: 直近14日間の健康状態の傾向を分析する。体調が悪い日が多い場合は具体的な対処法（例: 「今日は集中ブロックを1回だけにする」）を100-200文字で記述。
- taskManagementAdvice: 抽象的な助言ではなく、明日から実行できる具体的な「次の一手」を1つ含めて100-200文字で記述（例: 「まず○○のタスクの見積もりを15分で見直す」）。`
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
