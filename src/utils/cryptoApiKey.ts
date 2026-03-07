import crypto from 'crypto'
import 'dotenv/config'

// 暗号化アルゴリズム（環境変数から読み込み）
const ALGORITHM = process.env.CRYPTO_ALGORITHM as string
const IV_LENGTH = parseInt(process.env.CRYPTO_IV_LENGTH as string, 10)
const SALT_LENGTH = parseInt(process.env.CRYPTO_SALT_LENGTH as string, 10)
const TAG_LENGTH = parseInt(process.env.CRYPTO_TAG_LENGTH as string, 10)
const KEY_LENGTH = parseInt(process.env.CRYPTO_KEY_LENGTH as string, 10)
const ITERATIONS = parseInt(process.env.CRYPTO_ITERATIONS as string, 10)

/**
 * パスワードから暗号化キーを導出
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512')
}

/**
 * APIキーを暗号化
 * @param apiKey - 暗号化するAPIキー
 * @param masterPassword - マスターパスワード
 * @returns Base64エンコードされた暗号化文字列
 */
export function encrypt(apiKey: string, masterPassword: string): string {
  // ランダムなソルトとIVを生成
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)

  // パスワードから暗号化キーを導出
  const key = deriveKey(masterPassword, salt)

  // 暗号化
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  // 認証タグを取得
  const tag = cipher.getAuthTag()

  // salt + iv + tag + encrypted を結合してBase64エンコード
  const result = Buffer.concat([
    salt,
    iv,
    tag,
    Buffer.from(encrypted, 'hex'),
  ])

  return result.toString('base64')
}

/**
 * 暗号化されたAPIキーを復号
 * @param encryptedData - Base64エンコードされた暗号化文字列
 * @param masterPassword - マスターパスワード
 * @returns 復号されたAPIキー
 */
export function decrypt(encryptedData: string, masterPassword: string): string {
  // Base64デコード
  const buffer = Buffer.from(encryptedData, 'base64')

  // salt, iv, tag, encrypted を抽出
  const salt = buffer.subarray(0, SALT_LENGTH)
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = buffer.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  )
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  // パスワードから暗号化キーを導出
  const key = deriveKey(masterPassword, salt)

  // 復号
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * ランダムなAPIキー（UUID）を生成
 */
export function generateApiKey(): string {
  return crypto.randomUUID()
}
