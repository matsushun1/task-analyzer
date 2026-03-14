import crypto from 'crypto'
import { getCryptoConfig } from '../config/environment'

function deriveKey(password: string, salt: Buffer, keyLength: number, iterations: number): Buffer {
  return crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha512')
}

/**
 * APIキーを暗号化
 * @param apiKey - 暗号化するAPIキー
 * @param masterPassword - マスターパスワード
 * @returns Base64エンコードされた暗号化文字列
 */
export function encrypt(apiKey: string, masterPassword: string): string {
  const env = getCryptoConfig()

  const salt = crypto.randomBytes(env.saltLength)
  const iv = crypto.randomBytes(env.ivLength)
  const key = deriveKey(masterPassword, salt, env.keyLength, env.iterations)

  const cipher = crypto.createCipheriv(env.algorithm, key, iv) as crypto.CipherGCM
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const tag = cipher.getAuthTag()

  const result = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')])

  return result.toString('base64')
}

/**
 * 暗号化されたAPIキーを復号
 * @param encryptedData - Base64エンコードされた暗号化文字列
 * @param masterPassword - マスターパスワード
 * @returns 復号されたAPIキー
 */
export function decrypt(encryptedData: string, masterPassword: string): string {
  const env = getCryptoConfig()

  const buffer = Buffer.from(encryptedData, 'base64')

  const salt = buffer.subarray(0, env.saltLength)
  const iv = buffer.subarray(env.saltLength, env.saltLength + env.ivLength)
  const tag = buffer.subarray(
    env.saltLength + env.ivLength,
    env.saltLength + env.ivLength + env.tagLength
  )
  const encrypted = buffer.subarray(
    env.saltLength + env.ivLength + env.tagLength
  )

  const key = deriveKey(masterPassword, salt, env.keyLength, env.iterations)

  const decipher = crypto.createDecipheriv(env.algorithm, key, iv) as crypto.DecipherGCM
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
