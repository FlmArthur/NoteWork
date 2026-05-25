import { getDatabase } from '../db/connection'
import { v4 as uuidv4 } from 'uuid'

export interface CalendarNote {
  id: string
  date: string
  title: string
  content: string
  color: string
  tags: string
  created_at: string
  updated_at: string
}

export function listNotes(year: number, month: number): CalendarNote[] {
  const db = getDatabase()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`
  return db.prepare(
    'SELECT * FROM calendar_notes WHERE date >= ? AND date <= ? ORDER BY date ASC, created_at DESC'
  ).all(startDate, endDate) as CalendarNote[]
}

export function getNotesByDate(date: string): CalendarNote[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM calendar_notes WHERE date = ? ORDER BY created_at DESC'
  ).all(date) as CalendarNote[]
}

export function createNote(note: {
  date: string
  title: string
  content?: string
  color?: string
  tags?: string[]
}): CalendarNote {
  const db = getDatabase()
  const id = uuidv4()
  const tags = JSON.stringify(note.tags || [])

  db.prepare(`
    INSERT INTO calendar_notes (id, date, title, content, color, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
  `).run(id, note.date, note.title, note.content || '', note.color || '#FFD700', tags)

  return db.prepare('SELECT * FROM calendar_notes WHERE id = ?').get(id) as CalendarNote
}

export function updateNote(id: string, data: {
  title?: string
  content?: string
  color?: string
  tags?: string[]
}): CalendarNote {
  const db = getDatabase()
  const note = db.prepare('SELECT * FROM calendar_notes WHERE id = ?').get(id) as CalendarNote
  if (!note) throw new Error('便签不存在')

  db.prepare(`
    UPDATE calendar_notes
    SET title = ?, content = ?, color = ?, tags = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    data.title ?? note.title,
    data.content ?? note.content,
    data.color ?? note.color,
    data.tags ? JSON.stringify(data.tags) : note.tags,
    id
  )

  return db.prepare('SELECT * FROM calendar_notes WHERE id = ?').get(id) as CalendarNote
}

export function deleteNote(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM calendar_notes WHERE id = ?').run(id)
}

export function moveNote(id: string, newDate: string): CalendarNote {
  const db = getDatabase()
  db.prepare('UPDATE calendar_notes SET date = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
    .run(newDate, id)
  return db.prepare('SELECT * FROM calendar_notes WHERE id = ?').get(id) as CalendarNote
}
