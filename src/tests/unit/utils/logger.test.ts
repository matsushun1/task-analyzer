import { logger } from '../../../utils/logger'

describe('logger', () => {
  let consoleLogSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('info', () => {
    it('[INFO]プレフィックス付きでログ出力する', () => {
      logger.info('Test info message')

      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
      const output = consoleLogSpy.mock.calls[0][0]
      expect(output).toContain('[INFO]')
      expect(output).toContain('Test info message')
    })

    it('タイムスタンプを含む', () => {
      logger.info('Test message')

      const output = consoleLogSpy.mock.calls[0][0]
      // ISO 8601形式のタイムスタンプを含むことを確認
      expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('warn', () => {
    it('[WARN]プレフィックス付きでログ出力する', () => {
      logger.warn('Test warning')

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      const output = consoleWarnSpy.mock.calls[0][0]
      expect(output).toContain('[WARN]')
      expect(output).toContain('Test warning')
    })
  })

  describe('error', () => {
    it('[ERROR]プレフィックス付きでログ出力する', () => {
      logger.error('Test error')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('[ERROR]')
      expect(output).toContain('Test error')
    })

    it('Errorオブジェクトのメッセージを含む', () => {
      const error = new Error('Something went wrong')
      logger.error('Failed to process', error)

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('Failed to process')
      expect(output).toContain('Something went wrong')
    })

    it('エラーなしでも正常に動作する', () => {
      logger.error('Error without details')

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('Error without details')
      // エラー詳細（": <detail>"形式）が付加されていないことを確認
      expect(output).not.toMatch(/Error without details:.+/)
    })

    it('文字列型のエラーを処理する', () => {
      logger.error('Failed', 'string error')

      const output = consoleErrorSpy.mock.calls[0][0]
      expect(output).toContain('Failed')
      expect(output).toContain('string error')
    })
  })
})
