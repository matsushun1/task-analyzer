import {
  AppError,
  AuthenticationError,
  NotionAPIError,
  BlockFetchError,
  ClaudeAPIError,
} from '../../../src/utils/errors'

describe('errors', () => {
  describe('AppError', () => {
    it('エラーメッセージとステータスコードを持つ', () => {
      const error = new AppError('Test error', 500)

      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe('AppError')
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('AuthenticationError', () => {
    it('デフォルトメッセージで401エラーを作成する', () => {
      const error = new AuthenticationError()

      expect(error.message).toBe('Unauthorized')
      expect(error.statusCode).toBe(401)
      expect(error.name).toBe('AuthenticationError')
    })

    it('カスタムメッセージで401エラーを作成する', () => {
      const error = new AuthenticationError('Invalid API key')

      expect(error.message).toBe('Invalid API key')
      expect(error.statusCode).toBe(401)
    })
  })

  describe('NotionAPIError', () => {
    it('エラーメッセージを持つ500エラーを作成する', () => {
      const error = new NotionAPIError('Notion API failed')

      expect(error.message).toBe('Notion API failed')
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe('NotionAPIError')
    })

    it('元のエラーを保持する', () => {
      const originalError = new Error('Original error')
      const error = new NotionAPIError('Notion API failed', originalError)

      expect(error.originalError).toBe(originalError)
    })
  })

  describe('BlockFetchError', () => {
    it('ページIDを含むエラーメッセージを作成する', () => {
      const pageId = 'page-123'
      const error = new BlockFetchError(pageId)

      expect(error.message).toBe(`Failed to fetch blocks for page: ${pageId}`)
      expect(error.statusCode).toBe(500)
      expect(error.pageId).toBe(pageId)
      expect(error.name).toBe('BlockFetchError')
    })

    it('元のエラーを保持する', () => {
      const originalError = new Error('Network error')
      const error = new BlockFetchError('page-123', originalError)

      expect(error.originalError).toBe(originalError)
    })
  })

  describe('ClaudeAPIError', () => {
    it('エラーメッセージを持つ500エラーを作成する', () => {
      const error = new ClaudeAPIError('Claude API failed')

      expect(error.message).toBe('Claude API failed')
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe('ClaudeAPIError')
    })

    it('元のエラーを保持する', () => {
      const originalError = new Error('Rate limit exceeded')
      const error = new ClaudeAPIError('Claude API failed', originalError)

      expect(error.originalError).toBe(originalError)
    })
  })
})
