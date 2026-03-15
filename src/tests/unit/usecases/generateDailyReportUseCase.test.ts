import { generateDailyReportUseCase } from '../../../usecases/generateDailyReportUseCase'
import * as notionService from '../../../services/notionService'
import * as claudeService from '../../../services/claudeService'
import * as environment from '../../../config/environment'
import { NotionClient } from '../../../clients/notionClient'
import { ClaudeClient } from '../../../clients/claudeClient'
import type { ClaudeAnalysisResult } from '../../../models/types/analysis.types'

jest.mock('../../../services/notionService')
jest.mock('../../../services/claudeService')
jest.mock('../../../config/environment')
jest.mock('../../../clients/notionClient')
jest.mock('../../../clients/claudeClient')

const mockProcessReport = notionService.processReport as jest.MockedFunction<typeof notionService.processReport>
const mockProcessDailyNotes = notionService.processDailyNotes as jest.MockedFunction<
  typeof notionService.processDailyNotes
>
const mockAnalyzeTasksAndNotes = claudeService.analyzeTasksAndNotes as jest.MockedFunction<
  typeof claudeService.analyzeTasksAndNotes
>
const mockFetchDoTodayTasksPageId = notionService.fetchDoTodayTasksPageId as jest.MockedFunction<
  typeof notionService.fetchDoTodayTasksPageId
>
const mockAppendReportToPage = notionService.appendReportToPage as jest.MockedFunction<
  typeof notionService.appendReportToPage
>
const mockGetEnvironment = environment.getEnvironment as jest.MockedFunction<typeof environment.getEnvironment>
const MockNotionClient = NotionClient as jest.MockedClass<typeof NotionClient>
const MockClaudeClient = ClaudeClient as jest.MockedClass<typeof ClaudeClient>

const validAnalysisResult: ClaudeAnalysisResult = {
  firstTask: { name: '', firstStep: '' },
  todayTasks: [],
  overdueTasks: [],
  healthAdvice: '',
  taskManagementAdvice: '',
}

const stubEnv = {
  secretToken: 'secret',
  masterPassword: 'password',
  anthropicApiKey: 'anthropic-key',
  notionToken: 'notion-token',
  notionTaskDatabaseId: 'task-db-id',
  notionDailyNoteDatabaseId: 'daily-db-id',
  cryptoAlgorithm: 'aes-256-gcm',
  cryptoIvLength: 12,
  cryptoSaltLength: 32,
  cryptoTagLength: 16,
  cryptoKeyLength: 32,
  cryptoIterations: 100000,
}

describe('generateDailyReportUseCase', () => {
  beforeEach(() => {
    mockGetEnvironment.mockReturnValue(stubEnv)
    mockProcessReport.mockResolvedValue([])
    mockProcessDailyNotes.mockResolvedValue([])
    mockAnalyzeTasksAndNotes.mockResolvedValue(validAnalysisResult)
    mockFetchDoTodayTasksPageId.mockResolvedValue('do-today-page-id')
    mockAppendReportToPage.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('notionToken を使って NotionClient を生成する', async () => {
    await generateDailyReportUseCase()

    expect(MockNotionClient).toHaveBeenCalledWith('notion-token')
  })

  it('anthropicApiKey を使って ClaudeClient を生成する', async () => {
    await generateDailyReportUseCase()

    expect(MockClaudeClient).toHaveBeenCalledWith('anthropic-key')
  })

  it('processReportをtaskDatabaseIdとnotionClientで呼ぶ', async () => {
    await generateDailyReportUseCase()

    expect(mockProcessReport).toHaveBeenCalledWith('task-db-id', expect.any(NotionClient))
  })

  it('processDailyNotesをdailyNoteDatabaseIdとnotionClientで呼ぶ', async () => {
    await generateDailyReportUseCase()

    expect(mockProcessDailyNotes).toHaveBeenCalledWith('daily-db-id', expect.any(NotionClient))
  })

  it('processReportとprocessDailyNotesを並列で呼ぶ（両方呼ばれることを確認）', async () => {
    await generateDailyReportUseCase()

    expect(mockProcessReport).toHaveBeenCalledTimes(1)
    expect(mockProcessDailyNotes).toHaveBeenCalledTimes(1)
  })

  it('analyzeTasksAndNotesをprocessReportとprocessDailyNotesの結果で呼ぶ', async () => {
    const tasks = [{ id: 't1', name: 'タスク1', status: 'Doing', createdAt: new Date(), subTasks: [] }]
    const notes = [{ date: '2026-03-12', todayTasks: [], nextTasks: [], issues: [], healthStatus: '' }]
    mockProcessReport.mockResolvedValue(tasks)
    mockProcessDailyNotes.mockResolvedValue(notes)

    await generateDailyReportUseCase()

    expect(mockAnalyzeTasksAndNotes).toHaveBeenCalledWith(tasks, notes, expect.any(ClaudeClient))
  })

  it('ClaudeAnalysisResult を返す', async () => {
    const result = await generateDailyReportUseCase()

    expect(result).toEqual(validAnalysisResult)
  })

  it('分析後に fetchDoTodayTasksPageId を taskDatabaseId で呼ぶ', async () => {
    await generateDailyReportUseCase()

    expect(mockFetchDoTodayTasksPageId).toHaveBeenCalledWith('task-db-id', expect.any(NotionClient))
  })

  it('DoTodayページが存在するとき appendReportToPage を分析結果全体（ClaudeAnalysisResult）で呼ぶ', async () => {
    const analysisResult: ClaudeAnalysisResult = {
      firstTask: { name: 'タスクA', firstStep: 'ファイルを開く' },
      todayTasks: [{ name: 'タスクA', reason: '期限が今日' }],
      overdueTasks: [],
      healthAdvice: '体調良好',
      taskManagementAdvice: 'タスクを整理しましょう',
    }
    mockAnalyzeTasksAndNotes.mockResolvedValue(analysisResult)
    mockFetchDoTodayTasksPageId.mockResolvedValue('do-today-page-id')

    await generateDailyReportUseCase()

    expect(mockAppendReportToPage).toHaveBeenCalledWith(
      'do-today-page-id',
      analysisResult,
      expect.any(NotionClient)
    )
  })

  it('DoTodayページが存在しないとき appendReportToPage を呼ばない', async () => {
    mockFetchDoTodayTasksPageId.mockResolvedValue(null)

    await generateDailyReportUseCase()

    expect(mockAppendReportToPage).not.toHaveBeenCalled()
  })
})
