interface Environment {
  secretToken: string
  masterPassword: string
  anthropicApiKey: string
  notionToken: string
  notionTaskDatabaseId: string
  notionDailyNoteDatabaseId: string
  cryptoAlgorithm: string
  cryptoIvLength: number
  cryptoSaltLength: number
  cryptoTagLength: number
  cryptoKeyLength: number
  cryptoIterations: number
}

const requireEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

const requireEnvInt = (key: string): number => parseInt(requireEnv(key), 10)

export interface CryptoConfig {
  algorithm: string
  ivLength: number
  saltLength: number
  tagLength: number
  keyLength: number
  iterations: number
}

export const getCryptoConfig = (): CryptoConfig => ({
  algorithm: requireEnv('CRYPTO_ALGORITHM'),
  ivLength: requireEnvInt('CRYPTO_IV_LENGTH'),
  saltLength: requireEnvInt('CRYPTO_SALT_LENGTH'),
  tagLength: requireEnvInt('CRYPTO_TAG_LENGTH'),
  keyLength: requireEnvInt('CRYPTO_KEY_LENGTH'),
  iterations: requireEnvInt('CRYPTO_ITERATIONS'),
})

export const getEnvironment = (): Environment => ({
  secretToken: requireEnv('SECRET_TOKEN'),
  masterPassword: requireEnv('MASTER_PW'),
  anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
  notionToken: requireEnv('NOTION_TOKEN'),
  notionTaskDatabaseId: requireEnv('NOTION_TASK_DB_ID'),
  notionDailyNoteDatabaseId: requireEnv('NOTION_DAILY_NOTE_DB_ID'),
  cryptoAlgorithm: requireEnv('CRYPTO_ALGORITHM'),
  cryptoIvLength: requireEnvInt('CRYPTO_IV_LENGTH'),
  cryptoSaltLength: requireEnvInt('CRYPTO_SALT_LENGTH'),
  cryptoTagLength: requireEnvInt('CRYPTO_TAG_LENGTH'),
  cryptoKeyLength: requireEnvInt('CRYPTO_KEY_LENGTH'),
  cryptoIterations: requireEnvInt('CRYPTO_ITERATIONS'),
})
