import { getDatabase } from '../db/connection'
import { v4 as uuidv4 } from 'uuid'

export type TaskStatus = 'todo' | 'in_progress' | 'paused' | 'done'
export type TaskActivityType = 'progress_summary' | 'daily_summary' | 'status_change' | 'defer'
type TaskSummaryType = Extract<TaskActivityType, 'progress_summary' | 'daily_summary'>

export interface TaskActivity {
  id: string
  task_id: string
  type: TaskActivityType
  content: string
  summary_date: string
  metadata: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  status: TaskStatus
  start_date: string | null
  end_date: string | null
  due_date: string | null
  tags: string
  sort_order: number
  completed_at: string | null
  created_at: string
  updated_at: string
  activities?: TaskActivity[]
}

export interface TaskFilters {
  status?: string
  priority?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

function normalizeStatus(status?: string): TaskStatus {
  if (!status) return 'todo'
  if (status === 'todo' || status === 'in_progress' || status === 'paused' || status === 'done') {
    return status
  }
  throw new Error('无效的任务状态')
}

function isSummaryType(type: string): type is TaskSummaryType {
  return type === 'progress_summary' || type === 'daily_summary'
}

function localDate(db = getDatabase()): string {
  return (db.prepare("SELECT date('now','localtime') AS today").get() as { today: string }).today
}

function attachActivities(tasks: Task[]): Task[] {
  if (tasks.length === 0) return tasks

  const db = getDatabase()
  const placeholders = tasks.map(() => '?').join(',')
  const activities = db.prepare(`
    SELECT * FROM task_activities
    WHERE task_id IN (${placeholders})
    ORDER BY summary_date DESC, created_at DESC
  `).all(...tasks.map(task => task.id)) as TaskActivity[]

  const byTask = new Map<string, TaskActivity[]>()
  activities.forEach(activity => {
    const list = byTask.get(activity.task_id) || []
    list.push(activity)
    byTask.set(activity.task_id, list)
  })

  return tasks.map(task => ({ ...task, activities: byTask.get(task.id) || [] }))
}

function insertActivity(
  taskId: string,
  type: TaskActivityType,
  content: string,
  summaryDate: string,
  metadata: Record<string, unknown> = {}
): TaskActivity {
  const db = getDatabase()
  const id = uuidv4()
  db.prepare(`
    INSERT INTO task_activities (id, task_id, type, content, summary_date, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))
  `).run(id, taskId, type, content.trim(), summaryDate, JSON.stringify(metadata))

  return db.prepare('SELECT * FROM task_activities WHERE id = ?').get(id) as TaskActivity
}

export function listTasks(filters?: TaskFilters): Task[] {
  const db = getDatabase()
  let sql = 'SELECT * FROM tasks WHERE 1=1'
  const params: unknown[] = []

  if (filters?.status) {
    sql += ' AND status = ?'
    params.push(filters.status)
  }
  if (filters?.priority) {
    sql += ' AND priority = ?'
    params.push(filters.priority)
  }
  if (filters?.dateFrom && filters?.dateTo) {
    sql += ' AND (due_date BETWEEN ? AND ? OR (start_date IS NOT NULL AND end_date IS NOT NULL AND start_date <= ? AND end_date >= ?))'
    params.push(filters.dateFrom, filters.dateTo, filters.dateTo, filters.dateFrom)
  } else if (filters?.dateFrom) {
    sql += ' AND (due_date >= ? OR (end_date IS NOT NULL AND end_date >= ?))'
    params.push(filters.dateFrom, filters.dateFrom)
  } else if (filters?.dateTo) {
    sql += ' AND (due_date <= ? OR (start_date IS NOT NULL AND start_date <= ?))'
    params.push(filters.dateTo, filters.dateTo)
  }
  if (filters?.search) {
    sql += ` AND (
      title LIKE ? OR description LIKE ?
      OR EXISTS (
        SELECT 1 FROM task_activities activity
        WHERE activity.task_id = tasks.id AND activity.content LIKE ?
      )
    )`
    const query = `%${filters.search}%`
    params.push(query, query, query)
  }

  sql += `
    ORDER BY
      CASE status
        WHEN 'in_progress' THEN 0
        WHEN 'paused' THEN 1
        WHEN 'todo' THEN 2
        ELSE 3
      END,
      created_at DESC,
      sort_order DESC
  `
  return attachActivities(db.prepare(sql).all(...params) as Task[])
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
  const maxOrder = db.prepare('SELECT MAX(sort_order) as maxSort FROM tasks').get() as { maxSort?: number }
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

  return attachActivities([db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task])[0]
}

export function updateTask(id: string, data: {
  title?: string
  description?: string
  priority?: string
  status?: string
  statusNote?: string
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

  db.transaction(() => {
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

    if (newStatus !== task.status) {
      const labels: Record<TaskStatus, string> = {
        todo: '任务调整为待办',
        in_progress: task.status === 'paused' ? '任务已恢复进行' : '任务已开始',
        paused: '任务已挂起，暂不进行',
        done: '任务已完成',
      }
      insertActivity(id, 'status_change', data.statusNote || labels[newStatus], localDate(db), {
        from: task.status,
        to: newStatus,
      })
    }
  })()

  return attachActivities([db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task])[0]
}

export function addTaskSummary(taskId: string, data: {
  type: TaskSummaryType
  content: string
  summaryDate?: string
}): TaskActivity {
  const db = getDatabase()
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId)
  if (!task) throw new Error('任务不存在')
  if (!isSummaryType(data.type)) throw new Error('无效的总结类型')
  if (!data.content.trim()) throw new Error('总结内容不能为空')

  return insertActivity(taskId, data.type, data.content, data.summaryDate || localDate(db))
}

export function updateTaskSummary(taskId: string, activityId: string, data: {
  type: TaskSummaryType
  content: string
  summaryDate: string
}): TaskActivity {
  const db = getDatabase()
  const activity = db.prepare(`
    SELECT * FROM task_activities WHERE id = ? AND task_id = ?
  `).get(activityId, taskId) as TaskActivity | undefined

  if (!activity) throw new Error('总结记录不存在')
  if (activity.type !== 'progress_summary' && activity.type !== 'daily_summary') {
    throw new Error('该过程记录不允许修改')
  }
  if (!isSummaryType(data.type)) throw new Error('无效的总结类型')
  if (!data.content.trim()) throw new Error('总结内容不能为空')
  if (!data.summaryDate) throw new Error('请选择总结日期')

  db.prepare(`
    UPDATE task_activities
    SET type = ?, content = ?, summary_date = ?
    WHERE id = ? AND task_id = ?
  `).run(data.type, data.content.trim(), data.summaryDate, activityId, taskId)

  return db.prepare('SELECT * FROM task_activities WHERE id = ?').get(activityId) as TaskActivity
}

export function deleteTaskSummary(taskId: string, activityId: string): void {
  const db = getDatabase()
  const activity = db.prepare(`
    SELECT type FROM task_activities WHERE id = ? AND task_id = ?
  `).get(activityId, taskId) as Pick<TaskActivity, 'type'> | undefined

  if (!activity) throw new Error('总结记录不存在')
  if (activity.type !== 'progress_summary' && activity.type !== 'daily_summary') {
    throw new Error('该过程记录不允许删除')
  }

  db.prepare('DELETE FROM task_activities WHERE id = ? AND task_id = ?').run(activityId, taskId)
}

export function deferTask(taskId: string, data: {
  newDate: string
  reason?: string
}): Task {
  const db = getDatabase()
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task
  if (!task) throw new Error('任务不存在')
  if (!data.newDate) throw new Error('请选择延期后的日期')
  if (task.start_date && data.newDate < task.start_date) {
    throw new Error('延期日期不能早于任务开始日期')
  }

  const dateField = task.start_date && task.end_date ? 'end_date' : 'due_date'
  const oldDate = dateField === 'end_date' ? task.end_date : task.due_date
  if (oldDate && data.newDate <= oldDate) {
    throw new Error('延期后的日期必须晚于当前计划日期')
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE tasks
      SET ${dateField} = ?, updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(data.newDate, taskId)

    insertActivity(
      taskId,
      'defer',
      data.reason || '调整任务计划日期',
      localDate(db),
      { fromDate: oldDate, toDate: data.newDate, dateField }
    )
  })()

