interface Environment {
  secretToken: string
  masterPassword: string
  anthropicApiKey: string
  notionToken: string
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

export const getEnvironment = (): Environment => ({
  secretToken: requireEnv('SECRET_TOKEN'),
  masterPassword: requireEnv('MASTER_PW'),
  anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
  notionToken: requireEnv('NOTION_TOKEN'),
  cryptoAlgorithm: requireEnv('CRYPTO_ALGORITHM'),
  cryptoIvLength: requireEnvInt('CRYPTO_IV_LENGTH'),
  cryptoSaltLength: requireEnvInt('CRYPTO_SALT_LENGTH'),
  cryptoTagLength: requireEnvInt('CRYPTO_TAG_LENGTH'),
  cryptoKeyLength: requireEnvInt('CRYPTO_KEY_LENGTH'),
  cryptoIterations: requireEnvInt('CRYPTO_ITERATIONS'),
})
