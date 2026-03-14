import { processReport, processDailyNotes } from '../services/notionService'
import { analyzeTasksAndNotes } from '../services/claudeService'
import type { ClaudeAnalysisResult } from '../models/types/analysis.types'
import { getEnvironment } from '../config/environment'
import { createClients } from '../clients/clientFactory'

export const generateDailyReportUseCase = async (): Promise<ClaudeAnalysisResult> => {
  const env = getEnvironment()
  const { notionClient, claudeClient } = createClients(env)
  const [tasks, notes] = await Promise.all([
    processReport(env.notionTaskDatabaseId, notionClient),
    processDailyNotes(env.notionDailyNoteDatabaseId, notionClient),
  ])
  return analyzeTasksAndNotes(tasks, notes, claudeClient)
}
