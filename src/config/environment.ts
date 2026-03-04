interface Environment {
  secretToken: string
  masterPassword: string
  anthropicApiKey: string
  notionToken: string
}

const requireEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const getEnvironment = (): Environment => ({
  secretToken: requireEnv('SECRET_TOKEN'),
  masterPassword: requireEnv('MASTER_PW'),
  anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
  notionToken: requireEnv('NOTION_TOKEN'),
})
