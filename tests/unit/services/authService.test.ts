// 環境変数を設定（テスト用）
process.env.SECRET_TOKEN = 'test-secret'
process.env.MASTER_PW = 'test-master-pw'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.NOTION_TOKEN = 'test-notion-token'
process.env.NOTION_DAILY_NOTE_DB_ID = 'test-daily-note-db-id'
process.env.CRYPTO_ALGORITHM = 'aes-256-gcm'
process.env.CRYPTO_IV_LENGTH = '16'
process.env.CRYPTO_SALT_LENGTH = '64'
process.env.CRYPTO_TAG_LENGTH = '16'
process.env.CRYPTO_KEY_LENGTH = '32'
process.env.CRYPTO_ITERATIONS = '100000'

import { encrypt } from '../../../src/utils/cryptoApiKey'
import { verifySecret } from '../../../src/services/authService'

describe('authService', () => {
  const masterPassword = 'secure-master-password'
  const secretToken = 'my-secret-token'

  describe('verifySecret', () => {
    it('正しい認証情報の場合 true を返す', () => {
      const encryptedApiKey = encrypt(secretToken, masterPassword)

      const result = verifySecret(encryptedApiKey, masterPassword, secretToken)

      expect(result).toBe(true)
    })

    it('異なるsecretTokenでは false を返す', () => {
      const encryptedApiKey = encrypt(secretToken, masterPassword)
      const wrongToken = 'wrong-token'

      const result = verifySecret(encryptedApiKey, masterPassword, wrongToken)

      expect(result).toBe(false)
    })

    it('異なるmasterPasswordでは false を返す', () => {
      const encryptedApiKey = encrypt(secretToken, masterPassword)
      const wrongPassword = 'wrong-password'

      const result = verifySecret(encryptedApiKey, wrongPassword, secretToken)

      expect(result).toBe(false)
    })

    it('不正な暗号化データでは false を返す', () => {
      const invalidEncryptedApiKey = 'invalid-encrypted-data'

      const result = verifySecret(invalidEncryptedApiKey, masterPassword, secretToken)

      expect(result).toBe(false)
    })

    it('空文字列のencryptedApiKeyでは false を返す', () => {
      const result = verifySecret('', masterPassword, secretToken)

      expect(result).toBe(false)
    })
  })
})
