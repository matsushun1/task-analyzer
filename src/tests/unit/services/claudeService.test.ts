import Anthropic from '@anthropic-ai/sdk'
import { analyzeTasksAndNotes } from '../../../services/claudeService'
import { ClaudeAPIError } from '../../../utils/errors'
import type { TaskData } from '../../../models/types/task.types'
import type { DailyNoteData } from '../../../models/types/dailyNote.types'
import type { ClaudeClient } from '../../../clients/claudeClient'

const sampleTasks: TaskData[] = [
  {
    id: 'task-1',
    name: 'テストタスク',
    status: 'Doing',
    createdAt: new Date('2026-03-01'),
    deadline: '3/10',
    subTasks: [],
  },
]

const sampleNotes: DailyNoteData[] = [
  {
    date: '2026-03-12',
    todayTasks: ['タスクA'],
    nextTasks: ['タスクB'],
    issues: ['課題1'],
    healthStatus: '良好',
  },
]

const validAnalysisResult = {
  firstTask: { name: 'テストタスク', firstStep: 'ファイルを開く' },
  todayTasks: [{ name: 'テストタスク', deadline: '3/10', reason: '期限が近い' }],
  overdueTasks: [],
  healthAdvice: '健康状態は良好です。引き続き規則正しい生活を心がけましょう。',
  taskManagementAdvice: 'タスクの優先順位を明確にして、一つずつ着実に進めましょう。',
}

const makeClaudeClient = (mockCreate: jest.Mock): ClaudeClient => ({
  inner: {
    messages: { create: mockCreate },
  } as unknown as Anthropic,
})

describe('analyzeTasksAndNotes', () => {
  it('ClaudeAnalysisResult を返す', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validAnalysisResult) }],
    })
    const client = makeClaudeClient(mockCreate)

    const result = await analyzeTasksAndNotes(sampleTasks, sampleNotes, client)

    expect(result).toMatchObject(validAnalysisResult)
  })

  it('model と max_tokens が正しく設定されて呼び出される', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validAnalysisResult) }],
    })
    const client = makeClaudeClient(mockCreate)

    await analyzeTasksAndNotes(sampleTasks, sampleNotes, client)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
      })
    )
  })

  it('Claude API がエラーを投げたとき ClaudeAPIError をthrowする', async () => {
    const client = makeClaudeClient(jest.fn().mockRejectedValue(new Error('API error')))

    await expect(analyzeTasksAndNotes(sampleTasks, sampleNotes, client)).rejects.toThrow(ClaudeAPIError)
  })

  it('レスポンスの content が空配列のとき ClaudeAPIError をthrowする', async () => {
    const client = makeClaudeClient(jest.fn().mockResolvedValue({ content: [] }))

    await expect(analyzeTasksAndNotes(sampleTasks, sampleNotes, client)).rejects.toThrow(ClaudeAPIError)
  })

  it('レスポンスが text ブロックでないとき ClaudeAPIError をthrowする', async () => {
    const client = makeClaudeClient(
      jest.fn().mockResolvedValue({
        content: [{ type: 'tool_use', id: 'x', name: 'foo', input: {} }],
      })
    )

    await expect(analyzeTasksAndNotes(sampleTasks, sampleNotes, client)).rejects.toThrow(ClaudeAPIError)
  })

  it('レスポンスの JSON が不正なとき ClaudeAPIError をthrowする', async () => {
    const client = makeClaudeClient(
      jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'not json' }],
      })
    )

    await expect(analyzeTasksAndNotes(sampleTasks, sampleNotes, client)).rejects.toThrow(ClaudeAPIError)
  })

  it('レスポンスの JSON が ClaudeAnalysisResult の型を満たさないとき ClaudeAPIError をthrowする', async () => {
    const client = makeClaudeClient(
      jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"foo":"bar"}' }],
      })
    )

    await expect(analyzeTasksAndNotes(sampleTasks, sampleNotes, client)).rejects.toThrow(ClaudeAPIError)
  })
})
