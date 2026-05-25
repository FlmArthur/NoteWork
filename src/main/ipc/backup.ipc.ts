import { ipcMain, dialog, BrowserWindow } from 'electron'
import { createBackup, restoreBackup } from '../services/backup.service'

export function registerBackupIpc(): void {
  ipcMain.handle('backup:create', async (_event, userId: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: '选择备份目录',
      defaultPath: `NoteWorks_Backup_${new Date().toISOString().slice(0, 10)}`,
      properties: ['createDirectory']
    })

    if (!result.canceled && result.filePath) {
      const backupResult = createBackup(userId, result.filePath)
      return { success: true, ...backupResult }
    }
    return { success: false }
  })

  ipcMain.handle('backup:restore', async (_event, userId: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: '选择备份目录',
      properties: ['openDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const restoreResult = restoreBackup(userId, result.filePaths[0])
      return restoreResult
    }
    return { success: false }
  })

  ipcMain.handle('backup:get-settings', (_event, _userId: string) => {
    return { autoBackup: false, intervalDays: 7, backupPath: '' }
  })

  ipcMain.handle('backup:set-settings', (_event, _userId: string, settings: { autoBackup: boolean; intervalDays: number; backupPath: string }) => {
    return { success: true, ...settings }
  })
}
