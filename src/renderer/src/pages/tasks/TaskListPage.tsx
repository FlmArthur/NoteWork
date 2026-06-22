import { useState, useEffect, useCallback, useMemo } from 'react'
import type { CSSProperties } from 'react'
import {
  Button, Input, Select, Card, Tag, Modal, DatePicker, Popconfirm,
  message, Empty, Space, Checkbox, Tooltip
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  CalendarOutlined, PlayCircleOutlined, CheckOutlined, PauseCircleOutlined,
  ClockCircleOutlined, FileDoneOutlined, HistoryOutlined
} from '@ant-design/icons'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

type TaskStatus = 'todo' | 'in_progress' | 'paused' | 'done'
type TaskActivityType = 'progress_summary' | 'daily_summary' | 'status_change' | 'defer'

interface TaskActivity {
  id: string
  task_id: string
  type: TaskActivityType
  content: string
  summary_date: string
  metadata: string
  created_at: string
}

interface Task {
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

type TaskStatusFilter = '' | TaskStatus | 'overdue'
type TaskListFilters = {
  status: TaskStatusFilter
  priority: string
  search: string
  dateRange: [string, string] | null
}

const priorityConfig = {
  high: { label: '高', color: '#c8554d' },
  medium: { label: '中', color: '#c88932' },
  low: { label: '低', color: '#5f8b74' },
}

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: '待办', color: '#68717f' },
  in_progress: { label: '进行中', color: '#2f63e9' },
  paused: { label: '已挂起', color: '#9a6b34' },
  done: { label: '已完成', color: '#5f8b74' },
}

const activityConfig: Record<TaskActivityType, { label: string; color: string }> = {
  progress_summary: { label: '阶段总结', color: '#2f63e9' },
  daily_summary: { label: '当日总结', color: '#5f8b74' },
  status_change: { label: '状态变更', color: '#68717f' },
  defer: { label: '延期记录', color: '#c88932' },
}

const statusSortRank: Record<TaskStatus, number> = {
  in_progress: 0,
  paused: 1,
  todo: 2,
  done: 3,
}

