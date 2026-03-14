import { NotionClient } from './notionClient'
import { ClaudeClient } from './claudeClient'
import type { Environment } from '../config/environment'

export const createClients = (env: Environment): { notionClient: NotionClient; claudeClient: ClaudeClient } => ({
  notionClient: new NotionClient(env.notionToken),
  claudeClient: new ClaudeClient(env.anthropicApiKey),
})
