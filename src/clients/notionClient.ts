import { Client } from '@notionhq/client'

export class NotionClient {
  readonly inner: Client
  readonly token: string

  constructor(token: string) {
    this.token = token
    this.inner = new Client({ auth: token })
  }

  async queryDatabase(databaseId: string, filter: Record<string, unknown>): Promise<unknown[]> {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filter }),
    })
    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status} ${await response.text()}`)
    }
    const data = (await response.json()) as { results: unknown[] }
    return data.results
  }
}
