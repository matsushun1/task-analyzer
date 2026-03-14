import crypto from 'crypto'
import { decrypt } from '../utils/cryptoApiKey'
import { getEnvironment } from '../config/environment'

export const verifySecret = (encryptedApiKey: string): boolean => {
  try {
    const env = getEnvironment()
    const decrypted = decrypt(encryptedApiKey, env.masterPassword)
    const decryptedBuf = Buffer.from(decrypted)
    const secretBuf = Buffer.from(env.secretToken)
    if (decryptedBuf.length !== secretBuf.length) {
      return false
    }
    return crypto.timingSafeEqual(decryptedBuf, secretBuf)
  } catch {
    return false
  }
}
