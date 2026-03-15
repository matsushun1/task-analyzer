import { processReport, processDailyNotes, fetchDoTodayTasksPageId, appendTodayTasksToPage } from '../services/notionService'
import { analyzeTasksAndNotes } from '../services/claudeService'
import type { ClaudeAnalysisResult } from '../models/types/analysis.types'
import { getEnvironment } from '../config/environment'
import { NotionClient } from '../clients/notionClient'
import { ClaudeClient } from '../clients/claudeClient'

export const generateDailyReportUseCase = async (): Promise<ClaudeAnalysisResult> => {
  const env = getEnvironment()
  const notionClient = new NotionClient(env.notionToken)
  const claudeClient = new ClaudeClient(env.anthropicApiKey)
  const [tasks, notes] = await Promise.all([
    processReport(env.notionTaskDatabaseId, notionClient),
    processDailyNotes(env.notionDailyNoteDatabaseId, notionClient),
  ])
  const analysisResult = await analyzeTasksAndNotes(tasks, notes, claudeClient)

  const doTodayPageId = await fetchDoTodayTasksPageId(env.notionTaskDatabaseId, notionClient)
  if (doTodayPageId !== null) {
    await appendTodayTasksToPage(doTodayPageId, analysisResult.todayTasks, notionClient)
  }

  return analysisResult
}
