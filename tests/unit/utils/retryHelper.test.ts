import { withRetry } from '../../../src/utils/retryHelper'

describe('retryHelper', () => {
  describe('withRetry', () => {
    it('成功した場合はリトライせずに結果を返す', async () => {
      const fn = jest.fn().mockResolvedValue('success')

      const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('1回失敗後に成功した場合は2回目で結果を返す', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValue('success')

      const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('2回失敗後に成功した場合は3回目で結果を返す', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('maxAttemptsを超えた場合は最後のエラーをthrowする', async () => {
      const error = new Error('always fails')
      const fn = jest.fn().mockRejectedValue(error)

      await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toThrow(
        'always fails'
      )

      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('デフォルト設定（maxAttempts=3, baseDelayMs=1000）で動作する', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')

      const result = await withRetry(fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('遅延時間がexponential backoff（1x, 2x, 3x）になる', async () => {
      jest.useFakeTimers()

      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 })

      // 1回目の失敗
      await jest.advanceTimersByTimeAsync(0)
      expect(fn).toHaveBeenCalledTimes(1)

      // 1秒後（1 * 100ms）に2回目
      await jest.advanceTimersByTimeAsync(100)
      expect(fn).toHaveBeenCalledTimes(2)

      // 2秒後（2 * 100ms）に3回目
      await jest.advanceTimersByTimeAsync(200)
      expect(fn).toHaveBeenCalledTimes(3)

      const result = await promise
      expect(result).toBe('success')

      jest.useRealTimers()
    })

    it('ジェネリクス型で型安全に動作する', async () => {
      interface Result {
        id: string
        value: number
      }

      const fn = jest.fn().mockResolvedValue({ id: 'test', value: 42 })

      const result: Result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })

      expect(result.id).toBe('test')
      expect(result.value).toBe(42)
    })
  })
})
