import crypto from 'crypto'
import { getEnvironment } from '../config/environment'

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
  const env = getEnvironment()

  const salt = crypto.randomBytes(env.cryptoSaltLength)
  const iv = crypto.randomBytes(env.cryptoIvLength)
  const key = deriveKey(masterPassword, salt, env.cryptoKeyLength, env.cryptoIterations)

  const cipher = crypto.createCipheriv(env.cryptoAlgorithm, key, iv) as crypto.CipherGCM
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
  const env = getEnvironment()

  const buffer = Buffer.from(encryptedData, 'base64')

  const salt = buffer.subarray(0, env.cryptoSaltLength)
  const iv = buffer.subarray(env.cryptoSaltLength, env.cryptoSaltLength + env.cryptoIvLength)
  const tag = buffer.subarray(
    env.cryptoSaltLength + env.cryptoIvLength,
    env.cryptoSaltLength + env.cryptoIvLength + env.cryptoTagLength
  )
  const encrypted = buffer.subarray(
    env.cryptoSaltLength + env.cryptoIvLength + env.cryptoTagLength
  )

  const key = deriveKey(masterPassword, salt, env.cryptoKeyLength, env.cryptoIterations)

  const decipher = crypto.createDecipheriv(env.cryptoAlgorithm, key, iv) as crypto.DecipherGCM
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
