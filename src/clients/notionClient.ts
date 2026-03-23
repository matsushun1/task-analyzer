import { Client } from '@notionhq/client'

export class NotionClient {
  readonly inner: Client
  readonly token: string

  constructor(token: string) {
    this.token = token
    this.inner = new Client({ auth: token })
  }
}
