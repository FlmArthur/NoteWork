import { getDatabase, initGlobalDb, initUserDatabase } from '../db/connection'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { deriveKey, generateSalt } from '../utils/crypto'

interface User {
  id: string
  username: string
  password: string
  salt: string
  created_at: string
  updated_at: string
}

let encryptionKey: Buffer | null = null
let currentUserId: string | null = null

export function getEncryptionKey(): Buffer | null {
  return encryptionKey
}

export function getCurrentUserId(): string | null {
  return currentUserId
}

export function register(username: string, password: string): { success: boolean; userId?: string; error?: string } {
  // Global DB holds user accounts
  initGlobalDb()
  const db = getDatabase()

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) {
    return { success: false, error: '用户名已存在' }
  }

  const id = uuidv4()
  const salt = generateSalt().toString('hex')
  const passwordHash = bcrypt.hashSync(password, 12)

  db.prepare(`
    INSERT INTO users (id, username, password, salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
  `).run(id, username, passwordHash, salt)

  // Create user data DB and switch to it
  initUserDatabase(id)
  currentUserId = id
  const keySalt = Buffer.from(salt, 'hex')
  encryptionKey = deriveKey(password, keySalt)

  return { success: true, userId: id }
}

export function login(username: string, password: string): { success: boolean; userId?: string; error?: string } {
  // Read from global DB
  initGlobalDb()
  const db = getDatabase()

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined
  if (!user) {
    return { success: false, error: '用户名或密码错误' }
  }

  const valid = bcrypt.compareSync(password, user.password)
  if (!valid) {
    return { success: false, error: '用户名或密码错误' }
  }

  // Switch to user data DB
  initUserDatabase(user.id)
  currentUserId = user.id
  const salt = Buffer.from(user.salt, 'hex')
  encryptionKey = deriveKey(password, salt)

  return { success: true, userId: user.id }
}

export function logout(): void {
  encryptionKey = null
  currentUserId = null
  // Re-open global DB for next login
  initGlobalDb()
}

export function changePassword(userId: string, oldPassword: string, newPassword: string): { success: boolean; error?: string } {
  // Switch to global DB for password change
  initGlobalDb()
  const db = getDatabase()

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined
  if (!user) {
    return { success: false, error: '用户不存在' }
  }

  const valid = bcrypt.compareSync(oldPassword, user.password)
  if (!valid) {
    // Switch back to user DB
    initUserDatabase(userId)
    return { success: false, error: '原密码错误' }
  }

  const newSalt = generateSalt().toString('hex')
  const newHash = bcrypt.hashSync(newPassword, 12)

  db.prepare('UPDATE users SET password = ?, salt = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
    .run(newHash, newSalt, userId)

  // Switch back to user data DB
  initUserDatabase(userId)
  const keySalt = Buffer.from(newSalt, 'hex')
  encryptionKey = deriveKey(newPassword, keySalt)

  return { success: true }
}
