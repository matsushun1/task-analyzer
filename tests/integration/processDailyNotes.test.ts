/**
 * 統合テスト: processDailyNotes
 *
 * 実際のNotion APIに接続してデイリーノートを取得し、DailyNoteData[] に変換できることを確認する。
 *
 * 必要な環境変数:
 *   - NOTION_TOKEN: Notion Integration Token
 *   - NOTION_DAILY_NOTE_DB_ID: デイリーノートDBのID
 */
import * as dotenv from 'dotenv'
import { fetchDailyNotes, fetchBlockChildren } from '../../src/services/notionService'
import { buildDailyNoteData } from '../../src/models/dailyNote.model'
import { isNotionDailyNote } from '../../src/models/types/dailyNote.types'
import { NotionClient } from '../../src/clients/notionClient'

dotenv.config()

describe('processDailyNotes（統合テスト）', () => {
  const notionToken = process.env['NOTION_TOKEN']
  const dailyNoteDatabaseId = process.env['NOTION_DAILY_NOTE_DB_ID']

  if (!notionToken || !dailyNoteDatabaseId) {
    it.todo('NOTION_TOKEN と NOTION_DAILY_NOTE_DB_ID を .env に設定してください')
    return
  }

  it('デイリーノートを取得してDailyNoteData[]に変換できる', async () => {
    // fetchDailyNotes は直近14日フィルタのため、DBに存在するノートを直接取得して検証
    const notionClient = new NotionClient(notionToken)
    const notes = await fetchDailyNotes(dailyNoteDatabaseId, notionClient)

    // フィルタ範囲外でも構造テストができるよう、1件目のブロックを直接取得して変換を検証
    // （DB全件取得は別途確認済み。ここではパイプライン全体の結合を確認する）
    if (notes.length === 0) {
      // 直近14日にノートがない場合: フィルタなしで先頭1件を取得して変換パイプラインを検証する
      const { Client } = await import('@notionhq/client')
      const client = new Client({ auth: notionToken })
      const response = await client.dataSources.query({ data_source_id: dailyNoteDatabaseId, page_size: 1 })
      expect(response.results.length).toBeGreaterThan(0)
      const firstNote = response.results[0]
      expect(isNotionDailyNote(firstNote)).toBe(true)
      if (!isNotionDailyNote(firstNote)) return
      const blocks = await fetchBlockChildren(firstNote.id, notionClient)
      const noteData = buildDailyNoteData(firstNote, blocks)
      expect(noteData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Array.isArray(noteData.todayTasks)).toBe(true)
      return
    }

    const results = await Promise.all(
      notes.map(async (note) => {
        const blocks = await fetchBlockChildren(note.id, notionClient)
        return buildDailyNoteData(note, blocks)
      })
    )

    expect(results.length).toBeGreaterThan(0)

    for (const noteData of results) {
      expect(typeof noteData.date).toBe('string')
      expect(noteData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Array.isArray(noteData.todayTasks)).toBe(true)
      expect(Array.isArray(noteData.nextTasks)).toBe(true)
      expect(Array.isArray(noteData.issues)).toBe(true)
      expect(typeof noteData.healthStatus).toBe('string')
    }
  }, 30000)
})
