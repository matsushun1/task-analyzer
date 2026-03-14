import { generateDailyReportUseCase } from '../../../src/usecases/generateDailyReportUseCase'
import * as notionService from '../../../src/services/notionService'
import * as claudeService from '../../../src/services/claudeService'
import type { NotionClient } from '../../../src/clients/notionClient'
import type { ClaudeClient } from '../../../src/clients/claudeClient'
import type { Client } from '@notionhq/client'
import Anthropic from '@anthropic-ai/sdk'

jest.mock('../../../src/services/notionService')
jest.mock('../../../src/services/claudeService')

const mockProcessReport = notionService.processReport as jest.MockedFunction<
  typeof notionService.processReport
>
const mockProcessDailyNotes = notionService.processDailyNotes as jest.MockedFunction<
  typeof notionService.processDailyNotes
>
const mockAnalyzeTasksAndNotes = claudeService.analyzeTasksAndNotes as jest.MockedFunction<
  typeof claudeService.analyzeTasksAndNotes
>

const validAnalysisResult = {
  todayTasks: [],
  overdueTasks: [],
  healthAdvice: '',
  taskManagementAdvice: '',
}

const stubNotionClient: NotionClient = { inner: {} as Client }
const stubClaudeClient: ClaudeClient = { inner: {} as Anthropic }

describe('generateDailyReportUseCase', () => {
  beforeEach(() => {
    mockProcessReport.mockResolvedValue([])
    mockProcessDailyNotes.mockResolvedValue([])
    mockAnalyzeTasksAndNotes.mockResolvedValue(validAnalysisResult)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('processReportをtaskDatabaseIdとnotionClientで呼ぶ', async () => {
    await generateDailyReportUseCase('task-db-id', 'daily-db-id', stubNotionClient, stubClaudeClient)

    expect(mockProcessReport).toHaveBeenCalledWith('task-db-id', stubNotionClient)
  })

  it('processDailyNotesをdailyNoteDatabaseIdとnotionClientで呼ぶ', async () => {
    await generateDailyReportUseCase('task-db-id', 'daily-db-id', stubNotionClient, stubClaudeClient)

    expect(mockProcessDailyNotes).toHaveBeenCalledWith('daily-db-id', stubNotionClient)
  })

  it('processReportとprocessDailyNotesを並列で呼ぶ（両方呼ばれることを確認）', async () => {
    await generateDailyReportUseCase('task-db-id', 'daily-db-id', stubNotionClient, stubClaudeClient)

    expect(mockProcessReport).toHaveBeenCalledTimes(1)
    expect(mockProcessDailyNotes).toHaveBeenCalledTimes(1)
  })

  it('analyzeTasksAndNotesをprocessReportとprocessDailyNotesの結果で呼ぶ', async () => {
    const tasks = [{ id: 't1', name: 'タスク1', status: 'Doing', createdAt: new Date(), subTasks: [] }]
    const notes = [{ date: '2026-03-12', todayTasks: [], nextTasks: [], issues: [], healthStatus: '' }]
    mockProcessReport.mockResolvedValue(tasks)
    mockProcessDailyNotes.mockResolvedValue(notes)

    await generateDailyReportUseCase('task-db-id', 'daily-db-id', stubNotionClient, stubClaudeClient)

    expect(mockAnalyzeTasksAndNotes).toHaveBeenCalledWith(tasks, notes, stubClaudeClient)
  })

  it('ClaudeAnalysisResult を返す', async () => {
    const result = await generateDailyReportUseCase('task-db-id', 'daily-db-id', stubNotionClient, stubClaudeClient)

    expect(result).toEqual(validAnalysisResult)
  })
})
