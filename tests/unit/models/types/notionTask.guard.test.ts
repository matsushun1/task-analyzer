import { isNotionTask } from '../../../../src/models/types/task.types'

describe('isNotionTask', () => {
  const validTask = {
    id: 'abc-123',
    properties: {
      Name: { title: [{ plain_text: 'タスク名' }] },
      Status: { select: { name: 'Doing' } },
      'Date Created': { created_time: '2026-03-08T00:00:00.000Z' },
    },
  }

  describe('正常系', () => {
    it('正しい構造のオブジェクトで true を返す', () => {
      expect(isNotionTask(validTask)).toBe(true)
    })

    it('Status.select が null でも true を返す', () => {
      const task = {
        ...validTask,
        properties: { ...validTask.properties, Status: { select: null } },
      }

      expect(isNotionTask(task)).toBe(true)
    })

    it('title が複数要素の配列でも true を返す', () => {
      const task = {
        ...validTask,
        properties: {
          ...validTask.properties,
          Name: { title: [{ plain_text: 'A' }, { plain_text: 'B' }] },
        },
      }

      expect(isNotionTask(task)).toBe(true)
    })
  })

  describe('異常系', () => {
    it('null では false を返す', () => {
      expect(isNotionTask(null)).toBe(false)
    })

    it('文字列では false を返す', () => {
      expect(isNotionTask('not-an-object')).toBe(false)
    })

    it('id が欠けている場合 false を返す', () => {
      const noId = { properties: validTask.properties }

      expect(isNotionTask(noId)).toBe(false)
    })

    it('id が文字列でない場合 false を返す', () => {
      expect(isNotionTask({ ...validTask, id: 42 })).toBe(false)
    })

    it('properties が欠けている場合 false を返す', () => {
      const noProps = { id: validTask.id }

      expect(isNotionTask(noProps)).toBe(false)
    })

    it('Name.title が配列でない場合 false を返す', () => {
      const task = {
        ...validTask,
        properties: {
          ...validTask.properties,
          Name: { title: 'not-array' },
        },
      }

      expect(isNotionTask(task)).toBe(false)
    })

    it('Status が欠けている場合 false を返す', () => {
      const task = {
        ...validTask,
        properties: { Name: validTask.properties.Name, 'Date Created': validTask.properties['Date Created'] },
      }

      expect(isNotionTask(task)).toBe(false)
    })

    it("'Date Created'.created_time が文字列でない場合 false を返す", () => {
      const task = {
        ...validTask,
        properties: {
          ...validTask.properties,
          'Date Created': { created_time: 12345 },
        },
      }

      expect(isNotionTask(task)).toBe(false)
    })
  })
})
