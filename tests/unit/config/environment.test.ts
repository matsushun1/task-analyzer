import { getEnvironment } from '../../../src/config/environment'

describe('environment', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('getEnvironment', () => {
    it('すべての環境変数が設定されている場合、正しく取得できる', () => {
      process.env.SECRET_TOKEN = 'test-secret'
      process.env.MASTER_PW = 'test-master-pw'
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
      process.env.NOTION_TOKEN = 'test-notion-token'

      const env = getEnvironment()

      expect(env.secretToken).toBe('test-secret')
      expect(env.masterPassword).toBe('test-master-pw')
      expect(env.anthropicApiKey).toBe('test-anthropic-key')
      expect(env.notionToken).toBe('test-notion-token')
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
