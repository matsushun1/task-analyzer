import type { Request, Response } from 'express'
import { generateDailyReport } from '../../../src/controllers/reportController'
import * as notionService from '../../../src/services/notionService'
import * as authService from '../../../src/services/authService'
import * as environment from '../../../src/config/environment'

jest.mock('../../../src/services/notionService')
jest.mock('../../../src/services/authService')
jest.mock('../../../src/config/environment')

const mockProcessReport = notionService.processReport as jest.MockedFunction<
  typeof notionService.processReport
>
const mockGetEnvironment = environment.getEnvironment as jest.MockedFunction<
  typeof environment.getEnvironment
>
const mockVerifySecret = authService.verifySecret as jest.MockedFunction<
  typeof authService.verifySecret
>

const makeRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: { 'x-api-key': 'encrypted-token' },
    body: { taskDatabaseId: 'task-db-id' },
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
    mockGetEnvironment.mockReturnValue({
      secretToken: 'valid-secret-token',
      masterPassword: 'master-pw',
      anthropicApiKey: 'anthropic-key',
      notionToken: 'notion-token',
      cryptoAlgorithm: 'aes-256-gcm',
      cryptoIvLength: 16,
      cryptoSaltLength: 64,
      cryptoTagLength: 16,
      cryptoKeyLength: 32,
      cryptoIterations: 100000,
    })
    mockVerifySecret.mockReturnValue(true)
    mockProcessReport.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('認証チェック', () => {
    it('verifySecretがtrueを返すと202を返す', () => {
      const req = makeRequest()
      const res = makeResponse()

      generateDailyReport(req, res)

      expect(mockVerifySecret).toHaveBeenCalledWith('encrypted-token', 'master-pw', 'valid-secret-token')
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

  describe('serviceへの委譲', () => {
    it('認証成功後にprocessReportをtaskDatabaseIdとnotionTokenで呼ぶ', async () => {
      const req = makeRequest()
      const res = makeResponse()

      generateDailyReport(req, res)
      await new Promise(process.nextTick)

      expect(mockProcessReport).toHaveBeenCalledWith('task-db-id', 'notion-token')
    })

    it('認証に失敗したときはprocessReportを呼ばない', async () => {
      mockVerifySecret.mockReturnValue(false)

      const req = makeRequest()
      const res = makeResponse()

      generateDailyReport(req, res)
      await new Promise(process.nextTick)

      expect(mockProcessReport).not.toHaveBeenCalled()
    })

    it('processReportが失敗しても202は返済済みのためレスポンスに影響しない', async () => {
      mockProcessReport.mockRejectedValue(new Error('report failed'))

      const req = makeRequest()
      const res = makeResponse()

      generateDailyReport(req, res)
      await new Promise(process.nextTick)

      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.json).toHaveBeenCalledTimes(1)
    })
  })
})
