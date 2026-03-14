import { createClients } from '../../../src/clients/clientFactory'
import { NotionClient } from '../../../src/clients/notionClient'
import { ClaudeClient } from '../../../src/clients/claudeClient'
import type { Environment } from '../../../src/config/environment'

jest.mock('../../../src/clients/notionClient')
jest.mock('../../../src/clients/claudeClient')

const MockNotionClient = NotionClient as jest.MockedClass<typeof NotionClient>
const MockClaudeClient = ClaudeClient as jest.MockedClass<typeof ClaudeClient>

const stubEnv: Environment = {
  secretToken: 'secret',
  masterPassword: 'password',
  anthropicApiKey: 'anthropic-key',
  notionToken: 'notion-token',
  notionTaskDatabaseId: 'task-db-id',
  notionDailyNoteDatabaseId: 'note-db-id',
  cryptoAlgorithm: 'aes-256-gcm',
  cryptoIvLength: 12,
  cryptoSaltLength: 32,
  cryptoTagLength: 16,
  cryptoKeyLength: 32,
  cryptoIterations: 100000,
}

describe('createClients', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('notionToken を使って NotionClient を生成する', () => {
    createClients(stubEnv)

    expect(MockNotionClient).toHaveBeenCalledWith('notion-token')
  })

  it('anthropicApiKey を使って ClaudeClient を生成する', () => {
    createClients(stubEnv)

    expect(MockClaudeClient).toHaveBeenCalledWith('anthropic-key')
  })

  it('notionClient と claudeClient を返す', () => {
    const { notionClient, claudeClient } = createClients(stubEnv)

    expect(notionClient).toBeInstanceOf(NotionClient)
    expect(claudeClient).toBeInstanceOf(ClaudeClient)
  })
})
