import Anthropic from '@anthropic-ai/sdk'

export class ClaudeClient {
  readonly inner: Anthropic

  constructor(apiKey: string) {
    this.inner = new Anthropic({ apiKey })
  }
}
