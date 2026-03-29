import { Client } from '@notionhq/client'

// Notion API レートリミット: 秒間3リクエスト
const RATE_LIMIT_PER_SECOND = 3
const RETRY_MAX = 3

/**
 * トークンバケット方式のレートリミッター
 * 秒間3リクエストを超えないよう、必要に応じて待機する
 */
class RateLimiter {
  private tokens: number
  private lastRefill: number

  constructor(private readonly ratePerSecond: number) {
    this.tokens = ratePerSecond
    this.lastRefill = Date.now()
  }

  async acquire(): Promise<void> {
    for (;;) {
      this.refill()
      if (this.tokens >= 1) {
        this.tokens -= 1
        return
      }
      const msUntilNextToken = Math.ceil(1000 / this.ratePerSecond)
      await sleep(msUntilNextToken)
    }
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    const newTokens = (elapsed / 1000) * this.ratePerSecond
    this.tokens = Math.min(this.ratePerSecond, this.tokens + newTokens)
    this.lastRefill = now
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export class NotionClient {
  readonly inner: Client
  readonly token: string
  private readonly rateLimiter: RateLimiter

  constructor(token: string) {
    this.token = token
    this.inner = new Client({ auth: token })
    this.rateLimiter = new RateLimiter(RATE_LIMIT_PER_SECOND)
  }

  async queryDatabase(databaseId: string, filter: Record<string, unknown>): Promise<unknown[]> {
    const response = await this.fetchWithRateLimit(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filter }),
      }
    )
    const data = (await response.json()) as { results: unknown[] }
    return data.results
  }

  private async fetchWithRateLimit(url: string, options: RequestInit): Promise<Response> {
    for (let attempt = 0; attempt < RETRY_MAX; attempt++) {
      await this.rateLimiter.acquire()

      const response = await fetch(url, options)

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After')
        const waitMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : 1000
        await sleep(waitMs)
        continue
      }

      if (!response.ok) {
        throw new Error(`Notion API error: ${response.status} ${await response.text()}`)
      }

      return response
    }
    throw new Error(`Notion API: exceeded max retries (${RETRY_MAX}) due to rate limiting`)
  }
}
