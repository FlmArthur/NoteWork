interface ElectronApi {
  register: (username: string, password: string) => Promise<{ success: boolean; userId?: string; error?: string }>
  login: (username: string, password: string) => Promise<{ success: boolean; userId?: string; error?: string }>
  logout: () => Promise<{ success: boolean }>
  changePassword: (userId: string, oldPwd: string, newPwd: string) => Promise<{ success: boolean; error?: string }>

  listNotebooks: () => Promise<any[]>
  createNotebook: (name: string, color?: string, icon?: string) => Promise<any>
  updateNotebook: (id: string, data: { name?: string; color?: string; icon?: string }) => Promise<any>
  deleteNotebook: (id: string) => Promise<void>
  reorderNotebooks: (ids: string[]) => Promise<void>

  listDocuments: (notebookId: string) => Promise<any[]>
  getDocument: (id: string) => Promise<any>
  createDocument: (notebookId: string, title?: string) => Promise<any>
  saveDocument: (id: string, content: string, plainText: string) => Promise<void>
  renameDocument: (id: string, title: string) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  searchDocuments: (query: string) => Promise<any[]>
  reorderDocuments: (ids: string[]) => Promise<void>

  listCalendarNotes: (year: number, month: number) => Promise<any[]>
  getNotesByDate: (date: string) => Promise<any[]>
  createNote: (note: { date: string; title: string; content?: string; color?: string; tags?: string[] }) => Promise<any>
  updateNote: (id: string, data: { title?: string; content?: string; color?: string; tags?: string[] }) => Promise<any>
  deleteNote: (id: string) => Promise<void>
  moveNote: (id: string, newDate: string) => Promise<any>

  listTasks: (filters?: { status?: string; priority?: string; dateFrom?: string; dateTo?: string; search?: string }) => Promise<any[]>
  createTask: (task: { title: string; description?: string; priority?: string; status?: string; startDate?: string; endDate?: string; dueDate?: string; tags?: string[] }) => Promise<any>
  updateTask: (id: string, data: { title?: string; description?: string; priority?: string; status?: string; statusNote?: string; startDate?: string | null; endDate?: string | null; dueDate?: string | null; tags?: string[] }) => Promise<any>
  addTaskSummary: (id: string, data: { type: 'progress_summary' | 'daily_summary'; content: string; summaryDate?: string }) => Promise<any>
  deferTask: (id: string, data: { newDate: string; reason?: string }) => Promise<any>
  listTaskActivities: (id: string) => Promise<any[]>
  deleteTask: (id: string) => Promise<void>
  reorderTasks: (ids: string[]) => Promise<void>

  previewReport: (type: 'daily' | 'weekly' | 'monthly', date: string) => Promise<{ html: string; report: any }>
  exportReportHtml: (type: 'daily' | 'weekly' | 'monthly', date: string) => Promise<{ success: boolean; filePath?: string }>
  exportReportTxt: (type: 'daily' | 'weekly' | 'monthly', date: string) => Promise<{ success: boolean; filePath?: string }>

  createBackup: (userId: string) => Promise<{ success: boolean; filePath?: string; size?: number; timestamp?: string }>
  restoreBackup: (userId: string) => Promise<{ success: boolean; error?: string }>
  getBackupSettings: (userId: string) => Promise<{ autoBackup: boolean; intervalDays: number; backupPath: string }>
  setBackupSettings: (userId: string, settings: { autoBackup: boolean; intervalDays: number; backupPath: string }) => Promise<any>

  minimize: () => void
  maximize: () => void
  close: () => void
  applyCloseAction: (action: 'tray' | 'quit', remember: boolean) => Promise<void>
  getClosePreference: () => Promise<'ask' | 'tray' | 'quit'>
  setClosePreference: (action: 'ask' | 'tray' | 'quit') => Promise<void>
  cancelCloseAction: () => void
  showLoginWindow: () => void
  showMainWindow: () => void
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => void
  onCloseRequest: (callback: () => void) => () => void
}

declare global {
  interface Window {
    api: ElectronApi
  }
}

export {}
