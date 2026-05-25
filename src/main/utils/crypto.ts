import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16
const SALT_LENGTH = 32
const PBKDF2_ITERATIONS = 100000

export function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
}

export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH)
}

export function encrypt(text: string, key: Buffer): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

export function decrypt(encrypted: string, key: Buffer, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function encryptObject(obj: object, key: Buffer): string {
  const json = JSON.stringify(obj)
  const { encrypted, iv, tag } = encrypt(json, key)
  return JSON.stringify({ encrypted, iv, tag })
}

export function decryptObject(encryptedJson: string, key: Buffer): object {
  const { encrypted, iv, tag } = JSON.parse(encryptedJson)
  const json = decrypt(encrypted, key, iv, tag)
  return JSON.parse(json)
}
