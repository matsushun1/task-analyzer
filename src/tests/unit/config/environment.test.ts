import { getEnvironment } from '../../../config/environment'

describe('environment', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  const setCryptoEnvVars = () => {
    process.env.CRYPTO_ALGORITHM = 'aes-256-gcm'
    process.env.CRYPTO_IV_LENGTH = '16'
    process.env.CRYPTO_SALT_LENGTH = '64'
    process.env.CRYPTO_TAG_LENGTH = '16'
    process.env.CRYPTO_KEY_LENGTH = '32'
    process.env.CRYPTO_ITERATIONS = '100000'
  }

  const setAllEnvVars = () => {
    process.env.SECRET_TOKEN = 'test-secret'
    process.env.MASTER_PW = 'test-master-pw'
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
    process.env.NOTION_TOKEN = 'test-notion-token'
    process.env.NOTION_TASK_DB_ID = 'test-task-db-id'
    process.env.NOTION_DAILY_NOTE_DB_ID = 'test-daily-note-db-id'
    setCryptoEnvVars()
  }

  describe('getEnvironment', () => {
    it('すべての環境変数が設定されている場合、正しく取得できる', () => {
      setAllEnvVars()

      const env = getEnvironment()

      expect(env.secretToken).toBe('test-secret')
      expect(env.masterPassword).toBe('test-master-pw')
      expect(env.anthropicApiKey).toBe('test-anthropic-key')
      expect(env.notionToken).toBe('test-notion-token')
      expect(env.notionTaskDatabaseId).toBe('test-task-db-id')
      expect(env.notionDailyNoteDatabaseId).toBe('test-daily-note-db-id')
      expect(env.cryptoAlgorithm).toBe('aes-256-gcm')
      expect(env.cryptoIvLength).toBe(16)
      expect(env.cryptoSaltLength).toBe(64)
      expect(env.cryptoTagLength).toBe(16)
      expect(env.cryptoKeyLength).toBe(32)
      expect(env.cryptoIterations).toBe(100000)
    })

    it('SECRET_TOKENが未設定の場合エラーをthrowする', () => {
      delete process.env.SECRET_TOKEN
      process.env.MASTER_PW = 'test-master-pw'
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
      process.env.NOTION_TOKEN = 'test-notion-token'

      expect(() => getEnvironment()).toThrow(
        'Missing required environment variable: SECRET_TOKEN'
      )
    })

    it('MASTER_PWが未設定の場合エラーをthrowする', () => {
      process.env.SECRET_TOKEN = 'test-secret'
      delete process.env.MASTER_PW
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
      process.env.NOTION_TOKEN = 'test-notion-token'

      expect(() => getEnvironment()).toThrow('Missing required environment variable: MASTER_PW')
    })

    it('ANTHROPIC_API_KEYが未設定の場合エラーをthrowする', () => {
      process.env.SECRET_TOKEN = 'test-secret'
      process.env.MASTER_PW = 'test-master-pw'
      delete process.env.ANTHROPIC_API_KEY
      process.env.NOTION_TOKEN = 'test-notion-token'

      expect(() => getEnvironment()).toThrow(
        'Missing required environment variable: ANTHROPIC_API_KEY'
      )
    })

    it('NOTION_TOKENが未設定の場合エラーをthrowする', () => {
      process.env.SECRET_TOKEN = 'test-secret'
      process.env.MASTER_PW = 'test-master-pw'
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
      delete process.env.NOTION_TOKEN

      expect(() => getEnvironment()).toThrow(
        'Missing required environment variable: NOTION_TOKEN'
      )
    })

    it('NOTION_TASK_DB_IDが未設定の場合エラーをthrowする', () => {
      setAllEnvVars()
      delete process.env.NOTION_TASK_DB_ID

      expect(() => getEnvironment()).toThrow(
        'Missing required environment variable: NOTION_TASK_DB_ID'
      )
    })

    it('NOTION_DAILY_NOTE_DB_IDが未設定の場合エラーをthrowする', () => {
      setAllEnvVars()
      delete process.env.NOTION_DAILY_NOTE_DB_ID

      expect(() => getEnvironment()).toThrow(
        'Missing required environment variable: NOTION_DAILY_NOTE_DB_ID'
      )
    })

    it('CRYPTO_ALGORITHMが未設定の場合エラーをthrowする', () => {
      setAllEnvVars()
      delete process.env.CRYPTO_ALGORITHM

      expect(() => getEnvironment()).toThrow(
        'Missing required environment variable: CRYPTO_ALGORITHM'
      )
    })

    it('空文字列の環境変数はエラーをthrowする', () => {
      process.env.SECRET_TOKEN = ''
      process.env.MASTER_PW = 'test-master-pw'
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
      process.env.NOTION_TOKEN = 'test-notion-token'

      expect(() => getEnvironment()).toThrow(
        'Missing required environment variable: SECRET_TOKEN'
      )
    })
  })
})
