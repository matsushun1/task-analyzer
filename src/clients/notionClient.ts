import { Client } from '@notionhq/client'

export class NotionClient {
  readonly inner: Client

  constructor(token: string) {
    this.inner = new Client({ auth: token })
  }
}
