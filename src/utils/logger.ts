type LogLevel = 'INFO' | 'WARN' | 'ERROR'

const formatMessage = (level: LogLevel, message: string): string => {
  const timestamp = new Date().toISOString()
  return `[${level}] ${timestamp} ${message}`
}

export const logger = {
  info: (message: string): void => {
    console.log(formatMessage('INFO', message))
  },
  warn: (message: string): void => {
    console.warn(formatMessage('WARN', message))
  },
  error: (message: string, error?: unknown): void => {
    const errorDetail =
      error instanceof Error
        ? `: ${error.message}`
        : error !== undefined
          ? `: ${String(error)}`
          : ''
    const getOriginalError = (e: unknown): unknown =>
      e instanceof Error && 'originalError' in e ? (e as { originalError: unknown }).originalError : undefined

    const originalError = getOriginalError(error)
    const causeDetail =
      originalError instanceof Error && 'cause' in originalError && originalError.cause !== undefined
        ? ` [cause: ${String(originalError.cause)}]`
        : ''
    const originalDetail =
      originalError !== undefined
        ? ` (caused by: ${originalError instanceof Error ? originalError.message : String(originalError)}${causeDetail})`
        : ''
    console.error(formatMessage('ERROR', `${message}${errorDetail}${originalDetail}`))
  },
}
