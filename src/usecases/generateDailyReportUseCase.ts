import { processReport, processDailyNotes } from '../services/notionService'
import { analyzeTasksAndNotes } from '../services/claudeService'
import type { ClaudeAnalysisResult } from '../models/types/analysis.types'
import type { NotionClient } from '../clients/notionClient'
import type { ClaudeClient } from '../clients/claudeClient'

export const generateDailyReportUseCase = async (
  taskDatabaseId: string,
  dailyNoteDatabaseId: string,
  notionClient: NotionClient,
  claudeClient: ClaudeClient
): Promise<ClaudeAnalysisResult> => {
  const [tasks, notes] = await Promise.all([
    processReport(taskDatabaseId, notionClient),
    processDailyNotes(dailyNoteDatabaseId, notionClient),
  ])
  return analyzeTasksAndNotes(tasks, notes, claudeClient)
}
