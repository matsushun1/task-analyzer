import type { BlockWithChildren } from '../../../models/types/block.types'
import { buildDailyNoteData } from '../../../models/dailyNote.model'
import type { NotionDailyNote } from '../../../models/types/dailyNote.types'

const makeNotionDailyNote = (dateStart: string | null = '2026-03-10'): NotionDailyNote => ({
  id: 'note-id-1',
  properties: {
    日付: {
      date: dateStart !== null ? { start: dateStart } : null,
    },
  },
})

const makeBulletBlock = (text: string): BlockWithChildren =>
  ({
    id: `bullet-${text}`,
    type: 'bulleted_list_item',
    has_children: false,
    bulleted_list_item: { rich_text: [{ plain_text: text }] },
    children: [],
  }) as unknown as BlockWithChildren

describe('buildDailyNoteData', () => {
  it('NotionDailyNote の日付を DailyNoteData の date フィールドに変換する', () => {
    const note = makeNotionDailyNote('2026-03-10')

    const result = buildDailyNoteData(note, [])

    expect(result.date).toBe('2026-03-10')
  })

  it('date.start が null のとき date は空文字', () => {
    const note = makeNotionDailyNote(null)

    const result = buildDailyNoteData(note, [])

    expect(result.date).toBe('')
  })

  it('blocks を parseDailyNoteBlocks に渡して結果をマージする', () => {
    const note = makeNotionDailyNote('2026-03-10')
    const blocks = [makeBulletBlock('【今日行ったこと】'), makeBulletBlock('作業A')]

    const result = buildDailyNoteData(note, blocks)

    expect(result.todayTasks).toEqual(['作業A'])
  })

  it('ブロックが空のとき全セクションフィールドは空', () => {
    const note = makeNotionDailyNote('2026-03-10')

    const result = buildDailyNoteData(note, [])

    expect(result.todayTasks).toEqual([])
    expect(result.nextTasks).toEqual([])
    expect(result.issues).toEqual([])
    expect(result.healthStatus).toBe('')
  })
})
