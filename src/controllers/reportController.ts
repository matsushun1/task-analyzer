import type { Request, Response } from 'express'
import { generateDailyReportUseCase } from '../usecases/generateDailyReportUseCase'
import { verifySecret } from '../services/authService'
import { logger } from '../utils/logger'

export const generateDailyReport = (req: Request, res: Response): void => {
  const authToken = req.headers['x-api-key']

  if (typeof authToken !== 'string' || !verifySecret(authToken)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  res.status(202).json({ message: 'Accepted' })

  void generateDailyReportUseCase().catch((error) => {
    logger.error('Failed to generate daily report', error)
  })
}
