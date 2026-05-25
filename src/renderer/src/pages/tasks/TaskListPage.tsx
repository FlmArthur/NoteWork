import { useState, useEffect, useCallback } from 'react'
import { Button, Input, Select, Card, Tag, Modal, DatePicker, Popconfirm, message, Empty, Space, Checkbox, Tooltip } from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  CalendarOutlined, PlayCircleOutlined, CheckOutlined
} from '@ant-design/icons'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuthStore } from '../../stores/auth.store'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface Task {
  id: string; title: string; description: string; priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'done'; start_date: string | null; end_date: string | null
  due_date: string | null; tags: string; sort_order: number; completed_at: string | null
  created_at: string; updated_at: string
}

type TaskStatus = Task['status']

const priorityConfig = {
  high: { label: '高', color: '#dc2626' },
  medium: { label: '中', color: '#d97706' },
  low: { label: '低', color: '#059669' },
}

const statusConfig = {
  todo: { label: '待办', color: '#64748b' },
  in_progress: { label: '进行中', color: '#2563eb' },
  done: { label: '已完成', color: '#059669' },
}

function getTaskTiming(task: Task, today = dayjs().format('YYYY-MM-DD')) {
  const isMultiDay = Boolean(task.start_date && task.end_date)
  const deadline = task.end_date || task.due_date
  const isDone = task.status === 'done'
  const isOverdue = Boolean(deadline && deadline < today && !isDone)
  const shouldStart = Boolean(isMultiDay && task.start_date && task.start_date <= today && task.status === 'todo')
  const startsInFuture = Boolean(isMultiDay && task.start_date && task.start_date > today && task.status === 'todo')

  return { isMultiDay, deadline, isOverdue, shouldStart, startsInFuture }
}

function SortableTask({ task, onEdit, onDelete, onStatusChange }: {
  task: Task
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dateDisplay = task.start_date && task.end_date
    ? `${task.start_date} ~ ${task.end_date}`
    : task.due_date || ''
  const timing = getTaskTiming(task)
  const statusColor = timing.isOverdue ? '#dc2626' : statusConfig[task.status].color

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className="task-card"
        size="small"
        style={{
          cursor: 'grab',
          opacity: task.status === 'done' ? 0.6 : 1,
          borderLeft: `4px solid ${timing.isOverdue ? '#dc2626' : priorityConfig[task.priority].color}`,
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} {...listeners}>
            <Checkbox
              checked={task.status === 'done'}
              onChange={(e) => {
                e.stopPropagation()
                onStatusChange(task.id, e.target.checked ? 'done' : 'todo')
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span style={{
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
              fontSize: 14, flex: 1
            }}>
              {task.title}
            </span>
          </div>
        }
        extra={
          <Space size={4} onClick={(e) => e.stopPropagation()} wrap>
            <Tag color={statusColor} style={{ fontSize: 11, marginRight: 0 }}>
              {timing.isOverdue ? '超时' : statusConfig[task.status].label}
            </Tag>
            {timing.shouldStart && (
              <Tag color="#d97706" style={{ fontSize: 11, marginRight: 0 }}>应开始</Tag>
            )}
            {timing.startsInFuture && (
              <Tag color="#64748b" style={{ fontSize: 11, marginRight: 0 }}>未开始</Tag>
            )}
            <Tag color={priorityConfig[task.priority].color} style={{ fontSize: 11, marginRight: 0 }}>
              {priorityConfig[task.priority].label}
            </Tag>
            {timing.isMultiDay && task.status === 'todo' && (
              <Tooltip title={timing.startsInFuture ? '提前开始任务' : '开始任务'}>
                <Button
                  size="small"
                  type={timing.shouldStart ? 'primary' : 'text'}
                  icon={<PlayCircleOutlined />}
                  onClick={() => onStatusChange(task.id, 'in_progress')}
                >
                  开始
                </Button>
              </Tooltip>
            )}
            {task.status !== 'done' && (
              <Tooltip title="标记完成">
                <Button
                  size="small"
                  type="text"
                  icon={<CheckOutlined />}
                  onClick={() => onStatusChange(task.id, 'done')}
                >
                  完成
                </Button>
              </Tooltip>
            )}
            <EditOutlined style={{ cursor: 'pointer', fontSize: 17, color: '#555', padding: 2 }} onClick={() => onEdit(task)} />
            <Popconfirm title="确认删除?" onConfirm={() => onDelete(task.id)}>
              <DeleteOutlined style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: 17, padding: 2 }} />
            </Popconfirm>
          </Space>
        }
      >
        {task.description && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 8 }}>{task.description}</p>
        )}
        {dateDisplay && (
          <Tag icon={<CalendarOutlined />} style={{ fontSize: 11 }}>{dateDisplay}</Tag>
        )}
        {timing.shouldStart && (
          <Tag color="#d97706" style={{ fontSize: 11 }}>已到计划开始日期，请开始任务</Tag>
        )}
        {timing.isOverdue && (
          <Tag color="#dc2626" style={{ fontSize: 11 }}>已超过预定期限</Tag>
        )}
      </Card>
    </div>
  )
}

