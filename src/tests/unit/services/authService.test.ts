import { encrypt } from '../../../utils/cryptoApiKey'
import { verifySecret } from '../../../services/authService'

describe('authService', () => {
  const masterPassword = 'secure-master-password'
  const secretToken = 'my-secret-token'

  const originalEnv = process.env

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      SECRET_TOKEN: secretToken,
      MASTER_PW: masterPassword,
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      NOTION_TOKEN: 'test-notion-token',
      NOTION_DAILY_NOTE_DB_ID: 'test-daily-note-db-id',
      NOTION_TASK_DB_ID: 'test-task-db-id',
      CRYPTO_ALGORITHM: 'aes-256-gcm',
      CRYPTO_IV_LENGTH: '16',
      CRYPTO_SALT_LENGTH: '64',
      CRYPTO_TAG_LENGTH: '16',
      CRYPTO_KEY_LENGTH: '32',
      CRYPTO_ITERATIONS: '100000',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('verifySecret', () => {
    it('正しい認証情報の場合 true を返す', () => {
      const encryptedApiKey = encrypt(secretToken, masterPassword)

      const result = verifySecret(encryptedApiKey)

      expect(result).toBe(true)
    })

    it('異なるsecretTokenで暗号化されたキーでは false を返す', () => {
      const wrongToken = 'wrong-token'
      const encryptedApiKey = encrypt(wrongToken, masterPassword)

      const result = verifySecret(encryptedApiKey)

      expect(result).toBe(false)
    })

    it('異なるmasterPasswordで暗号化されたキーでは false を返す', () => {
      const wrongPassword = 'wrong-password'
      const encryptedApiKey = encrypt(secretToken, wrongPassword)

      const result = verifySecret(encryptedApiKey)

      expect(result).toBe(false)
    })

    it('不正な暗号化データでは false を返す', () => {
      const invalidEncryptedApiKey = 'invalid-encrypted-data'

      const result = verifySecret(invalidEncryptedApiKey)

      expect(result).toBe(false)
    })

    it('空文字列のencryptedApiKeyでは false を返す', () => {
      const result = verifySecret('')

      expect(result).toBe(false)
    })
  })
})
