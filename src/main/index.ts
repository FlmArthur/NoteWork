import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'path'
import { initGlobalDb, initUserDatabase, closeDatabase } from './db/connection'
import { registerAuthIpc } from './ipc/auth.ipc'
import { registerNotebookIpc } from './ipc/notebook.ipc'
import { registerDocumentIpc } from './ipc/document.ipc'
import { registerCalendarIpc } from './ipc/calendar.ipc'
import { registerTaskIpc } from './ipc/task.ipc'
import { registerReportIpc } from './ipc/report.ipc'
import { registerBackupIpc } from './ipc/backup.ipc'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 580,
    minWidth: 460,
    minHeight: 580,
    resizable: false,
    frame: false,
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hidden' } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Handle title bar actions
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false))

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  Menu.setApplicationMenu(null)
}

function registerWindowControls(): void {
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())
  ipcMain.on('window:show-login', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    mainWindow.setResizable(false)
    mainWindow.setMinimumSize(460, 580)
    mainWindow.setSize(460, 580)
    mainWindow.center()
  })
  ipcMain.on('window:show-main', () => {
    if (!mainWindow) return
    mainWindow.setResizable(true)
    mainWindow.setMinimumSize(1024, 680)
    mainWindow.setSize(1400, 900)
    mainWindow.center()
  })
}

function registerAllIpc(): void {
  registerAuthIpc()
  registerNotebookIpc()
  registerDocumentIpc()
  registerCalendarIpc()
  registerTaskIpc()
  registerReportIpc()
  registerBackupIpc()
  registerWindowControls()
}

app.whenReady().then(() => {
  initGlobalDb()  // Initialize with users table for auth
  registerAllIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
