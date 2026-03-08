import crypto from 'crypto'
import { decrypt } from '../utils/cryptoApiKey'

export const verifySecret = (encryptedApiKey: string, masterPassword: string, secretToken: string): boolean => {
  try {
    const decrypted = decrypt(encryptedApiKey, masterPassword)
    const decryptedBuf = Buffer.from(decrypted)
    const secretBuf = Buffer.from(secretToken)
    if (decryptedBuf.length !== secretBuf.length) {
      return false
    }
    return crypto.timingSafeEqual(decryptedBuf, secretBuf)
  } catch {
    return false
  }
}
