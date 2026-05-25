import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export function getUserDataPath(...segments: string[]): string {
  const base = app.getPath('userData')
  return path.join(base, ...segments)
}

export function copyFile(src: string, dest: string): void {
  fs.copyFileSync(src, dest)
}

export function copyDir(src: string, dest: string): void {
  ensureDir(dest)
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFile(srcPath, destPath)
    }
  }
}

export function removeDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true })
  }
}

export function getFileSize(filePath: string): number {
  return fs.statSync(filePath).size
}
