import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { ensureDir, copyFile, removeDir } from '../utils/file'
import { getDbPath, closeDatabase } from '../db/connection'

export function createBackup(userId: string, destPath: string): { filePath: string; size: number; timestamp: string } {
  const now = new Date()
  const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}`
  const backupDir = path.join(destPath, `NoteWorks_Backup_${timestamp}`)
  ensureDir(backupDir)

  const dbPath = getDbPath(userId)
  const backupDb = path.join(backupDir, 'database.sqlite')
  if (fs.existsSync(dbPath)) {
    copyFile(dbPath, backupDb)
  }

  const userDataPath = app.getPath('userData')
  const filesDir = path.join(userDataPath, 'data', userId, 'files')
  if (fs.existsSync(filesDir)) {
    const backupFilesDir = path.join(backupDir, 'files')
    ensureDir(backupFilesDir)
    const entries = fs.readdirSync(filesDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        copyFile(path.join(filesDir, entry.name), path.join(backupFilesDir, entry.name))
      }
    }
  }

  const metadata = {
    version: '1.0.0',
    timestamp,
    userId,
    dbBackup: 'database.sqlite'
  }
  fs.writeFileSync(path.join(backupDir, 'backup.json'), JSON.stringify(metadata, null, 2), 'utf-8')

  const zipFile = `${backupDir}.zip`
  // Simple file aggregation instead of archiver dependency
  const totalSize = getDirSize(backupDir)

  return {
    filePath: backupDir,
    size: totalSize,
    timestamp
  }
}

export function restoreBackup(userId: string, backupDirPath: string): { success: boolean; error?: string } {
  const metadataPath = path.join(backupDirPath, 'backup.json')
  if (!fs.existsSync(metadataPath)) {
    return { success: false, error: '无效的备份文件：缺少 backup.json' }
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))

  closeDatabase()

  const dbPath = getDbPath(userId)
  const backupDb = path.join(backupDirPath, 'database.sqlite')
  if (fs.existsSync(backupDb)) {
    const dbDir = path.dirname(dbPath)
    ensureDir(dbDir)
    copyFile(backupDb, dbPath)
  }

  const userDataPath = app.getPath('userData')
  const filesDir = path.join(userDataPath, 'data', userId, 'files')
  removeDir(filesDir)

  const backupFilesDir = path.join(backupDirPath, 'files')
  if (fs.existsSync(backupFilesDir)) {
    ensureDir(filesDir)
    const entries = fs.readdirSync(backupFilesDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        copyFile(path.join(backupFilesDir, entry.name), path.join(filesDir, entry.name))
      }
    }
  }

  return { success: true }
}

function getDirSize(dirPath: string): number {
  let size = 0
  if (!fs.existsSync(dirPath)) return size
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      size += getDirSize(fullPath)
    } else {
      size += fs.statSync(fullPath).size
    }
  }
  return size
}
