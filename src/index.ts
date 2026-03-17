import 'dotenv/config'
import express from 'express'
import { generateDailyReport } from './controllers/reportController.js'
import { getPort } from './config/environment.js'
import { logger } from './utils/logger.js'

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', reason)
  process.exit(1)
})

const app = express()
const PORT = getPort()

app.use(express.json())

app.post('/generate-daily-report', generateDailyReport)

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`)
})
