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
    console.error(formatMessage('ERROR', `${message}${errorDetail}`))
  },
}
