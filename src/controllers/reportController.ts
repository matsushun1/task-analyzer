import type { Request, Response } from 'express'
import { generateDailyReportUseCase } from '../usecases/generateDailyReportUseCase'
import { verifySecret } from '../services/authService'
import { getEnvironment } from '../config/environment'
import { logger } from '../utils/logger'
import { NotionClient } from '../clients/notionClient'
import { ClaudeClient } from '../clients/claudeClient'

export const generateDailyReport = (req: Request, res: Response): void => {
  const encryptedApiKey = req.headers['x-api-key']
  const env = getEnvironment()

  if (typeof encryptedApiKey !== 'string' || !verifySecret(encryptedApiKey, env.masterPassword, env.secretToken)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  res.status(202).json({ message: 'Accepted' })

  const notionClient = new NotionClient(env.notionToken)
  const claudeClient = new ClaudeClient(env.anthropicApiKey)

  void generateDailyReportUseCase(
    env.notionTaskDatabaseId,
    env.notionDailyNoteDatabaseId,
    notionClient,
    claudeClient
  ).catch((error) => {
    logger.error('Failed to generate daily report', error)
  })
}
