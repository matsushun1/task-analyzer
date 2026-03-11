import { isClaudeAnalysisResult } from '../../../../src/models/types/analysis.types'

describe('isClaudeAnalysisResult', () => {
  const validResult = {
    todayTasks: [{ name: 'タスクA', deadline: '3/15', reason: '期限が近い' }],
    overdueTasks: [{ name: 'タスクB', deadline: '3/1' }],
    healthAdvice: '体調が良好です',
    taskManagementAdvice: 'タスクを整理しましょう',
  }

  describe('正常系', () => {
    it('全フィールドが正しい型のとき true を返す', () => {
      expect(isClaudeAnalysisResult(validResult)).toBe(true)
    })

    it('todayTasks の deadline が undefined でも true を返す', () => {
      const result = {
        ...validResult,
        todayTasks: [{ name: 'タスクA', reason: '優先度が高い' }],
      }

      expect(isClaudeAnalysisResult(result)).toBe(true)
    })

    it('todayTasks が空配列でも true を返す', () => {
      expect(isClaudeAnalysisResult({ ...validResult, todayTasks: [] })).toBe(true)
    })

    it('overdueTasks が空配列でも true を返す', () => {
      expect(isClaudeAnalysisResult({ ...validResult, overdueTasks: [] })).toBe(true)
    })
  })

  describe('異常系', () => {
    it('null では false を返す', () => {
      expect(isClaudeAnalysisResult(null)).toBe(false)
    })

    it('todayTasks が配列でない場合 false を返す', () => {
      expect(isClaudeAnalysisResult({ ...validResult, todayTasks: 'not-array' })).toBe(false)
    })

    it('todayTasks の要素に name がない場合 false を返す', () => {
      const result = { ...validResult, todayTasks: [{ reason: '理由' }] }

      expect(isClaudeAnalysisResult(result)).toBe(false)
    })

    it('todayTasks の要素に reason がない場合 false を返す', () => {
      const result = { ...validResult, todayTasks: [{ name: 'タスク' }] }

      expect(isClaudeAnalysisResult(result)).toBe(false)
    })

    it('todayTasks の deadline が string でない場合 false を返す', () => {
      const result = {
        ...validResult,
        todayTasks: [{ name: 'タスク', reason: '理由', deadline: 123 }],
      }

      expect(isClaudeAnalysisResult(result)).toBe(false)
    })

    it('overdueTasks が配列でない場合 false を返す', () => {
      expect(isClaudeAnalysisResult({ ...validResult, overdueTasks: 'not-array' })).toBe(false)
    })

    it('overdueTasks の要素に deadline がない場合 false を返す', () => {
      const result = { ...validResult, overdueTasks: [{ name: 'タスク' }] }

      expect(isClaudeAnalysisResult(result)).toBe(false)
    })

    it('healthAdvice が string でない場合 false を返す', () => {
      expect(isClaudeAnalysisResult({ ...validResult, healthAdvice: 123 })).toBe(false)
    })

    it('taskManagementAdvice が string でない場合 false を返す', () => {
      expect(isClaudeAnalysisResult({ ...validResult, taskManagementAdvice: null })).toBe(false)
    })
  })
})
