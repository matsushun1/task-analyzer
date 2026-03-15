import * as dotenv from 'dotenv'
dotenv.config()
import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env['ANTHROPIC_API_KEY']
if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

const client = new Anthropic({ apiKey })

client.messages
  .create({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{ role: 'user', content: 'テスト' }],
  })
  .then((r) => console.log('OK:', JSON.stringify(r.content[0])))
  .catch((e: unknown) => {
    const err = e as { status?: number; message?: string; error?: unknown }
    console.error('status:', err.status)
    console.error('message:', err.message)
    console.error('error body:', JSON.stringify(err.error))
  })