export default function TaskListPage() {
  const userId = useAuthStore((s) => s.userId)
  const [tasks, setTasks] = useState<Task[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' })
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium' as string,
    dueDate: null as string | null, dateRange: null as [string, string] | null,
    tags: ''
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const loadTasks = useCallback(async () => {
    const data = await window.api.listTasks({
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      search: filters.search || undefined,
    })
    setTasks(data)
  }, [filters])

  useEffect(() => { loadTasks() }, [loadTasks])

  const handleCreate = () => {
    setEditingTask(null)
    setForm({ title: '', description: '', priority: 'medium', dueDate: null, dateRange: null, tags: '' })
    setModalVisible(true)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    const dateRange = task.start_date && task.end_date ? [task.start_date, task.end_date] as [string, string] : null
    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.due_date,
      dateRange,
      tags: JSON.parse(task.tags || '[]').join(', ')
    })
    setModalVisible(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { message.warning('请输入任务标题'); return }

    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []

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
      setTasks(tasks.map(t => t.id === updated.id ? updated : t))
    } else {
      const created = await window.api.createTask({
        title: form.title.trim(),
        description: form.description,
        priority: form.priority,
        startDate: form.dateRange ? form.dateRange[0] : undefined,
        endDate: form.dateRange ? form.dateRange[1] : undefined,
        dueDate: form.dueDate || undefined,
        tags,
      })
      setTasks([...tasks, created])
    }
    setModalVisible(false)
  }

  const handleDelete = async (id: string) => {
    await window.api.deleteTask(id)
    setTasks(tasks.filter(t => t.id !== id))
    message.success('已删除')
  }

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    const updated = await window.api.updateTask(id, { status })
    setTasks(tasks.map(t => t.id === updated.id ? updated : t))
    if (status === 'in_progress') message.success('任务已开始')
    if (status === 'done') message.success('任务已完成')
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (active.id !== over.id) {
      const oldIdx = tasks.findIndex(t => t.id === active.id)
      const newIdx = tasks.findIndex(t => t.id === over.id)
      const reordered = [...tasks]
      const [moved] = reordered.splice(oldIdx, 1)
      reordered.splice(newIdx, 0, moved)
      setTasks(reordered)
      await window.api.reorderTasks(reordered.map(t => t.id))
    }
  }

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => getTaskTiming(t).isOverdue).length,
  }

  return (
    <div className="page-shell" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="glass-panel" style={{ borderRadius: 8, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title">工作清单</h1>
            <p className="page-kicker">用优先级、时间和拖拽顺序整理接下来要做的事。</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>添加任务</Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
          {[
            ['全部', stats.total, '#64748b'],
            ['待办', stats.todo, '#d97706'],
            ['进行中', stats.inProgress, '#2563eb'],
            ['已完成', stats.done, '#059669'],
            ['超时', stats.overdue, '#dc2626'],
          ].map(([label, value, color]) => (
            <div key={label} className="surface-card" style={{ padding: '12px 14px' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 650 }}>{label}</div>
              <div style={{ color, fontSize: 24, fontWeight: 750, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            </div>
          ))}
        </div>

        <Space wrap size="small">
          <Input
            placeholder="搜索任务..." prefix={<SearchOutlined />}
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ width: 220 }} allowClear
          />
          <Select
            placeholder="状态筛选" value={filters.status || undefined}
            onChange={(v) => setFilters({ ...filters, status: v || '' })}
            allowClear style={{ width: 120 }}
            options={[
              { value: 'todo', label: '待办' },
              { value: 'in_progress', label: '进行中' },
              { value: 'done', label: '已完成' },
            ]}
          />
          <Select
            placeholder="优先级筛选" value={filters.priority || undefined}
            onChange={(v) => setFilters({ ...filters, priority: v || '' })}
            allowClear style={{ width: 120 }}
            options={[
              { value: 'high', label: '高优先级' },
              { value: 'medium', label: '中优先级' },
              { value: 'low', label: '低优先级' },
            ]}
          />
        </Space>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tasks.length === 0 ? (
          <Empty description="暂无任务" style={{ marginTop: 80 }}>
            <Button type="primary" onClick={handleCreate}>添加第一个任务</Button>
          </Empty>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tasks.map(task => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        title={editingTask ? '编辑任务' : '新建任务'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={560}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>标题 *</label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            onPressEnter={handleSave} placeholder="任务标题" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>描述</label>
          <Input.TextArea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2} placeholder="任务描述（可选）" />
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>优先级</label>
            <Select value={form.priority}
              onChange={(v) => setForm({ ...form, priority: v })}
              style={{ width: '100%' }}
              options={[
                { value: 'high', label: <span><span className="priority-dot" style={{ background: priorityConfig.high.color, marginRight: 6 }} />高</span> },
                { value: 'medium', label: <span><span className="priority-dot" style={{ background: priorityConfig.medium.color, marginRight: 6 }} />中</span> },
                { value: 'low', label: <span><span className="priority-dot" style={{ background: priorityConfig.low.color, marginRight: 6 }} />低</span> },
              ]}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>截止日期（单日）</label>
            <DatePicker
              value={form.dueDate ? dayjs(form.dueDate) : null}
              onChange={(d) => setForm({ ...form, dueDate: d ? d.format('YYYY-MM-DD') : null, dateRange: null })}
              disabled={!!form.dateRange}
              style={{ width: '100%' }} placeholder="选择日期"
            />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>多日任务（日期范围）</label>
          <RangePicker
            value={form.dateRange ? [dayjs(form.dateRange[0]), dayjs(form.dateRange[1])] : null}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setForm({ ...form, dateRange: [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')], dueDate: null })
              } else {
                setForm({ ...form, dateRange: null })
              }
            }}
            disabled={!!form.dueDate}
            style={{ width: '100%' }} placeholder={['开始日期', '结束日期']}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>标签（逗号分隔）</label>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="如：项目A, 紧急" />
        </div>
      </Modal>
    </div>
  )
}
