import { ipcMain } from 'electron'
import { listDocuments, getDocument, createDocument, saveDocument, renameDocument, deleteDocument, searchDocuments, reorderDocuments } from '../services/document.service'

export function registerDocumentIpc(): void {
  ipcMain.handle('document:list', (_event, notebookId: string) => listDocuments(notebookId))
  ipcMain.handle('document:get', (_event, id: string) => getDocument(id))
  ipcMain.handle('document:create', (_event, notebookId: string, title?: string) => createDocument(notebookId, title))
  ipcMain.handle('document:save', (_event, id: string, content: string, plainText: string) => { saveDocument(id, content, plainText) })
  ipcMain.handle('document:rename', (_event, id: string, title: string) => { renameDocument(id, title) })
  ipcMain.handle('document:delete', (_event, id: string) => { deleteDocument(id) })
  ipcMain.handle('document:search', (_event, query: string) => searchDocuments(query))
  ipcMain.handle('document:reorder', (_event, ids: string[]) => { reorderDocuments(ids) })
}