  return attachActivities([db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task])[0]
}

export function listTaskActivities(taskId: string): TaskActivity[] {
  const db = getDatabase()
  return db.prepare(`
    SELECT * FROM task_activities
    WHERE task_id = ?
    ORDER BY summary_date DESC, created_at DESC
  `).all(taskId) as TaskActivity[]
}

export function deleteTask(id: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

export function reorderTasks(orderedIds: string[]): void {
  const db = getDatabase()
  const stmt = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?')
  const reorder = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => stmt.run(index, id))
  })
  reorder(orderedIds)
}

export function getTasksByDateRange(startDate: string, endDate: string): Task[] {
  const db = getDatabase()
  const tasks = db.prepare(`
    SELECT DISTINCT tasks.* FROM tasks
    LEFT JOIN task_activities ON task_activities.task_id = tasks.id
    WHERE
      (tasks.due_date BETWEEN ? AND ?)
      OR (
        tasks.start_date IS NOT NULL
        AND tasks.start_date <= ?
        AND COALESCE(tasks.end_date, tasks.start_date) >= ?
      )
      OR (date(tasks.completed_at) BETWEEN ? AND ?)
      OR (date(tasks.created_at) BETWEEN ? AND ?)
      OR (task_activities.summary_date BETWEEN ? AND ?)
    ORDER BY
      CASE tasks.status
        WHEN 'done' THEN 0
        WHEN 'in_progress' THEN 1
        WHEN 'paused' THEN 2
        ELSE 3
      END,
      tasks.priority DESC,
      tasks.created_at DESC
  `).all(
    startDate, endDate,
    endDate, startDate,
    startDate, endDate,
    startDate, endDate,
    startDate, endDate
  ) as Task[]

  return attachActivities(tasks).map(task => ({
    ...task,
    activities: (task.activities || []).filter(activity =>
      activity.summary_date >= startDate && activity.summary_date <= endDate
    ),
  }))
}
