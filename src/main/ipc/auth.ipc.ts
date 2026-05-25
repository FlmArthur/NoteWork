import { ipcMain } from 'electron'
import { register, login, logout, changePassword } from '../services/auth.service'

export function registerAuthIpc(): void {
  ipcMain.handle('auth:register', (_event, username: string, password: string) => {
    return register(username, password)
  })

  ipcMain.handle('auth:login', (_event, username: string, password: string) => {
    return login(username, password)
  })

  ipcMain.handle('auth:logout', () => {
    logout()
    return { success: true }
  })

  ipcMain.handle('auth:change-password', (_event, userId: string, oldPwd: string, newPwd: string) => {
    return changePassword(userId, oldPwd, newPwd)
  })
}
