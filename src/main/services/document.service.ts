import { getDatabase } from '../db/connection'
import { v4 as uuidv4 } from 'uuid'

export interface Document {
  id: string
  notebook_id: string
  title: string
  content: string | null
  plain_text: string
  sort_order: number
  last_opened_at: string | null
  created_at: string
  updated_at: string
}

export function listDocuments(notebookId: string): Document[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM documents WHERE notebook_id = ? ORDER BY sort_order ASC, created_at DESC'
  ).all(notebookId) as Document[]
}

export function getDocument(id: string): Document {
  const db = getDatabase()
  db.prepare('UPDATE documents SET last_opened_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(id)
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Document
}

export function createDocument(notebookId: string, title?: string): Document {
  const db = getDatabase()
  const id = uuidv4()
  const maxOrder = db.prepare(
    'SELECT MAX(sort_order) as maxSort FROM documents WHERE notebook_id = ?'
  ).get(notebookId) as any
  const sortOrder = (maxOrder?.maxSort ?? -1) + 1
  const docTitle = title || '未命名文档'

  db.prepare(`
    INSERT INTO documents (id, notebook_id, title, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
  `).run(id, notebookId, docTitle, sortOrder)

  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as Document
}

export function saveDocument(id: string, content: string, plainText: string): void {
  const db = getDatabase()
  db.prepare(`
    UPDATE documents SET content = ?, plain_text = ?, updated_at = datetime('now','localtime') WHERE id = ?
  `).run(content, plainText, id)
}

export function renameDocument(id: string, title: string): void {
  const db = getDatabase()
  db.prepare('UPDATE documents SET title = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(title, id)
}

export function deleteDocument(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM documents WHERE id = ?').run(id)
}

export function searchDocuments(query: string): Document[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM documents WHERE plain_text LIKE ? OR title LIKE ? ORDER BY updated_at DESC'
  ).all(`%${query}%`, `%${query}%`) as Document[]
}

export function reorderDocuments(orderedIds: string[]): void {
  const db = getDatabase()
  const stmt = db.prepare('UPDATE documents SET sort_order = ? WHERE id = ?')
  orderedIds.forEach((id, index) => {
    stmt.run(index, id)
  })
}
