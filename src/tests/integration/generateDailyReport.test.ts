/**
 * 統合テスト: generateDailyReportUseCase
 *
 * 実際の Notion API と Claude API に接続し、タスク・デイリーノートの取得から
 * Claude による分析までのパイプライン全体を検証する。
 *
 * 必要な環境変数:
 *   - NOTION_TOKEN: Notion Integration Token
 *   - NOTION_TASK_DB_ID: タスクDB（Status="Doing"のタスクが存在すること）
 *   - NOTION_DAILY_NOTE_DB_ID: デイリーノートDBのID
 *   - ANTHROPIC_API_KEY: Claude API キー
 */
import * as dotenv from 'dotenv'
import { generateDailyReportUseCase } from '../../usecases/generateDailyReportUseCase'

dotenv.config()

describe('generateDailyReportUseCase（統合テスト）', () => {
  const notionToken = process.env['NOTION_TOKEN']
  const taskDatabaseId = process.env['NOTION_TASK_DB_ID']
  const dailyNoteDatabaseId = process.env['NOTION_DAILY_NOTE_DB_ID']
  const anthropicApiKey = process.env['ANTHROPIC_API_KEY']

  if (!notionToken || !taskDatabaseId || !dailyNoteDatabaseId || !anthropicApiKey) {
    it.todo(
      'NOTION_TOKEN / NOTION_TASK_DB_ID / NOTION_DAILY_NOTE_DB_ID / ANTHROPIC_API_KEY を .env に設定してください'
    )
    return
  }

  it('Notionからデータを取得してClaudeが分析結果を返す', async () => {
    const result = await generateDailyReportUseCase()

    console.log('=== Claude 分析結果 ===')
    console.log(JSON.stringify(result, null, 2))

    // todayTasks
    expect(Array.isArray(result.todayTasks)).toBe(true)
    for (const task of result.todayTasks) {
      expect(typeof task.name).toBe('string')
      expect(task.name.length).toBeGreaterThan(0)
      expect(typeof task.reason).toBe('string')
      expect(task.reason.length).toBeGreaterThan(0)
      if (task.deadline !== undefined) {
        expect(typeof task.deadline).toBe('string')
      }
    }
    expect(result.todayTasks.length).toBeLessThanOrEqual(10)

    // overdueTasks
    expect(Array.isArray(result.overdueTasks)).toBe(true)
    for (const task of result.overdueTasks) {
      expect(typeof task.name).toBe('string')
      expect(task.name.length).toBeGreaterThan(0)
      expect(typeof task.deadline).toBe('string')
      expect(task.deadline.length).toBeGreaterThan(0)
    }

    // healthAdvice
    expect(typeof result.healthAdvice).toBe('string')
    expect(result.healthAdvice.length).toBeGreaterThan(0)

    // taskManagementAdvice
    expect(typeof result.taskManagementAdvice).toBe('string')
    expect(result.taskManagementAdvice.length).toBeGreaterThan(0)
  }, 60000)
})
