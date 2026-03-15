/**
 * E2Eテスト: タスク取得 → Claude分析 → Notionレポート書き込みまで
 *
 * 実際の Notion API と Claude API に接続し、UseCase 全体を通して
 * Notion の DoToday ページへの書き込みまで検証する。
 *
 * 必要な環境変数:
 *   - NOTION_TOKEN: Notion Integration Token
 *   - NOTION_TASK_DB_ID: タスクDB（Status="Doing" と Status="DoToday" のタスクが存在すること）
 *   - NOTION_DAILY_NOTE_DB_ID: デイリーノートDBのID
 *   - ANTHROPIC_API_KEY: Claude API キー
 */
import * as dotenv from 'dotenv'
import { generateDailyReportUseCase } from '../../usecases/generateDailyReportUseCase'
import { fetchDoTodayTasksPageId, fetchBlockChildren } from '../../services/notionService'
import { NotionClient } from '../../clients/notionClient'
import { getEnvironment } from '../../config/environment'

dotenv.config()

describe('E2Eテスト: タスク取得 → Claude分析 → Notionレポート書き込み', () => {
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

  // テスト中に追加したブロックIDを記録してクリーンアップに使う
  const appendedBlockIds: string[] = []

  afterAll(async () => {
    if (appendedBlockIds.length === 0) return

    const env = getEnvironment()
    const notionClient = new NotionClient(env.notionToken)

    await Promise.all(
      appendedBlockIds.map((blockId) =>
        notionClient.inner.blocks.delete({ block_id: blockId }).catch((err: unknown) => {
          console.warn(`ブロック削除失敗 (id: ${blockId}):`, err)
        })
      )
    )
  }, 30000)

  it('UseCase全体を実行してDoTodayページにタスクが書き込まれること', async () => {
    const env = getEnvironment()
    const notionClient = new NotionClient(env.notionToken)

    // DoTodayページが存在するか事前確認
    const doTodayPageId = await fetchDoTodayTasksPageId(env.notionTaskDatabaseId, notionClient)
    if (doTodayPageId === null) {
      console.warn('DoToday ステータスのタスクが存在しないため、Notion書き込みの検証をスキップします')
      const result = await generateDailyReportUseCase()
      expect(result.todayTasks).toBeDefined()
      return
    }

    // テスト実行前のブロック数を記録
    const blocksBefore = await fetchBlockChildren(doTodayPageId, notionClient)
    const countBefore = blocksBefore.length

    // UseCase 実行（タスク取得 → Claude分析 → Notion書き込み）
    const result = await generateDailyReportUseCase()

    console.log('=== E2E: Claude分析結果 ===')
    console.log(JSON.stringify(result, null, 2))

    // --- 分析結果のアサーション ---
    expect(typeof result.firstTask.name).toBe('string')
    expect(result.firstTask.name.length).toBeGreaterThan(0)
    expect(typeof result.firstTask.firstStep).toBe('string')
    expect(result.firstTask.firstStep.length).toBeGreaterThan(0)

    expect(Array.isArray(result.todayTasks)).toBe(true)
    expect(result.todayTasks.length).toBeGreaterThan(0)
    expect(result.todayTasks.length).toBeLessThanOrEqual(10)

    for (const task of result.todayTasks) {
      expect(typeof task.name).toBe('string')
      expect(task.name.length).toBeGreaterThan(0)
      expect(typeof task.reason).toBe('string')
      if (task.deadline !== undefined) {
        expect(typeof task.deadline).toBe('string')
      }
    }

    expect(Array.isArray(result.overdueTasks)).toBe(true)
    expect(typeof result.healthAdvice).toBe('string')
    expect(result.healthAdvice.length).toBeGreaterThan(0)
    expect(typeof result.taskManagementAdvice).toBe('string')
    expect(result.taskManagementAdvice.length).toBeGreaterThan(0)

    // --- Notion書き込みのアサーション ---
    const blocksAfter = await fetchBlockChildren(doTodayPageId, notionClient)
    const countAfter = blocksAfter.length

    // 追加されるトップレベルブロック数:
    //   divider + heading(今日やるべきタスク) + todayTasks.length
    //   divider + heading(期限切れタスク) + max(overdueTasks.length, 1)
    //   divider + heading(体調アドバイス) + paragraph
    //   divider + heading(タスク管理アドバイス) + paragraph
    // = 4 dividers + 4 headings + todayTasks.length + max(overdueTasks.length, 1) + 2 paragraphs
    const overdueCount = result.overdueTasks.length > 0 ? result.overdueTasks.length : 1
    const expectedBlockCount = 4 + 4 + result.todayTasks.length + overdueCount + 2
    expect(countAfter).toBe(countBefore + expectedBlockCount)

    const addedBlocks = blocksAfter.slice(countBefore)

    // afterAll でのクリーンアップ用にトップレベルブロックのIDを記録
    for (const block of addedBlocks) {
      appendedBlockIds.push(block.id)
    }

    // ブロック順序の確認: divider → heading → todayTasks(numbered_list_item)
    expect(addedBlocks[0].type).toBe('divider')
    expect(addedBlocks[1].type).toBe('heading_2')

    // todayTasks が numbered_list_item として書き込まれていること
    for (let i = 0; i < result.todayTasks.length; i++) {
      const task = result.todayTasks[i]
      const block = addedBlocks[2 + i]

      expect(block.type).toBe('numbered_list_item')

      const numberedBlock = block as typeof block & {
        numbered_list_item: { rich_text: Array<{ plain_text: string }> }
      }
      const plainText = numberedBlock.numbered_list_item.rich_text
        .map((rt) => rt.plain_text)
        .join('')
      const expectedText = task.deadline ? `${task.name} (期限: ${task.deadline})` : task.name
      expect(plainText).toBe(expectedText)

      // 子ブロック（reason）が bulleted_list_item として存在すること
      expect(block.children.length).toBe(1)
      const reasonBlock = block.children[0] as typeof block & {
        bulleted_list_item: { rich_text: Array<{ plain_text: string }> }
      }
      expect(reasonBlock.type).toBe('bulleted_list_item')
      const reasonText = reasonBlock.bulleted_list_item.rich_text
        .map((rt) => rt.plain_text)
        .join('')
      expect(reasonText).toBe(task.reason)
    }

    // 期限切れタスクセクションの確認
    const afterTodayOffset = 2 + result.todayTasks.length
    expect(addedBlocks[afterTodayOffset].type).toBe('divider')
    expect(addedBlocks[afterTodayOffset + 1].type).toBe('heading_2')

    // 体調アドバイスと管理アドバイスの paragraph が存在すること
    const afterOverdueOffset = afterTodayOffset + 2 + overdueCount
    expect(addedBlocks[afterOverdueOffset].type).toBe('divider')
    expect(addedBlocks[afterOverdueOffset + 1].type).toBe('heading_2')
    expect(addedBlocks[afterOverdueOffset + 2].type).toBe('paragraph')
    expect(addedBlocks[afterOverdueOffset + 3].type).toBe('divider')
    expect(addedBlocks[afterOverdueOffset + 4].type).toBe('heading_2')
    expect(addedBlocks[afterOverdueOffset + 5].type).toBe('paragraph')

    console.log(`=== E2E: ${result.todayTasks.length}件のタスクをDoTodayページに書き込み確認済み ===`)
  }, 90000)
})
