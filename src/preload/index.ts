import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Auth
  register: (username: string, password: string) =>
    ipcRenderer.invoke('auth:register', username, password),
  login: (username: string, password: string) =>
    ipcRenderer.invoke('auth:login', username, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  changePassword: (userId: string, oldPwd: string, newPwd: string) =>
    ipcRenderer.invoke('auth:change-password', userId, oldPwd, newPwd),

  // Notebook
  listNotebooks: () => ipcRenderer.invoke('notebook:list'),
  createNotebook: (name: string, color?: string, icon?: string) =>
    ipcRenderer.invoke('notebook:create', name, color, icon),
  updateNotebook: (id: string, data: { name?: string; color?: string; icon?: string }) =>
    ipcRenderer.invoke('notebook:update', id, data),
  deleteNotebook: (id: string) => ipcRenderer.invoke('notebook:delete', id),
  reorderNotebooks: (ids: string[]) => ipcRenderer.invoke('notebook:reorder', ids),

  // Document
  listDocuments: (notebookId: string) => ipcRenderer.invoke('document:list', notebookId),
  getDocument: (id: string) => ipcRenderer.invoke('document:get', id),
  createDocument: (notebookId: string, title?: string) =>
    ipcRenderer.invoke('document:create', notebookId, title),
  saveDocument: (id: string, content: string, plainText: string) =>
    ipcRenderer.invoke('document:save', id, content, plainText),
  renameDocument: (id: string, title: string) =>
    ipcRenderer.invoke('document:rename', id, title),
  deleteDocument: (id: string) => ipcRenderer.invoke('document:delete', id),
  searchDocuments: (query: string) => ipcRenderer.invoke('document:search', query),
  reorderDocuments: (ids: string[]) => ipcRenderer.invoke('document:reorder', ids),

  // Calendar
  listCalendarNotes: (year: number, month: number) =>
    ipcRenderer.invoke('calendar:list', year, month),
  getNotesByDate: (date: string) => ipcRenderer.invoke('calendar:getByDate', date),
  createNote: (note: { date: string; title: string; content?: string; color?: string; tags?: string[] }) =>
    ipcRenderer.invoke('calendar:create', note),
  updateNote: (id: string, data: { title?: string; content?: string; color?: string; tags?: string[] }) =>
    ipcRenderer.invoke('calendar:update', id, data),
  deleteNote: (id: string) => ipcRenderer.invoke('calendar:delete', id),
  moveNote: (id: string, newDate: string) => ipcRenderer.invoke('calendar:move', id, newDate),

  // Task
  listTasks: (filters?: {
    status?: string; priority?: string; dateFrom?: string; dateTo?: string; search?: string
  }) => ipcRenderer.invoke('task:list', filters),
  createTask: (task: {
    title: string; description?: string; priority?: string;
    status?: string; startDate?: string; endDate?: string; dueDate?: string; tags?: string[]
  }) => ipcRenderer.invoke('task:create', task),
  updateTask: (id: string, data: {
    title?: string; description?: string; priority?: string; status?: string;
    statusNote?: string; startDate?: string | null; endDate?: string | null;
    dueDate?: string | null; tags?: string[]
  }) => ipcRenderer.invoke('task:update', id, data),
  addTaskSummary: (id: string, data: {
    type: 'progress_summary' | 'daily_summary'; content: string; summaryDate?: string
  }) => ipcRenderer.invoke('task:add-summary', id, data),
  deferTask: (id: string, data: { newDate: string; reason?: string }) =>
    ipcRenderer.invoke('task:defer', id, data),
  listTaskActivities: (id: string) => ipcRenderer.invoke('task:activities', id),
  deleteTask: (id: string) => ipcRenderer.invoke('task:delete', id),
  reorderTasks: (ids: string[]) => ipcRenderer.invoke('task:reorder', ids),

  // Report
  previewReport: (type: 'daily' | 'weekly' | 'monthly', date: string) =>
    ipcRenderer.invoke('report:preview', type, date),
  exportReportHtml: (type: 'daily' | 'weekly' | 'monthly', date: string) =>
    ipcRenderer.invoke('report:export-html', type, date),
  exportReportTxt: (type: 'daily' | 'weekly' | 'monthly', date: string) =>
    ipcRenderer.invoke('report:export-txt', type, date),

  // Backup
  createBackup: (userId: string) => ipcRenderer.invoke('backup:create', userId),
  restoreBackup: (userId: string) => ipcRenderer.invoke('backup:restore', userId),
  getBackupSettings: (userId: string) => ipcRenderer.invoke('backup:get-settings', userId),
  setBackupSettings: (userId: string, settings: { autoBackup: boolean; intervalDays: number; backupPath: string }) =>
    ipcRenderer.invoke('backup:set-settings', userId, settings),

  // Window Controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  applyCloseAction: (action: 'tray' | 'quit', remember: boolean) =>
    ipcRenderer.invoke('window:apply-close-action', action, remember),
  getClosePreference: () => ipcRenderer.invoke('window:get-close-preference'),
  setClosePreference: (action: 'ask' | 'tray' | 'quit') =>
    ipcRenderer.invoke('window:set-close-preference', action),
  cancelCloseAction: () => ipcRenderer.send('window:cancel-close-action'),
  showLoginWindow: () => ipcRenderer.send('window:show-login'),
  showMainWindow: () => ipcRenderer.send('window:show-main'),
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('window:maximized', (_e, v) => callback(v))
  },
  onCloseRequest: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('window:close-request', listener)
    return () => ipcRenderer.removeListener('window:close-request', listener)
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronApi = typeof api
