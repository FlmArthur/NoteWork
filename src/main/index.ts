import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron'
import fs from 'fs'
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
let tray: Tray | null = null
let isQuitting = false
let isClosePromptOpen = false

type ClosePreference = 'tray' | 'quit'
type ClosePreferenceSetting = ClosePreference | 'ask'

const trayIconDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAO0lEQVR4nGNQTX79nxLMMLgMQAboCnHJ4TQAXSFZBiArHjgDYBpINoCQgUTHwsAbQCh6qZuQBj4vkIMBbnDnF2VGC4kAAAAASUVORK5CYII='

function showMainWindow(): void {
  if (!mainWindow) {
    createWindow()
  }

  if (mainWindow?.isMinimized()) {
    mainWindow.restore()
  }
  mainWindow?.show()
  mainWindow?.focus()
}

function createTray(): void {
  if (tray) return

  const icon = nativeImage.createFromDataURL(trayIconDataUrl)
  tray = new Tray(icon)
  tray.setToolTip('NoteWorks')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '\u6253\u5f00 NoteWorks', click: showMainWindow },
    { type: 'separator' },
    {
      label: '\u9000\u51fa',
      click: () => {
        quitApp()
      }
    }
  ]))
  tray.on('click', showMainWindow)
  tray.on('double-click', showMainWindow)
}

function getClosePreferencePath(): string {
  return path.join(app.getPath('userData'), 'window-preferences.json')
}

function readClosePreference(): ClosePreference | null {
  try {
    const data = JSON.parse(fs.readFileSync(getClosePreferencePath(), 'utf8')) as {
      closeAction?: ClosePreference
    }
    return data.closeAction === 'tray' || data.closeAction === 'quit' ? data.closeAction : null
  } catch {
    return null
  }
}

function writeClosePreference(closeAction: ClosePreference): void {
  fs.mkdirSync(path.dirname(getClosePreferencePath()), { recursive: true })
  fs.writeFileSync(getClosePreferencePath(), JSON.stringify({ closeAction }, null, 2))
}

function clearClosePreference(): void {
  try {
    fs.rmSync(getClosePreferencePath(), { force: true })
  } catch {
    // Ignore preference cleanup failures; the close prompt can still be shown.
  }
}

function getClosePreferenceSetting(): ClosePreferenceSetting {
  return readClosePreference() ?? 'ask'
}

function setClosePreferenceSetting(closeAction: ClosePreferenceSetting): void {
  if (closeAction === 'ask') {
    clearClosePreference()
    return
  }

  writeClosePreference(closeAction)
}

function quitApp(): void {
  isQuitting = true
  app.quit()
}

function requestCloseAction(): void {
  if (!mainWindow || isClosePromptOpen) return
  isClosePromptOpen = true
  mainWindow.webContents.send('window:close-request')
}

function applyCloseAction(closeAction: ClosePreference, remember: boolean): void {
  isClosePromptOpen = false
  if (remember) writeClosePreference(closeAction)

  if (closeAction === 'tray') {
    mainWindow?.hide()
    return
  }

  quitApp()
}

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
  mainWindow.on('close', (event) => {
    if (isQuitting) return

    const closePreference = readClosePreference()
    if (closePreference === 'tray') {
      event.preventDefault()
      mainWindow?.hide()
      return
    }

    if (closePreference === 'quit') {
      isQuitting = true
      return
    }

    event.preventDefault()
    requestCloseAction()
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })

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
  ipcMain.handle('window:apply-close-action', (_event, closeAction: ClosePreference, remember: boolean) => {
    applyCloseAction(closeAction, remember)
  })
  ipcMain.handle('window:get-close-preference', () => getClosePreferenceSetting())
  ipcMain.handle('window:set-close-preference', (_event, closeAction: ClosePreferenceSetting) => {
    setClosePreferenceSetting(closeAction)
  })
  ipcMain.on('window:cancel-close-action', () => {
    isClosePromptOpen = false
  })
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
  createTray()

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

app.on('before-quit', () => {
  isQuitting = true
})
