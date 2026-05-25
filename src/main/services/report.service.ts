import { getTasksByDateRange, Task } from './task.service'

export type ReportType = 'daily' | 'weekly' | 'monthly'

function getDateRange(type: ReportType, date: string): { startDate: string; endDate: string; title: string } {
  const d = new Date(date)
  let startDate: string, endDate: string, title: string

  if (type === 'daily') {
    startDate = date
    endDate = date
    title = `${date} 日报`
  } else if (type === 'weekly') {
    const dayOfWeek = d.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(d)
    monday.setDate(d.getDate() + mondayOffset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
    startDate = fmt(monday)
    endDate = fmt(sunday)
    title = `${startDate} ~ ${endDate} 周报`
  } else {
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    title = `${year}年${month}月 月报`
  }

  return { startDate, endDate, title }
}

export function generateReport(type: ReportType, date: string): {
  title: string
  startDate: string
  endDate: string
  completedTasks: Task[]
  inProgressTasks: Task[]
  todoTasks: Task[]
  summary: { total: number; completed: number; inProgress: number; todo: number }
} {
  const { startDate, endDate, title } = getDateRange(type, date)
  const tasks = getTasksByDateRange(startDate, endDate)

  const completedTasks = tasks.filter(t => t.status === 'done')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const todoTasks = tasks.filter(t => t.status === 'todo')

  return {
    title,
    startDate,
    endDate,
    completedTasks,
    inProgressTasks,
    todoTasks,
    summary: {
      total: tasks.length,
      completed: completedTasks.length,
      inProgress: inProgressTasks.length,
      todo: todoTasks.length
    }
  }
}

export function generateReportHtml(report: ReturnType<typeof generateReport>): string {
  const taskItem = (t: Task, icon: string) =>
    `<tr><td style="padding:8px;border:1px solid #ddd;">${icon}</td><td style="padding:8px;border:1px solid #ddd;">${escapeHtml(t.title)}</td><td style="padding:8px;border:1px solid #ddd;text-align:center;"><span style="background:${getPriorityColor(t.priority)};color:#fff;padding:2px 8px;border-radius:10px;font-size:12px;">${getPriorityLabel(t.priority)}</span></td></tr>`

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>${report.title}</title>
<style>
  body { font-family: 'Microsoft YaHei', sans-serif; max-width: 800px; margin: 40px auto; color: #333; }
  h1 { text-align: center; border-bottom: 2px solid #4A90D9; padding-bottom: 10px; }
  h2 { color: #4A90D9; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  .summary { display: flex; gap: 16px; margin: 16px 0; }
  .summary-item { flex:1; text-align:center; padding:12px; border-radius:8px; background:#f5f5f5; }
  .summary-item .num { font-size: 28px; font-weight: bold; color: #4A90D9; }
  .empty { color: #999; font-style: italic; padding: 12px; }
</style></head>
<body>
  <h1>${escapeHtml(report.title)}</h1>
  <div class="summary">
    <div class="summary-item"><div class="num">${report.summary.total}</div><div>总任务</div></div>
    <div class="summary-item"><div class="num">${report.summary.completed}</div><div>已完成</div></div>
    <div class="summary-item"><div class="num">${report.summary.inProgress}</div><div>进行中</div></div>
    <div class="summary-item"><div class="num">${report.summary.todo}</div><div>待办</div></div>
  </div>

  <h2>完成事项</h2>
  ${report.completedTasks.length === 0 ? '<p class="empty">无</p>' :
    `<table><thead><tr><th style="width:40px;"></th><th>任务</th><th style="width:80px;">优先级</th></tr></thead><tbody>${report.completedTasks.map(t => taskItem(t, '✅')).join('')}</tbody></table>`}

  <h2>进行中事项</h2>
  ${report.inProgressTasks.length === 0 ? '<p class="empty">无</p>' :
    `<table><thead><tr><th style="width:40px;"></th><th>任务</th><th style="width:80px;">优先级</th></tr></thead><tbody>${report.inProgressTasks.map(t => taskItem(t, '🔄')).join('')}</tbody></table>`}

  <h2>待办事项</h2>
  ${report.todoTasks.length === 0 ? '<p class="empty">无</p>' :
    `<table><thead><tr><th style="width:40px;"></th><th>任务</th><th style="width:80px;">优先级</th></tr></thead><tbody>${report.todoTasks.map(t => taskItem(t, '📋')).join('')}</tbody></table>`}

  <p style="text-align:center;color:#999;margin-top:32px;">由 NoteWorks 自动生成</p>
</body></html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function getPriorityColor(p: string): string {
  switch (p) {
    case 'high': return '#e74c3c'
    case 'medium': return '#f39c12'
    case 'low': return '#27ae60'
    default: return '#999'
  }
}

function getPriorityLabel(p: string): string {
  switch (p) {
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return p
  }
}
