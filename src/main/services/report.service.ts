import { getTasksByDateRange, Task, TaskActivity, TaskStatus } from './task.service'

export type ReportType = 'daily' | 'weekly' | 'monthly'
export type ReportTask = Task & { activities: TaskActivity[] }

export interface WorkReport {
  type: ReportType
  title: string
  startDate: string
  endDate: string
  completedTasks: ReportTask[]
  inProgressTasks: ReportTask[]
  pausedTasks: ReportTask[]
  todoTasks: ReportTask[]
  summary: {
    total: number
    completed: number
    inProgress: number
    paused: number
    todo: number
    updateCount: number
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateRange(type: ReportType, date: string): { startDate: string; endDate: string; title: string } {
  const selected = new Date(`${date}T00:00:00`)
  let startDate: string
  let endDate: string
  let title: string

  if (type === 'daily') {
    startDate = date
    endDate = date
    title = `${date} 日报`
  } else if (type === 'weekly') {
    const dayOfWeek = selected.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(selected)
    monday.setDate(selected.getDate() + mondayOffset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    startDate = formatDate(monday)
    endDate = formatDate(sunday)
    title = `${startDate} ~ ${endDate} 周报`
  } else {
    const year = selected.getFullYear()
    const month = selected.getMonth() + 1
    startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    title = `${year}年${month}月 月报`
  }

  return { startDate, endDate, title }
}

export function generateReport(type: ReportType, date: string): WorkReport {
  const { startDate, endDate, title } = getDateRange(type, date)
  const tasks = getTasksByDateRange(startDate, endDate) as ReportTask[]
  const completedTasks = tasks.filter(task => task.status === 'done')
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress')
  const pausedTasks = tasks.filter(task => task.status === 'paused')
  const todoTasks = tasks.filter(task => task.status === 'todo')

  return {
    type,
    title,
    startDate,
    endDate,
    completedTasks,
    inProgressTasks,
    pausedTasks,
    todoTasks,
    summary: {
      total: tasks.length,
      completed: completedTasks.length,
      inProgress: inProgressTasks.length,
      paused: pausedTasks.length,
      todo: todoTasks.length,
      updateCount: tasks.reduce((count, task) => count + task.activities.length, 0),
    },
  }
}

const statusLabels: Record<TaskStatus, string> = {
  todo: '待办',
  in_progress: '进行中',
  paused: '已挂起',
  done: '已完成',
}

const activityLabels: Record<TaskActivity['type'], string> = {
  progress_summary: '阶段总结',
  daily_summary: '当日总结',
  status_change: '状态记录',
  defer: '延期记录',
}

function getTaskDate(task: Task): string {
  if (task.start_date && task.end_date) return `${task.start_date} ~ ${task.end_date}`
  return task.due_date || '未设置计划日期'
}

function parseMetadata(activity: TaskActivity): Record<string, string> {
  try {
    return JSON.parse(activity.metadata || '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function getActivityDetail(activity: TaskActivity): string {
  if (activity.type !== 'defer') return ''
  const metadata = parseMetadata(activity)
  if (!metadata.toDate) return ''
  return `${metadata.fromDate || '未设置'} → ${metadata.toDate}`
}

function renderTask(task: ReportTask): string {
  const activities = task.activities.length > 0
    ? `<div class="timeline">
        ${task.activities.map(activity => {
          const detail = getActivityDetail(activity)
          return `<div class="timeline-item">
            <div class="timeline-dot timeline-${activity.type}"></div>
            <div class="timeline-content">
              <div class="timeline-meta">
                <strong>${activityLabels[activity.type]}</strong>
                <span>${escapeHtml(activity.summary_date)}</span>
                ${detail ? `<em>${escapeHtml(detail)}</em>` : ''}
              </div>
              <p>${escapeHtml(activity.content)}</p>
            </div>
          </div>`
        }).join('')}
      </div>`
    : '<p class="task-empty-note">本报告周期内暂无过程记录</p>'

  return `<article class="task-entry">
    <header class="task-entry-head">
      <div>
        <div class="task-title-row">
          <h3>${escapeHtml(task.title)}</h3>
          <span class="status status-${task.status}">${statusLabels[task.status]}</span>
        </div>
        <div class="task-meta">
          <span>${escapeHtml(getTaskDate(task))}</span>
          <span class="priority priority-${task.priority}">${getPriorityLabel(task.priority)}优先级</span>
        </div>
      </div>
    </header>
    ${task.description
      ? `<div class="task-description"><span>任务说明</span><p>${escapeHtml(task.description)}</p></div>`
      : ''}
    ${activities}
  </article>`
}

function renderSection(title: string, subtitle: string, tasks: ReportTask[], tone: string): string {
  return `<section class="report-section">
    <div class="section-heading">
      <div>
        <span class="section-kicker">${tone}</span>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      <strong>${tasks.length}</strong>
    </div>
    ${tasks.length > 0
      ? `<div class="task-stack">${tasks.map(renderTask).join('')}</div>`
      : '<div class="section-empty">本周期暂无此类任务</div>'}
  </section>`
}

export function generateReportHtml(report: WorkReport): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.title)}</title>
  <style>
    :root {
      --ink: #18212f;
      --muted: #68717f;
      --subtle: #969b9e;
      --paper: #fffefa;
      --canvas: #f4f1ea;
      --line: #ddd8ce;
      --line-soft: #ebe6dc;
      --blue: #2f63e9;
      --green: #5f8b74;
      --amber: #c88932;
      --red: #c8554d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(rgba(24, 33, 47, 0.018) 1px, transparent 1px),
        linear-gradient(90deg, rgba(24, 33, 47, 0.018) 1px, transparent 1px),
        var(--canvas);
      background-size: 24px 24px;
      font-family: "Microsoft YaHei UI", "Microsoft YaHei", sans-serif;
      line-height: 1.65;
    }
    .report {
      width: min(920px, calc(100% - 40px));
      margin: 26px auto 44px;
    }
    .report-cover {
      position: relative;
      padding: 34px 38px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: linear-gradient(120deg, rgba(255, 254, 250, 0.99), rgba(247, 242, 232, 0.94));
      box-shadow: 0 18px 46px rgba(24, 33, 47, 0.08);
    }
    .report-cover::after {
      content: "";
      position: absolute;
      width: 250px;
      height: 250px;
      right: 52px;
      top: -118px;
      border: 1px solid rgba(47, 99, 233, 0.13);
      border-radius: 50%;
    }
    .eyebrow {
      margin: 0 0 7px;
      color: var(--blue);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.2em;
    }
    h1 {
      position: relative;
      z-index: 1;
      margin: 0;
      font-family: Georgia, "STSong", "SimSun", serif;
      font-size: 34px;
      line-height: 1.25;
    }
    .report-range {
      position: relative;
      z-index: 1;
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 9px;
      margin-top: 18px;
    }
    .metric {
      padding: 12px 13px;
      border: 1px solid var(--line-soft);
      border-radius: 10px;
      background: rgba(255, 254, 250, 0.86);
    }
    .metric span {
      display: block;
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
    }
    .metric strong {
      display: block;
      margin-top: 2px;
      font-family: Georgia, serif;
      font-size: 25px;
      line-height: 1.1;
    }
    .metric-total strong { color: var(--ink); }
    .metric-progress strong { color: var(--blue); }
    .metric-paused strong { color: var(--amber); }
    .metric-completed strong { color: var(--green); }
    .metric-todo strong { color: var(--muted); }
    .metric-updates strong { color: #7b5ca8; }
    .report-section {
      margin-top: 18px;
      padding: 24px;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(255, 254, 250, 0.97);
      box-shadow: 0 8px 24px rgba(24, 33, 47, 0.045);
    }
    .section-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--line-soft);
    }
    .section-heading h2 {
      margin: 1px 0 2px;
      font-family: Georgia, "STSong", "SimSun", serif;
      font-size: 21px;
    }
    .section-heading p {
      margin: 0;
      color: var(--muted);
      font-size: 11px;
    }
    .section-heading > strong {
      min-width: 42px;
      text-align: right;
      color: var(--subtle);
      font-family: Georgia, serif;
      font-size: 28px;
      line-height: 1;
    }
    .section-kicker {
      color: var(--blue);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    .task-stack { display: grid; gap: 12px; margin-top: 14px; }
    .task-entry {
      padding: 17px 18px;
      border: 1px solid var(--line-soft);
      border-left: 4px solid var(--blue);
      border-radius: 10px;
      background: #fffefa;
    }
    .task-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .task-title-row h3 { margin: 0; font-size: 15px; }
    .task-meta {
      display: flex;
      gap: 10px;
      margin-top: 4px;
      color: var(--muted);
      font-size: 10px;
    }
    .status, .priority {
      display: inline-flex;
      align-items: center;
      border-radius: 99px;
      font-size: 9px;
      font-weight: 800;
    }
    .status { padding: 2px 8px; white-space: nowrap; }
    .priority { padding: 1px 6px; }
    .status-in_progress { color: var(--blue); background: #e8edfb; }
    .status-paused { color: #95601f; background: #f8edd9; }
    .status-done { color: #46725c; background: #e7efe9; }
    .status-todo { color: var(--muted); background: #efede8; }
    .priority-high { color: #a83e37; background: #f8e5e1; }
    .priority-medium { color: #9b681f; background: #f8edd9; }
    .priority-low { color: #46725c; background: #e7efe9; }
    .task-description {
      margin-top: 13px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #f8f5ef;
    }
    .task-description span {
      color: var(--subtle);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.08em;
    }
    .task-description p {
      margin: 3px 0 0;
      color: var(--muted);
      font-size: 11px;
      white-space: pre-wrap;
    }
    .timeline {
      position: relative;
      display: grid;
      gap: 10px;
      margin-top: 14px;
      padding-left: 2px;
    }
    .timeline-item { display: flex; gap: 10px; }
    .timeline-dot {
      width: 8px;
      height: 8px;
      margin-top: 6px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--muted);
    }
    .timeline-progress_summary { background: var(--blue); }
    .timeline-daily_summary { background: var(--green); }
    .timeline-defer { background: var(--amber); }
    .timeline-content { min-width: 0; flex: 1; }
    .timeline-meta {
      display: flex;
      align-items: baseline;
      gap: 9px;
      color: var(--subtle);
      font-size: 9px;
    }
    .timeline-meta strong { color: var(--ink); font-size: 10px; }
    .timeline-meta em { color: var(--amber); font-style: normal; font-weight: 700; }
    .timeline-content p {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 11px;
      white-space: pre-wrap;
    }
    .task-empty-note, .section-empty {
      color: var(--subtle);
      font-size: 11px;
    }
    .task-empty-note { margin: 12px 0 0; }
    .section-empty { padding: 24px 0 6px; text-align: center; }
    .report-footer {
      margin-top: 22px;
      color: var(--subtle);
      font-size: 10px;
      text-align: center;
    }
    @media (max-width: 760px) {
      .metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .report-cover { padding: 26px; }
    }
    @media print {
      body { background: #fff; }
      .report { width: 100%; margin: 0; }
      .report-cover, .report-section { box-shadow: none; break-inside: avoid; }
      .task-entry { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="report">
    <header class="report-cover">
      <p class="eyebrow">NOTEWORKS · WORK REPORT</p>
      <h1>${escapeHtml(report.title)}</h1>
      <p class="report-range">统计周期 ${report.startDate} 至 ${report.endDate}，包含任务描述与本周期过程记录。</p>
      <div class="metrics">
        <div class="metric metric-total"><span>总任务</span><strong>${report.summary.total}</strong></div>
        <div class="metric metric-progress"><span>进行中</span><strong>${report.summary.inProgress}</strong></div>
        <div class="metric metric-paused"><span>已挂起</span><strong>${report.summary.paused}</strong></div>
        <div class="metric metric-completed"><span>已完成</span><strong>${report.summary.completed}</strong></div>
        <div class="metric metric-todo"><span>待办</span><strong>${report.summary.todo}</strong></div>
        <div class="metric metric-updates"><span>过程记录</span><strong>${report.summary.updateCount}</strong></div>
      </div>
    </header>

    ${renderSection('已完成事项', '本周期形成结果的任务，以及完成前后的过程说明。', report.completedTasks, 'Delivered')}
    ${renderSection('正在推进', '持续进行中的工作，重点查看阶段总结和下一步。', report.inProgressTasks, 'In progress')}
    ${renderSection('暂缓事项', '当前挂起、等待依赖或暂不推进的任务。', report.pausedTasks, 'Paused')}
    ${renderSection('后续待办', '已进入计划范围但尚未开始的事项。', report.todoTasks, 'Up next')}

    <footer class="report-footer">由 NoteWorks 自动生成 · ${report.startDate} ~ ${report.endDate}</footer>
  </main>
</body>
</html>`
}

function taskToText(task: ReportTask): string {
  let text = `- [${statusLabels[task.status]}] [${getPriorityLabel(task.priority)}] ${task.title}\n`
  text += `  日期: ${getTaskDate(task)}\n`
  if (task.description) text += `  说明: ${task.description}\n`
  task.activities.forEach(activity => {
    const detail = getActivityDetail(activity)
    text += `  · ${activity.summary_date} ${activityLabels[activity.type]}${detail ? ` (${detail})` : ''}: ${activity.content}\n`
  })
  return text
}

export function generateReportText(report: WorkReport): string {
  const section = (title: string, tasks: ReportTask[]) =>
    `【${title}】\n${tasks.length ? tasks.map(taskToText).join('') : '无\n'}\n`

  return `${report.title}

时间范围: ${report.startDate} ~ ${report.endDate}
总任务: ${report.summary.total} | 已完成: ${report.summary.completed} | 进行中: ${report.summary.inProgress} | 已挂起: ${report.summary.paused} | 待办: ${report.summary.todo}
过程记录: ${report.summary.updateCount}

${section('已完成事项', report.completedTasks)}${section('正在推进', report.inProgressTasks)}${section('暂缓事项', report.pausedTasks)}${section('后续待办', report.todoTasks)}由 NoteWorks 自动生成`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return priority
  }
}
