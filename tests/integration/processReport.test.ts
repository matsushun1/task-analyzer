/**
 * 統合テスト: processReport
 *
 * 実際のNotion APIに接続してタスクを取得し、TaskData[] に変換できることを確認する。
 *
 * 必要な環境変数:
 *   - NOTION_TOKEN: Notion Integration Token
 *   - NOTION_TASK_DB_ID: タスクDB（Status="Doing"のタスクが存在すること）
 */
import * as dotenv from 'dotenv'
import { processReport } from '../../src/services/notionService'

dotenv.config()

describe('processReport（統合テスト）', () => {
  const notionToken = process.env['NOTION_TOKEN']
  const taskDatabaseId = process.env['NOTION_TASK_DB_ID']

  if (!notionToken || !taskDatabaseId) {
    it.todo('NOTION_TOKEN と NOTION_TASK_DB_ID を .env に設定してください')
    return
  }

  it('Status=Doingのタスクを取得してTaskData[]に変換できる', async () => {
    const result = await processReport(taskDatabaseId, notionToken)

    expect(result.length).toBeGreaterThan(0)

    for (const taskData of result) {
      expect(typeof taskData.id).toBe('string')
      expect(typeof taskData.name).toBe('string')
      expect(taskData.status).toBe('Doing')
      expect(taskData.createdAt).toBeInstanceOf(Date)
      expect(Array.isArray(taskData.subTasks)).toBe(true)

      for (const subTask of taskData.subTasks) {
        expect(typeof subTask.name).toBe('string')
        expect(Array.isArray(subTask.details)).toBe(true)
        if (subTask.deadline !== undefined) {
          expect(typeof subTask.deadline).toBe('string')
        }
      }
    }
  }, 30000)
})
