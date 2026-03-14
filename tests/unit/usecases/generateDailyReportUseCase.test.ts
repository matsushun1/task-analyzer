import { generateDailyReportUseCase } from '../../../src/usecases/generateDailyReportUseCase'
import * as notionService from '../../../src/services/notionService'
import * as claudeService from '../../../src/services/claudeService'
import * as environment from '../../../src/config/environment'
import { NotionClient } from '../../../src/clients/notionClient'
import { ClaudeClient } from '../../../src/clients/claudeClient'

jest.mock('../../../src/services/notionService')
jest.mock('../../../src/services/claudeService')
jest.mock('../../../src/config/environment')
jest.mock('../../../src/clients/notionClient')
jest.mock('../../../src/clients/claudeClient')

const mockProcessReport = notionService.processReport as jest.MockedFunction<typeof notionService.processReport>
const mockProcessDailyNotes = notionService.processDailyNotes as jest.MockedFunction<
  typeof notionService.processDailyNotes
>
const mockAnalyzeTasksAndNotes = claudeService.analyzeTasksAndNotes as jest.MockedFunction<
  typeof claudeService.analyzeTasksAndNotes
>
const mockGetEnvironment = environment.getEnvironment as jest.MockedFunction<typeof environment.getEnvironment>
const MockNotionClient = NotionClient as jest.MockedClass<typeof NotionClient>
const MockClaudeClient = ClaudeClient as jest.MockedClass<typeof ClaudeClient>

const validAnalysisResult = {
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
})
