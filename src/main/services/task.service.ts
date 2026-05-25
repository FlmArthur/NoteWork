import { getDatabase } from '../db/connection'
import { v4 as uuidv4 } from 'uuid'

export interface Task {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'done'
  start_date: string | null
  end_date: string | null
  due_date: string | null
  tags: string
  sort_order: number
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskFilters {
  status?: string
  priority?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

type TaskStatus = Task['status']

function normalizeStatus(status?: string): TaskStatus {
  if (!status) return 'todo'
  if (status === 'todo' || status === 'in_progress' || status === 'done') return status
  throw new Error('无效的任务状态')
}

export function listTasks(filters?: TaskFilters): Task[] {
  const db = getDatabase()
  let sql = 'SELECT * FROM tasks WHERE 1=1'
  const params: any[] = []

  if (filters?.status) {
    sql += ' AND status = ?'
    params.push(filters.status)
  }
  if (filters?.priority) {
    sql += ' AND priority = ?'
    params.push(filters.priority)
  }
  if (filters?.dateFrom) {
    sql += ' AND (due_date >= ? OR start_date >= ?)'
    params.push(filters.dateFrom, filters.dateFrom)
  }
  if (filters?.dateTo) {
    sql += ' AND (due_date <= ? OR end_date <= ?)'
    params.push(filters.dateTo, filters.dateTo)
  }
  if (filters?.search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)'
    params.push(`%${filters.search}%`, `%${filters.search}%`)
  }

  sql += ' ORDER BY sort_order ASC, created_at DESC'
  return db.prepare(sql).all(...params) as Task[]
}

export function createTask(task: {
  title: string
  description?: string
  priority?: string
  status?: string
  startDate?: string
  endDate?: string
  dueDate?: string
  tags?: string[]
}): Task {
  const db = getDatabase()
  const id = uuidv4()
  const maxOrder = db.prepare('SELECT MAX(sort_order) as maxSort FROM tasks').get() as any
  const sortOrder = (maxOrder?.maxSort ?? -1) + 1
  const tags = JSON.stringify(task.tags || [])
  const status = normalizeStatus(task.status)

  db.prepare(`
    INSERT INTO tasks (id, title, description, priority, status, start_date, end_date, due_date, tags, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
  `).run(
    id,
    task.title,
    task.description || '',
    task.priority || 'medium',
    status,
    task.startDate || null,
    task.endDate || null,
    task.dueDate || null,
    tags,
    sortOrder
  )

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
}

export function updateTask(id: string, data: {
  title?: string
  description?: string
  priority?: string
  status?: string
  startDate?: string | null
  endDate?: string | null
  dueDate?: string | null
  tags?: string[]
}): Task {
  const db = getDatabase()
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
  if (!task) throw new Error('任务不存在')

  const newStatus = data.status ? normalizeStatus(data.status) : task.status
  const completedAt = newStatus === 'done'
    ? task.completed_at || (db.prepare("SELECT datetime('now','localtime') AS now").get() as { now: string }).now
    : null

  db.prepare(`
    UPDATE tasks SET
      title = ?, description = ?, priority = ?, status = ?,
      start_date = ?, end_date = ?, due_date = ?,
      tags = ?, completed_at = ?,
      updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(
    data.title ?? task.title,
    data.description ?? task.description,
    data.priority ?? task.priority,
    newStatus,
    data.startDate !== undefined ? data.startDate : task.start_date,
    data.endDate !== undefined ? data.endDate : task.end_date,
    data.dueDate !== undefined ? data.dueDate : task.due_date,
    data.tags ? JSON.stringify(data.tags) : task.tags,
    completedAt,
    id
  )

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
}

export function deleteTask(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

export function reorderTasks(orderedIds: string[]): void {
  const db = getDatabase()
  const stmt = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?')
  orderedIds.forEach((id, index) => {
    stmt.run(index, id)
  })
}

export function getTasksByDateRange(startDate: string, endDate: string): Task[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM tasks WHERE
      (due_date >= ? AND due_date <= ?)
      OR (start_date <= ? AND end_date >= ?)
      OR (start_date >= ? AND start_date <= ?)
    ORDER BY status ASC, priority DESC, created_at DESC
  `).all(startDate, endDate, startDate, startDate, startDate, endDate) as Task[]
}