function getTaskSortTime(task: Task) {
  const value = task.created_at || task.updated_at || task.due_date || task.start_date || ''
  const timestamp = dayjs(value).valueOf()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function sortTasksForList(list: Task[]) {
  return [...list].sort((a, b) => {
    const statusDiff = statusSortRank[a.status] - statusSortRank[b.status]
    if (statusDiff !== 0) return statusDiff

    const timeDiff = getTaskSortTime(b) - getTaskSortTime(a)
    if (timeDiff !== 0) return timeDiff

    return (b.sort_order ?? 0) - (a.sort_order ?? 0)
  })
}

function getTaskTiming(task: Task, today = dayjs().format('YYYY-MM-DD')) {
  const isMultiDay = Boolean(task.start_date && task.end_date)
  const deadline = task.end_date || task.due_date
  const isDone = task.status === 'done'
  const isOverdue = Boolean(deadline && deadline < today && !isDone && task.status !== 'paused')
  const shouldStart = Boolean(isMultiDay && task.start_date && task.start_date <= today && task.status === 'todo')
  const startsInFuture = Boolean(isMultiDay && task.start_date && task.start_date > today && task.status === 'todo')
  const isTodayTask = task.due_date === today

  return { isMultiDay, deadline, isOverdue, shouldStart, startsInFuture, isTodayTask }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function getDeferDetail(activity: TaskActivity) {
  try {
    const metadata = JSON.parse(activity.metadata || '{}') as { fromDate?: string; toDate?: string }
    if (metadata.toDate) {
      return `${metadata.fromDate || '未设置'} → ${metadata.toDate}`
    }
  } catch {
    return ''
  }
  return ''
}

function SortableTask({
  task, onEdit, onDelete, onStatusChange, onOpenSummary, onEditSummary,
  onDeleteSummary, onOpenPause, onOpenDefer
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onOpenSummary: (task: Task) => void
  onEditSummary: (task: Task, activity: TaskActivity) => void
  onDeleteSummary: (taskId: string, activityId: string) => void
  onOpenPause: (task: Task) => void
  onOpenDefer: (task: Task) => void
}) {
  const [showAllActivities, setShowAllActivities] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const timing = getTaskTiming(task)
  const statusColor = timing.isOverdue ? '#c8554d' : statusConfig[task.status].color
  const dateDisplay = task.start_date && task.end_date
    ? `${task.start_date} ~ ${task.end_date}`
    : task.due_date || ''
  const allActivities = (task.activities || [])
    .filter(activity => activity.type !== 'status_change')
  const visibleActivities = showAllActivities ? allActivities : allActivities.slice(0, 3)

  return (
    <div ref={setNodeRef} style={style} className="task-row-shell" {...attributes}>
      <Card
        className={[
          'task-card',
          task.status === 'done' ? 'is-done' : '',
          task.status === 'paused' ? 'is-paused' : '',
        ].filter(Boolean).join(' ')}
        size="small"
        style={{
          cursor: 'grab',
          borderLeftColor: timing.isOverdue ? '#c8554d' : statusConfig[task.status].color,
        }}
        title={
          <div className="task-card-title" {...listeners}>
            <Checkbox
              checked={task.status === 'done'}
              onChange={(event) => {
                event.stopPropagation()
                onStatusChange(task.id, event.target.checked ? 'done' : 'todo')
              }}
              onClick={(event) => event.stopPropagation()}
            />
            <span className="task-title-text">{task.title}</span>
          </div>
        }
        extra={
          <Space className="task-card-actions" size={4} onClick={(event) => event.stopPropagation()} wrap>
            <Tag color={statusColor} className="task-status-tag">
              {timing.isOverdue ? '超时' : statusConfig[task.status].label}
            </Tag>
            <Tag color={priorityConfig[task.priority].color} className="task-status-tag">
              {priorityConfig[task.priority].label}
            </Tag>

            {task.status === 'todo' && (
              <Tooltip title="开始推进任务">
                <Button size="small" type={timing.shouldStart ? 'primary' : 'text'}
                  icon={<PlayCircleOutlined />} onClick={() => onStatusChange(task.id, 'in_progress')}>
                  开始
                </Button>
              </Tooltip>
            )}
            {task.status === 'paused' && (
              <Button size="small" type="text" icon={<PlayCircleOutlined />}
                onClick={() => onStatusChange(task.id, 'in_progress')}>
                恢复
              </Button>
            )}
            {task.status === 'in_progress' && (
              <Button size="small" type="text" icon={<PauseCircleOutlined />} onClick={() => onOpenPause(task)}>
                挂起
              </Button>
            )}
            <Button size="small" type="text" icon={<FileDoneOutlined />} onClick={() => onOpenSummary(task)}>
              写总结
            </Button>
            {task.status !== 'done' && (
              <>
                <Button size="small" type="text" icon={<ClockCircleOutlined />} onClick={() => onOpenDefer(task)}>
                  延期
                </Button>
                <Tooltip title="标记完成">
                  <Button size="small" type="text" icon={<CheckOutlined />}
                    onClick={() => onStatusChange(task.id, 'done')}>
                    完成
                  </Button>
                </Tooltip>
              </>
            )}
            <EditOutlined className="task-icon-action" onClick={() => onEdit(task)} />
            <Popconfirm title="确认删除?" onConfirm={() => onDelete(task.id)}>
              <DeleteOutlined className="task-icon-action danger" />
            </Popconfirm>
          </Space>
        }
      >
        <div className="task-card-content">
          <div className="task-card-main">
            {task.description && <p className="task-description">{task.description}</p>}
            <Space size={[6, 6]} wrap>
              {dateDisplay && <Tag icon={<CalendarOutlined />}>{dateDisplay}</Tag>}
              {timing.isTodayTask && <Tag color="#2f63e9">当日任务</Tag>}
              {timing.shouldStart && <Tag color="#d97706">已到计划开始日期</Tag>}
              {timing.startsInFuture && <Tag>尚未开始</Tag>}
              {timing.isOverdue && <Tag color="#dc2626">已超过预定期限</Tag>}
              {task.status === 'paused' && <Tag color="#9a6b34">暂不进行，可随时恢复</Tag>}
            </Space>
          </div>

          {visibleActivities.length > 0 && (
            <div className="task-activity-panel">
              <div className="task-activity-heading">
                <HistoryOutlined />
                <span>最近过程记录</span>
                {allActivities.length > 3 && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setShowAllActivities(current => !current)}
                  >
                    {showAllActivities ? '收起' : `查看全部 ${allActivities.length}`}
                  </Button>
                )}
              </div>
              {visibleActivities.map(activity => {
                const deferDetail = activity.type === 'defer' ? getDeferDetail(activity) : ''
                return (
                  <div className="task-activity-item" key={activity.id}>
                    <span className="task-activity-mark" style={{ background: activityConfig[activity.type].color }} />
                    <div className="task-activity-copy">
                      <div className="task-activity-meta">
                        <span>{activityConfig[activity.type].label}</span>
                        <time>{activity.summary_date}</time>
                        {deferDetail && <strong>{deferDetail}</strong>}
                        {(activity.type === 'progress_summary' || activity.type === 'daily_summary') && (
                          <span className="task-activity-actions">
                            <Tooltip title="编辑总结">
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => onEditSummary(task, activity)}
                              />
                            </Tooltip>
                            <Popconfirm
                              title="删除这条总结?"
                              description="删除后，报告中也将不再显示该内容。"
                              onConfirm={() => onDeleteSummary(task.id, activity.id)}
                            >
                              <Tooltip title="删除总结">
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                              </Tooltip>
                            </Popconfirm>
                          </span>
                        )}
                      </div>
                      <p>{activity.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [summaryTarget, setSummaryTarget] = useState<Task | null>(null)
  const [editingSummary, setEditingSummary] = useState<TaskActivity | null>(null)
  const [pauseTarget, setPauseTarget] = useState<Task | null>(null)
  const [deferTarget, setDeferTarget] = useState<Task | null>(null)
  const [filters, setFilters] = useState<TaskListFilters>({
    status: '', priority: '', search: '', dateRange: null
  })
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium',
    dueDate: null as string | null, dateRange: null as [string, string] | null, tags: ''
  })
  const [summaryForm, setSummaryForm] = useState({
    type: 'progress_summary' as 'progress_summary' | 'daily_summary',
    content: '',
    summaryDate: dayjs().format('YYYY-MM-DD'),
  })
  const [pauseReason, setPauseReason] = useState('')
  const [deferForm, setDeferForm] = useState({ newDate: '', reason: '' })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const loadTasks = useCallback(async () => {
    const data = await window.api.listTasks({
      priority: filters.priority || undefined,
      dateFrom: filters.dateRange?.[0],
      dateTo: filters.dateRange?.[1],
      search: filters.search || undefined,
    })
    setTasks(sortTasksForList(data))
  }, [filters.priority, filters.dateRange, filters.search])

  useEffect(() => { loadTasks() }, [loadTasks])

  const replaceTask = (updated: Task) => {
    setTasks(current => sortTasksForList(current.map(task => task.id === updated.id ? updated : task)))
  }

  const handleCreate = () => {
    setEditingTask(null)
    setForm({ title: '', description: '', priority: 'medium', dueDate: null, dateRange: null, tags: '' })
    setModalVisible(true)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    const dateRange = task.start_date && task.end_date
      ? [task.start_date, task.end_date] as [string, string]
      : null
    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.due_date,
      dateRange,
      tags: JSON.parse(task.tags || '[]').join(', '),
    })
    setModalVisible(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      message.warning('请输入任务标题')
      return
    }

    const tags = form.tags ? form.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
    try {
      if (editingTask) {
        const updated = await window.api.updateTask(editingTask.id, {
          title: form.title.trim(),
          description: form.description,
          priority: form.priority,
          startDate: form.dateRange ? form.dateRange[0] : null,
          endDate: form.dateRange ? form.dateRange[1] : null,
          dueDate: form.dueDate,
          tags,
        })
        replaceTask(updated)
      } else {
        const created = await window.api.createTask({
          title: form.title.trim(),
          description: form.description,
          priority: form.priority,
          startDate: form.dateRange?.[0],
          endDate: form.dateRange?.[1],
          dueDate: form.dueDate || undefined,
          tags,
        })
        setTasks(current => sortTasksForList([...current, created]))
      }
      setModalVisible(false)
    } catch (error) {
      message.error(getErrorMessage(error, '保存任务失败'))
    }
  }

  const handleDelete = async (id: string) => {
    await window.api.deleteTask(id)
    setTasks(current => current.filter(task => task.id !== id))
    message.success('已删除')
  }

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try {
      const updated = await window.api.updateTask(id, { status })
      replaceTask(updated)
      if (status === 'in_progress') message.success('任务已进入进行中')
      if (status === 'done') message.success('任务已完成')
    } catch (error) {
      message.error(getErrorMessage(error, '更新状态失败'))
    }
  }

  const openSummary = (task: Task) => {
    setSummaryTarget(task)
    setEditingSummary(null)
    setSummaryForm({
      type: task.due_date ? 'daily_summary' : 'progress_summary',
      content: '',
      summaryDate: dayjs().format('YYYY-MM-DD'),
    })
  }

  const openEditSummary = (task: Task, activity: TaskActivity) => {
    if (activity.type !== 'progress_summary' && activity.type !== 'daily_summary') return
    setSummaryTarget(task)
    setEditingSummary(activity)
    setSummaryForm({
      type: activity.type,
      content: activity.content,
      summaryDate: activity.summary_date,
    })
  }

  const closeSummaryModal = () => {
    setSummaryTarget(null)
    setEditingSummary(null)
  }

  const handleSaveSummary = async () => {
    if (!summaryTarget || !summaryForm.content.trim()) {
      message.warning('请填写总结内容')
      return
    }
    try {
      if (editingSummary) {
        await window.api.updateTaskSummary(summaryTarget.id, editingSummary.id, {
          type: summaryForm.type,
          content: summaryForm.content.trim(),
          summaryDate: summaryForm.summaryDate,
        })
      } else {
        await window.api.addTaskSummary(summaryTarget.id, {
          type: summaryForm.type,
          content: summaryForm.content.trim(),
          summaryDate: summaryForm.summaryDate,
        })
      }
      closeSummaryModal()
      await loadTasks()
      message.success(editingSummary
        ? '总结已更新'
        : summaryForm.type === 'daily_summary' ? '当日总结已记录' : '阶段总结已记录')
    } catch (error) {
      message.error(getErrorMessage(error, '保存总结失败'))
    }
  }

  const handleDeleteSummary = async (taskId: string, activityId: string) => {
    try {
      await window.api.deleteTaskSummary(taskId, activityId)
      await loadTasks()
      message.success('总结已删除')
    } catch (error) {
      message.error(getErrorMessage(error, '删除总结失败'))
    }
  }

  const openPause = (task: Task) => {
    setPauseTarget(task)
    setPauseReason('')
  }

  const handlePause = async () => {
    if (!pauseTarget) return
    try {
      const updated = await window.api.updateTask(pauseTarget.id, {
        status: 'paused',
        statusNote: pauseReason.trim() || undefined,
      })
      replaceTask(updated)
      setPauseTarget(null)
      message.success('任务已挂起')
    } catch (error) {
      message.error(getErrorMessage(error, '挂起任务失败'))
    }
  }

  const openDefer = (task: Task) => {
    const currentDate = task.end_date || task.due_date || dayjs().format('YYYY-MM-DD')
    setDeferTarget(task)
    setDeferForm({ newDate: dayjs(currentDate).add(1, 'day').format('YYYY-MM-DD'), reason: '' })
  }

  const handleDefer = async () => {
    if (!deferTarget || !deferForm.newDate) {
      message.warning('请选择延期后的日期')
      return
    }
    try {
      const updated = await window.api.deferTask(deferTarget.id, {
        newDate: deferForm.newDate,
        reason: deferForm.reason.trim() || undefined,
      })
      replaceTask(updated)
      setDeferTarget(null)
      message.success('任务计划已延期并记录原因')
    } catch (error) {
      message.error(getErrorMessage(error, '延期任务失败'))
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex(task => task.id === String(active.id))
      const newIndex = tasks.findIndex(task => task.id === String(over.id))
      if (oldIndex < 0 || newIndex < 0) return
      const reordered = [...tasks]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)
      const sorted = sortTasksForList(reordered)
      setTasks(sorted)
      await window.api.reorderTasks(sorted.map(task => task.id))
    }
  }

  const stats = {
    total: tasks.length,
    todo: tasks.filter(task => task.status === 'todo').length,
    inProgress: tasks.filter(task => task.status === 'in_progress').length,
    paused: tasks.filter(task => task.status === 'paused').length,
    done: tasks.filter(task => task.status === 'done').length,
    overdue: tasks.filter(task => getTaskTiming(task).isOverdue).length,
  }

  const visibleTasks = useMemo(() => {
    const visible = tasks.filter(task => {
      if (!filters.status) return true
      if (filters.status === 'overdue') return getTaskTiming(task).isOverdue
      return task.status === filters.status
    })
    return sortTasksForList(visible)
  }, [tasks, filters.status])

  const statCards: Array<{ key: TaskStatusFilter; label: string; value: number; color: string }> = [
    { key: '', label: '全部', value: stats.total, color: '#68717f' },
    { key: 'todo', label: '待办', value: stats.todo, color: '#c88932' },
    { key: 'in_progress', label: '进行中', value: stats.inProgress, color: '#2f63e9' },
    { key: 'paused', label: '已挂起', value: stats.paused, color: '#9a6b34' },
    { key: 'done', label: '已完成', value: stats.done, color: '#5f8b74' },
    { key: 'overdue', label: '超时', value: stats.overdue, color: '#c8554d' },
  ]

  return (
    <div className="page-shell task-page">
      <div className="task-command-panel">
        <div className="task-page-heading">
          <div>
            <h1 className="page-title">工作清单</h1>
            <p className="page-kicker">推进任务，也记录过程。阶段总结、挂起和延期都会进入工作报告。</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>添加任务</Button>
        </div>

        <div className="task-stat-grid">
          {statCards.map(({ key, label, value, color }) => {
            const active = filters.status === key
            return (
              <button
                key={key || 'all'}
                type="button"
                className={`task-stat-card${active ? ' active' : ''}`}
                aria-pressed={active}
                onClick={() => setFilters(current => ({ ...current, status: key }))}
                style={{ '--stat-color': color, '--stat-soft': `${color}12` } as CSSProperties}
              >
                <div className="task-stat-label">{label}</div>
                <div className="task-stat-value">{value}</div>
              </button>
            )
          })}
        </div>

        <Space className="task-filter-row" wrap size="small">
          <Input
            placeholder="搜索任务、描述或总结..." prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="状态筛选"
            value={filters.status || undefined}
            onChange={(value) => setFilters({ ...filters, status: (value || '') as TaskStatusFilter })}
            allowClear
            style={{ width: 120 }}
            options={[
              { value: 'todo', label: '待办' },
              { value: 'in_progress', label: '进行中' },
              { value: 'paused', label: '已挂起' },
              { value: 'done', label: '已完成' },
              { value: 'overdue', label: '超时' },
            ]}
          />
          <Select
            placeholder="优先级筛选"
            value={filters.priority || undefined}
            onChange={(value) => setFilters({ ...filters, priority: value || '' })}
            allowClear
            style={{ width: 120 }}
            options={[
              { value: 'high', label: '高优先级' },
              { value: 'medium', label: '中优先级' },
              { value: 'low', label: '低优先级' },
            ]}
          />
          <RangePicker
            value={filters.dateRange ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])] : null}
            onChange={(dates) => {
              setFilters({
                ...filters,
                dateRange: dates?.[0] && dates?.[1]
                  ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
                  : null,
              })
            }}
            allowClear
            placeholder={['开始日期', '结束日期']}
            style={{ width: 240 }}
          />
        </Space>
      </div>

      <div className="task-list-scroll">
        {visibleTasks.length === 0 ? (
          <Empty description={tasks.length === 0 ? '暂无任务' : '暂无匹配任务'} style={{ marginTop: 80 }}>
            <Button type="primary" onClick={handleCreate}>添加第一个任务</Button>
          </Empty>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
              {visibleTasks.map(task => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onOpenSummary={openSummary}
                  onEditSummary={openEditSummary}
                  onDeleteSummary={handleDeleteSummary}
                  onOpenPause={openPause}
                  onOpenDefer={openDefer}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Modal
        title={editingTask ? '编辑任务' : '新建任务'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={560}
      >
        <div className="task-form-field">
          <label>标题 *</label>
          <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}
            onPressEnter={handleSave} placeholder="任务标题" />
        </div>
        <div className="task-form-field">
          <label>描述</label>
          <Input.TextArea value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={3} placeholder="说明任务目标、范围或交付结果（可选）" />
        </div>
        <div className="task-form-row">
          <div className="task-form-field">
            <label>优先级</label>
            <Select value={form.priority} onChange={(value) => setForm({ ...form, priority: value })}
              style={{ width: '100%' }}
              options={[
                { value: 'high', label: '高' },
                { value: 'medium', label: '中' },
                { value: 'low', label: '低' },
              ]}
            />
          </div>
          <div className="task-form-field">
            <label>截止日期（单日）</label>
            <DatePicker
              value={form.dueDate ? dayjs(form.dueDate) : null}
              onChange={(date) => setForm({
                ...form,
                dueDate: date ? date.format('YYYY-MM-DD') : null,
                dateRange: null,
              })}
              disabled={Boolean(form.dateRange)}
              style={{ width: '100%' }}
              placeholder="选择日期"
            />
          </div>
        </div>
        <div className="task-form-field">
          <label>多日任务（日期范围）</label>
          <RangePicker
            value={form.dateRange ? [dayjs(form.dateRange[0]), dayjs(form.dateRange[1])] : null}
            onChange={(dates) => setForm({
              ...form,
              dateRange: dates?.[0] && dates?.[1]
                ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
                : null,
              dueDate: null,
            })}
            disabled={Boolean(form.dueDate)}
            style={{ width: '100%' }}
            placeholder={['开始日期', '结束日期']}
          />
        </div>
        <div className="task-form-field">
          <label>标签（逗号分隔）</label>
          <Input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })}
            placeholder="如：项目A, 紧急" />
        </div>
      </Modal>

      <Modal
        title={`${editingSummary ? '编辑总结' : '记录总结'} · ${summaryTarget?.title || ''}`}
        open={Boolean(summaryTarget)}
        onOk={handleSaveSummary}
        onCancel={closeSummaryModal}
        okText={editingSummary ? '保存修改' : '保存总结'}
        cancelText="取消"
        width={560}
      >
        <div className="task-form-row">
          <div className="task-form-field">
            <label>总结类型</label>
            <Select
              value={summaryForm.type}
              onChange={(type) => setSummaryForm({ ...summaryForm, type })}
              style={{ width: '100%' }}
              options={[
                { value: 'progress_summary', label: '阶段总结' },
                { value: 'daily_summary', label: '当日总结' },
              ]}
            />
          </div>
          <div className="task-form-field">
            <label>记录日期</label>
            <DatePicker
              value={dayjs(summaryForm.summaryDate)}
              onChange={(date) => setSummaryForm({
                ...summaryForm,
                summaryDate: date ? date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
              })}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div className="task-form-field">
          <label>过程与结果</label>
          <Input.TextArea
            value={summaryForm.content}
            onChange={(event) => setSummaryForm({ ...summaryForm, content: event.target.value })}
            rows={6}
            placeholder="写下本阶段完成了什么、发生了哪些调整、当前结果和下一步。"
          />
          <p className="task-form-hint">当日总结为可选记录，不影响任务完成状态。</p>
        </div>
      </Modal>

      <Modal
        title={`挂起任务 · ${pauseTarget?.title || ''}`}
        open={Boolean(pauseTarget)}
        onOk={handlePause}
        onCancel={() => setPauseTarget(null)}
        okText="确认挂起"
        cancelText="取消"
      >
        <p className="task-modal-intro">挂起后任务会保留在清单中，但不计为超时，可随时恢复进行。</p>
        <div className="task-form-field">
          <label>挂起说明（可选）</label>
          <Input.TextArea value={pauseReason} onChange={(event) => setPauseReason(event.target.value)}
            rows={4} placeholder="例如：等待外部反馈，收到确认后继续。" />
        </div>
      </Modal>

      <Modal
        title={`延期任务 · ${deferTarget?.title || ''}`}
        open={Boolean(deferTarget)}
        onOk={handleDefer}
        onCancel={() => setDeferTarget(null)}
        okText="确认延期"
        cancelText="取消"
      >
        <div className="task-form-field">
          <label>新的计划日期 *</label>
          <DatePicker
            value={deferForm.newDate ? dayjs(deferForm.newDate) : null}
            onChange={(date) => setDeferForm({
              ...deferForm,
              newDate: date ? date.format('YYYY-MM-DD') : '',
            })}
            style={{ width: '100%' }}
          />
        </div>
        <div className="task-form-field">
          <label>延期原因（可选）</label>
          <Input.TextArea value={deferForm.reason}
            onChange={(event) => setDeferForm({ ...deferForm, reason: event.target.value })}
            rows={4} placeholder="说明延期原因、依赖变化或新的安排。" />
          <p className="task-form-hint">原日期、新日期和原因会写入任务动态，并在对应报告中体现。</p>
        </div>
      </Modal>
    </div>
  )
}
