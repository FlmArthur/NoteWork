import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, List, Tag, Empty, Spin, Button } from 'antd'
import {
  BookOutlined, CheckSquareOutlined, CalendarOutlined,
  FileTextOutlined, RightOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../../stores/auth.store'
import dayjs from 'dayjs'

interface NoteStat {
  notebooks: number
  documents: number
  tasks: number
  tasksTodo: number
  tasksDone: number
  todayNotes: any[]
  upcomingTasks: any[]
  recentDocs: any[]
}

export default function HomePage() {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.userId)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<NoteStat>({
    notebooks: 0, documents: 0, tasks: 0, tasksTodo: 0, tasksDone: 0,
    todayNotes: [], upcomingTasks: [], recentDocs: []
  })

  const loadStats = useCallback(async () => {
    try {
      const notebooks = await window.api.listNotebooks()
      const today = dayjs().format('YYYY-MM-DD')
      const todayNotes = await window.api.getNotesByDate(today)

      let totalDocs = 0
      let recentDocs: any[] = []
      for (const nb of notebooks) {
        const docs = await window.api.listDocuments(nb.id)
        totalDocs += docs.length
        recentDocs = [...recentDocs, ...docs]
        if (recentDocs.length >= 5) break
      }
      recentDocs = recentDocs.slice(0, 5)

      const tasks = await window.api.listTasks({})
      const tasksTodo = tasks.filter((t: any) => t.status === 'todo').length
      const tasksDone = tasks.filter((t: any) => t.status === 'done').length
      const upcomingTasks = tasks
        .filter((t: any) => t.status !== 'done' && t.due_date)
        .sort((a: any, b: any) => (a.due_date || '').localeCompare(b.due_date || ''))
        .slice(0, 5)

      setStats({
        notebooks: notebooks.length,
        documents: totalDocs,
        tasks: tasks.length,
        tasksTodo,
        tasksDone,
        todayNotes,
        upcomingTasks,
        recentDocs,
      })
    } catch (e) {
      // Keep the dashboard usable even if one data source fails.
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { loadStats() }, [loadStats])

  if (loading) {
    return (
      <div className="empty-workspace">
        <Spin size="large" />
      </div>
    )
  }

  const completionRate = stats.tasks === 0 ? 0 : Math.round((stats.tasksDone / stats.tasks) * 100)
  const metricCards = [
    { label: '笔记本', value: stats.notebooks, caption: '沉淀中的知识空间', icon: BookOutlined, route: '/notebook', color: '#2563eb' },
    { label: '文档', value: stats.documents, caption: '可继续编辑的内容', icon: FileTextOutlined, route: '/notebook', color: '#0891b2' },
    { label: '待办任务', value: stats.tasksTodo, caption: '需要推进的事项', icon: CheckSquareOutlined, route: '/tasks', color: '#dc2626' },
    { label: '完成率', value: `${completionRate}%`, caption: `${stats.tasksDone}/${stats.tasks || 0} 项已完成`, icon: CalendarOutlined, route: '/report', color: '#059669' },
  ]

  return (
    <div className="page-shell">
      <div className="glass-panel" style={{ borderRadius: 8, padding: 22, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title">{dayjs().format('YYYY年M月D日 dddd')}</h1>
            <p className="page-kicker">今天的笔记、日程和任务都在这里汇合。</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button icon={<FileTextOutlined />} onClick={() => navigate('/notebook')}>写文档</Button>
            <Button type="primary" icon={<CheckSquareOutlined />} onClick={() => navigate('/tasks')}>看清单</Button>
          </div>
        </div>
      </div>

      <div className="metric-grid" style={{ marginBottom: 18 }}>
        {metricCards.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="surface-card metric-card" onClick={() => navigate(metric.route)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                <span className="metric-label">{metric.label}</span>
                <Icon style={{ color: metric.color, fontSize: 22 }} />
              </div>
              <div className="metric-value" style={{ color: metric.color, position: 'relative', zIndex: 1 }}>{metric.value}</div>
              <div className="metric-caption" style={{ position: 'relative', zIndex: 1 }}>{metric.caption}</div>
            </div>
          )
        })}
      </div>

      <div className="content-grid-2">
        <Card
          className="surface-card"
          title={<span><FileTextOutlined style={{ marginRight: 8, color: 'var(--color-primary)' }} />最近文档</span>}
          extra={<a onClick={() => navigate('/notebook')} style={{ fontSize: 12 }}>查看全部 <RightOutlined /></a>}
        >
          {stats.recentDocs.length === 0 ? (
            <Empty description="暂无文档" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button type="primary" onClick={() => navigate('/notebook')}>创建文档</Button>
            </Empty>
          ) : (
            <List
              size="small"
              dataSource={stats.recentDocs}
              renderItem={(doc: any) => (
                <List.Item style={{ cursor: 'pointer', padding: '10px 0' }}
                  onClick={() => navigate('/notebook')}>
                  <List.Item.Meta
                    avatar={<FileTextOutlined style={{ color: 'var(--color-primary)' }} />}
                    title={<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{doc.title}</span>}
                    description={<span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{dayjs(doc.updated_at).format('MM-DD HH:mm')}</span>}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card
          className="surface-card"
          title={<span><CheckSquareOutlined style={{ marginRight: 8, color: 'var(--color-primary)' }} />待办任务</span>}
          extra={<a onClick={() => navigate('/tasks')} style={{ fontSize: 12 }}>查看全部 <RightOutlined /></a>}
        >
          {stats.upcomingTasks.length === 0 ? (
            <Empty description="暂无待办任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              size="small"
              dataSource={stats.upcomingTasks}
              renderItem={(task: any) => (
                <List.Item style={{ cursor: 'pointer', padding: '10px 0' }}
                  onClick={() => navigate('/tasks')}>
                  <List.Item.Meta
                    avatar={
                      <Tag color={task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#d97706' : '#059669'}
                        style={{ fontSize: 10, margin: 0 }}>
                        {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                      </Tag>
                    }
                    title={<span style={{ fontSize: 14, fontWeight: 600 }}>{task.title}</span>}
                    description={
                      task.due_date
                        ? <span style={{ fontSize: 12, color: task.status === 'in_progress' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                          {task.status === 'in_progress' ? '进行中 ' : ''}截止: {task.due_date}
                        </span>
                        : null
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
