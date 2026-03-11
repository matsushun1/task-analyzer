import { isNotionDailyNote } from '../../../../src/models/types/dailyNote.types'

describe('isNotionDailyNote', () => {
  const validNote = {
    id: 'note-123',
    properties: {
      日付: {
        date: { start: '2026-03-10' },
      },
    },
  }

  describe('正常系', () => {
    it('正しい構造のオブジェクトで true を返す', () => {
      expect(isNotionDailyNote(validNote)).toBe(true)
    })

    it('date が null でも true を返す', () => {
      const note = {
        ...validNote,
        properties: { 日付: { date: null } },
      }

      expect(isNotionDailyNote(note)).toBe(true)
    })
  })

  describe('異常系', () => {
    it('null では false を返す', () => {
      expect(isNotionDailyNote(null)).toBe(false)
    })

    it('文字列では false を返す', () => {
      expect(isNotionDailyNote('not-an-object')).toBe(false)
    })

    it('id が欠けている場合 false を返す', () => {
      const noId = { properties: validNote.properties }

      expect(isNotionDailyNote(noId)).toBe(false)
    })

    it('id が文字列でない場合 false を返す', () => {
      expect(isNotionDailyNote({ ...validNote, id: 42 })).toBe(false)
    })

    it('properties が欠けている場合 false を返す', () => {
      expect(isNotionDailyNote({ id: validNote.id })).toBe(false)
    })

    it('日付プロパティが欠けている場合 false を返す', () => {
      expect(isNotionDailyNote({ id: validNote.id, properties: {} })).toBe(false)
    })

    it('日付プロパティが正しい構造でない場合 false を返す', () => {
      const note = {
        id: validNote.id,
        properties: { 日付: 'not-an-object' },
      }

      expect(isNotionDailyNote(note)).toBe(false)
    })

    it('date.start が文字列でない場合 false を返す', () => {
      const note = {
        id: validNote.id,
        properties: { 日付: { date: { start: 12345 } } },
      }

      expect(isNotionDailyNote(note)).toBe(false)
    })
  })
})
