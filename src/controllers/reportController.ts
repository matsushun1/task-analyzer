import type { Request, Response } from 'express'
import { processReport } from '../services/notionService'
import { verifySecret } from '../services/authService'
import { getEnvironment } from '../config/environment'
import { logger } from '../utils/logger'

export const generateDailyReport = (req: Request, res: Response): void => {
  const encryptedApiKey = req.headers['x-api-key']
  const env = getEnvironment()

  if (typeof encryptedApiKey !== 'string' || !verifySecret(encryptedApiKey, env.masterPassword, env.secretToken)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  res.status(202).json({ message: 'Accepted' })

  void processReport(env.notionTaskDatabaseId, env.notionToken).catch((error) => {
    logger.error('Failed to generate daily report', error)
  })
}
