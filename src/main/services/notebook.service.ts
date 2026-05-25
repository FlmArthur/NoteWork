import { getDatabase } from '../db/connection'
import { v4 as uuidv4 } from 'uuid'

export interface Notebook {
  id: string
  name: string
  color: string
  icon: string
  sort_order: number
  created_at: string
  updated_at: string
}

export function listNotebooks(): Notebook[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM notebooks ORDER BY sort_order ASC, created_at DESC').all() as Notebook[]
}

export function createNotebook(name: string, color?: string, icon?: string): Notebook {
  const db = getDatabase()
  const id = uuidv4()
  const maxOrder = db.prepare('SELECT MAX(sort_order) as maxSort FROM notebooks').get() as any
  const sortOrder = (maxOrder?.maxSort ?? -1) + 1

  db.prepare(`
    INSERT INTO notebooks (id, name, color, icon, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
  `).run(id, name, color || '#4A90D9', icon || 'book', sortOrder)

  return db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id) as Notebook
}

export function updateNotebook(id: string, data: { name?: string; color?: string; icon?: string }): Notebook {
  const db = getDatabase()
  const notebook = db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id) as Notebook
  if (!notebook) throw new Error('笔记本不存在')

  const newName = data.name ?? notebook.name
  const newColor = data.color ?? notebook.color
  const newIcon = data.icon ?? notebook.icon

  db.prepare(`
    UPDATE notebooks SET name = ?, color = ?, icon = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(newName, newColor, newIcon, id)

  return db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id) as Notebook
}

export function deleteNotebook(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM documents WHERE notebook_id = ?').run(id)
  db.prepare('DELETE FROM notebooks WHERE id = ?').run(id)
}

export function reorderNotebooks(ids: string[]): void {
  const db = getDatabase()
  const stmt = db.prepare('UPDATE notebooks SET sort_order = ? WHERE id = ?')
  ids.forEach((id, index) => {
    stmt.run(index, id)
  })
}
