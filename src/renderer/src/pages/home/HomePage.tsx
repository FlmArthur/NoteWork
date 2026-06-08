import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, List, Tag, Empty, Spin, Button } from 'antd'
import {
  BookOutlined, CheckSquareOutlined, CalendarOutlined,
  FileTextOutlined, RightOutlined, PushpinOutlined
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
      }
      recentDocs = recentDocs
        .sort((a: any, b: any) => (b.updated_at || '').localeCompare(a.updated_at || ''))
        .slice(0, 5)

      const tasks = await window.api.listTasks({})
      const tasksTodo = tasks.filter((t: any) => t.status === 'todo').length
      const tasksDone = tasks.filter((t: any) => t.status === 'done').length
      const upcomingTasks = tasks
        .filter((t: any) => t.status !== 'done')
        .sort((a: any, b: any) =>
          (a.end_date || a.due_date || '9999-12-31').localeCompare(b.end_date || b.due_date || '9999-12-31')
        )
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
    <div className="page-shell home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="home-eyebrow">今天</div>
          <div className="home-date-row">
            <h1>{dayjs().format('YYYY年M月D日')}</h1>
            <span>{dayjs().format('dddd')}</span>
          </div>
          <p>把今天要推进的事情放在眼前，其余内容安静地待在身后。</p>
        </div>
        <div className="home-actions">
          <Button icon={<FileTextOutlined />} onClick={() => navigate('/notebook')}>写文档</Button>
          <Button type="primary" icon={<CheckSquareOutlined />} onClick={() => navigate('/tasks')}>查看清单</Button>
        </div>
      </section>

      <div className="metric-grid">
        {metricCards.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="surface-card metric-card" onClick={() => navigate(metric.route)}>
              <div className="metric-card-head">
                <span className="metric-label">{metric.label}</span>
                <span className="metric-icon" style={{ color: metric.color, background: `${metric.color}12` }}>
                  <Icon />
                </span>
              </div>
              <div className="metric-value" style={{ color: metric.color }}>{metric.value}</div>
              <div className="metric-caption">{metric.caption}</div>
            </div>
          )
        })}
      </div>

      <div className="home-content-grid">
        <Card
          className="surface-card home-focus-card"
          title={<span><CheckSquareOutlined /> 今日重点</span>}
          extra={<a onClick={() => navigate('/tasks')}>全部任务 <RightOutlined /></a>}
        >
          {stats.upcomingTasks.length === 0 ? (
            <Empty description="今天没有待办任务" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Button type="primary" onClick={() => navigate('/tasks')}>添加任务</Button>
            </Empty>
          ) : (
            <List
              dataSource={stats.upcomingTasks}
              renderItem={(task: any) => {
                const deadline = task.end_date || task.due_date
                return (
                  <List.Item className="focus-task-row" onClick={() => navigate('/tasks')}>
                    <span className={`focus-check${task.status === 'in_progress' ? ' active' : ''}`} />
                    <List.Item.Meta
                      title={<span>{task.title}</span>}
                      description={
                        <span>
                          {task.status === 'in_progress' ? '正在进行' : '待开始'}
                          {deadline ? ` · ${dayjs(deadline).format('M月D日')}` : ' · 暂无期限'}
                        </span>
                      }
                    />
                    <Tag className={`priority-tag priority-${task.priority}`}>
                      {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                    </Tag>
                  </List.Item>
                )
              }}
            />
          )}
        </Card>

        <div className="home-side-stack">
          <Card
            className="surface-card home-compact-card"
            title={<span><FileTextOutlined /> 最近文档</span>}
            extra={<a onClick={() => navigate('/notebook')}>全部 <RightOutlined /></a>}
          >
            {stats.recentDocs.length === 0 ? (
              <Empty description="暂无文档" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={stats.recentDocs.slice(0, 3)}
                renderItem={(doc: any) => (
                  <List.Item className="recent-doc-row" onClick={() => navigate('/notebook')}>
                    <span className="document-glyph"><FileTextOutlined /></span>
                  <List.Item.Meta
                    title={<span>{doc.title}</span>}
                    description={<span>{dayjs(doc.updated_at).format('M月D日 HH:mm')}</span>}
                  />
                </List.Item>
              )}
            />
            )}
          </Card>

          <Card
            className="surface-card home-compact-card today-note-card"
            title={<span><PushpinOutlined /> 今日便签</span>}
            extra={<a onClick={() => navigate('/calendar')}>日历 <RightOutlined /></a>}
          >
            {stats.todayNotes.length === 0 ? (
              <div className="quiet-empty" onClick={() => navigate('/calendar')}>
                今天还没有便签，留一点空间给临时想法。
              </div>
            ) : (
              <List
                size="small"
                dataSource={stats.todayNotes.slice(0, 2)}
                renderItem={(note: any) => (
                  <List.Item className="today-note-row" onClick={() => navigate('/calendar')}>
                    <span className="note-color" style={{ background: note.color }} />
                    <List.Item.Meta title={<span>{note.title}</span>} description={note.content || '日历便签'} />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
