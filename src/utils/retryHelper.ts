import { logger } from './logger'

interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number // 各試行の遅延: attempt * baseDelayMs
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> => {
  const { maxAttempts, baseDelayMs } = { ...DEFAULT_OPTIONS, ...options }

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        const delayMs = attempt * baseDelayMs // 1秒, 2秒, 3秒
        logger.warn(`Attempt ${attempt}/${maxAttempts} failed. Retrying in ${delayMs}ms...`)
        await sleep(delayMs)
      }
    }
  }

  throw lastError
}
