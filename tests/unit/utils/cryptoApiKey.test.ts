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

import { encrypt, decrypt, generateApiKey } from '../../../src/utils/cryptoApiKey'

describe('cryptoApiKey', () => {
  const testApiKey = 'test-api-key-12345'
  const masterPassword = 'secure-master-password'

  describe('encrypt', () => {
    it('暗号化された文字列をBase64形式で返す', () => {
      const encrypted = encrypt(testApiKey, masterPassword)

      expect(typeof encrypted).toBe('string')
      expect(encrypted.length).toBeGreaterThan(0)
      // Base64形式であることを確認
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow()
    })

    it('同じ入力でも毎回異なる暗号化結果を生成する（ランダムなソルトとIV）', () => {
      const encrypted1 = encrypt(testApiKey, masterPassword)
      const encrypted2 = encrypt(testApiKey, masterPassword)

      expect(encrypted1).not.toBe(encrypted2)
    })
  })

  describe('decrypt', () => {
    it('暗号化された文字列を正しく復号する', () => {
      const encrypted = encrypt(testApiKey, masterPassword)
      const decrypted = decrypt(encrypted, masterPassword)

      expect(decrypted).toBe(testApiKey)
    })

    it('異なるマスターパスワードでは復号に失敗する', () => {
      const encrypted = encrypt(testApiKey, masterPassword)
      const wrongPassword = 'wrong-password'

      expect(() => decrypt(encrypted, wrongPassword)).toThrow()
    })

    it('不正な暗号化データでは復号に失敗する', () => {
      const invalidData = 'invalid-base64-data'

      expect(() => decrypt(invalidData, masterPassword)).toThrow()
    })

    it('暗号文が1バイト改ざんされた場合はGCM認証エラーでthrowする', () => {
      const encrypted = encrypt(testApiKey, masterPassword)
      const buffer = Buffer.from(encrypted, 'base64')
      // 暗号文部分（salt+iv+tag = 64+16+16 = 96バイト以降）の最後のバイトを反転
      buffer[buffer.length - 1] ^= 0x01
      const tampered = buffer.toString('base64')

      expect(() => decrypt(tampered, masterPassword)).toThrow()
    })

    it('バッファがヘッダサイズより短い場合はthrowする', () => {
      // salt(64)+iv(16)+tag(16) = 96バイト未満の短いデータ
      const tooShort = Buffer.alloc(10).toString('base64')

      expect(() => decrypt(tooShort, masterPassword)).toThrow()
    })
  })

  describe('encrypt/decrypt ラウンドトリップ', () => {
    it('様々な文字列で暗号化・復号が正しく動作する', () => {
      const testCases = [
        'simple-key',
        'key-with-special-chars-!@#$%^&*()',
        '日本語のAPIキー',
        'very-long-key-'.repeat(10),
        '',
      ]

      testCases.forEach((apiKey) => {
        const encrypted = encrypt(apiKey, masterPassword)
        const decrypted = decrypt(encrypted, masterPassword)

        expect(decrypted).toBe(apiKey)
      })
    })

    it('異なるマスターパスワードでそれぞれ暗号化・復号できる', () => {
      const password1 = 'password-1'
      const password2 = 'password-2'

      const encrypted1 = encrypt(testApiKey, password1)
      const encrypted2 = encrypt(testApiKey, password2)

      expect(encrypted1).not.toBe(encrypted2)
      expect(decrypt(encrypted1, password1)).toBe(testApiKey)
      expect(decrypt(encrypted2, password2)).toBe(testApiKey)
    })
  })

  describe('generateApiKey', () => {
    it('UUID形式の文字列を生成する', () => {
      const apiKey = generateApiKey()

      expect(typeof apiKey).toBe('string')
      // UUID v4 形式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(apiKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    })

    it('呼び出すたびに異なるUUIDを生成する', () => {
      const apiKey1 = generateApiKey()
      const apiKey2 = generateApiKey()

      expect(apiKey1).not.toBe(apiKey2)
    })
  })
})
