import type { Request, Response } from 'express'
import { generateDailyReport } from '../../../src/controllers/reportController'
import * as usecase from '../../../src/usecases/generateDailyReportUseCase'
import * as authService from '../../../src/services/authService'

jest.mock('../../../src/usecases/generateDailyReportUseCase')
jest.mock('../../../src/services/authService')

const mockGenerateDailyReportUseCase = usecase.generateDailyReportUseCase as jest.MockedFunction<
  typeof usecase.generateDailyReportUseCase
>
const mockVerifySecret = authService.verifySecret as jest.MockedFunction<typeof authService.verifySecret>

const makeRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: { 'x-api-key': 'encrypted-token' },
    body: {},
    ...overrides,
  }) as unknown as Request

const makeResponse = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }
  return res as unknown as Response
}

describe('generateDailyReport', () => {
  beforeEach(() => {
    mockVerifySecret.mockReturnValue(true)
    mockGenerateDailyReportUseCase.mockResolvedValue({
      todayTasks: [],
      overdueTasks: [],
      healthAdvice: '',
      taskManagementAdvice: '',
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('認証チェック', () => {
    it('verifySecretがtrueを返すと202を返す', () => {
      const req = makeRequest()
      const res = makeResponse()

      generateDailyReport(req, res)

      expect(mockVerifySecret).toHaveBeenCalledWith('encrypted-token')
      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.json).toHaveBeenCalledWith({ message: 'Accepted' })
    })

    it('x-api-keyヘッダーがないと401を返す', () => {
      const req = makeRequest({ headers: {} })
      const res = makeResponse()

      generateDailyReport(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    })

    it('verifySecretがfalseを返すと401を返す', () => {
      mockVerifySecret.mockReturnValue(false)

      const req = makeRequest()
      const res = makeResponse()

      generateDailyReport(req, res)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    })
  })

  describe('UseCaseへの委譲', () => {
    it('認証成功後にgenerateDailyReportUseCaseを引数なしで呼ぶ', async () => {
      const req = makeRequest()
      const res = makeResponse()

      generateDailyReport(req, res)
      await new Promise(process.nextTick)

      expect(mockGenerateDailyReportUseCase).toHaveBeenCalledWith()
    })

    it('認証に失敗したときはgenerateDailyReportUseCaseを呼ばない', async () => {
      mockVerifySecret.mockReturnValue(false)

      const req = makeRequest()
      const res = makeResponse()

      generateDailyReport(req, res)
      await new Promise(process.nextTick)

      expect(mockGenerateDailyReportUseCase).not.toHaveBeenCalled()
    })

    it('generateDailyReportUseCaseが失敗しても202は返却済みのためレスポンスに影響しない', async () => {
      mockGenerateDailyReportUseCase.mockRejectedValue(new Error('usecase failed'))

      const req = makeRequest()
      const res = makeResponse()

      generateDailyReport(req, res)
      await new Promise(process.nextTick)

      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.json).toHaveBeenCalledTimes(1)
    })
  })
})
