import { ipcMain } from 'electron'
import { listNotebooks, createNotebook, updateNotebook, deleteNotebook, reorderNotebooks } from '../services/notebook.service'

export function registerNotebookIpc(): void {
  ipcMain.handle('notebook:list', () => listNotebooks())
  ipcMain.handle('notebook:create', (_event, name: string, color?: string, icon?: string) => createNotebook(name, color, icon))
  ipcMain.handle('notebook:update', (_event, id: string, data: { name?: string; color?: string; icon?: string }) => updateNotebook(id, data))
  ipcMain.handle('notebook:delete', (_event, id: string) => { deleteNotebook(id) })
  ipcMain.handle('notebook:reorder', (_event, ids: string[]) => { reorderNotebooks(ids) })
}
