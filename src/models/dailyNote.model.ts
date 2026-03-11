import { parseDailyNoteBlocks } from './parsers/dailyNoteParser'
import type { BlockWithChildren } from './types/block.types'
import type { DailyNoteData, NotionDailyNote } from './types/dailyNote.types'

export const buildDailyNoteData = (note: NotionDailyNote, blocks: BlockWithChildren[]): DailyNoteData => {
  const date = note.properties['日付'].date?.start ?? ''
  const parsed = parseDailyNoteBlocks(blocks)

  return { date, ...parsed }
}
