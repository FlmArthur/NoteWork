import { ipcMain } from 'electron'
import { listNotes, getNotesByDate, createNote, updateNote, deleteNote, moveNote } from '../services/calendar.service'

export function registerCalendarIpc(): void {
  ipcMain.handle('calendar:list', (_event, year: number, month: number) => listNotes(year, month))
  ipcMain.handle('calendar:getByDate', (_event, date: string) => getNotesByDate(date))
  ipcMain.handle('calendar:create', (_event, note: { date: string; title: string; content?: string; color?: string; tags?: string[] }) => createNote(note))
  ipcMain.handle('calendar:update', (_event, id: string, data: { title?: string; content?: string; color?: string; tags?: string[] }) => updateNote(id, data))
  ipcMain.handle('calendar:delete', (_event, id: string) => { deleteNote(id) })
  ipcMain.handle('calendar:move', (_event, id: string, newDate: string) => moveNote(id, newDate))
}
