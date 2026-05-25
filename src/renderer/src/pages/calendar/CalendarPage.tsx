import { useState, useEffect, useCallback } from 'react'
import { Button, Modal, Input, Card, Tag, Popconfirm, Empty, message, Tabs } from 'antd'
import {
  PlusOutlined, LeftOutlined, RightOutlined, EditOutlined,
  DeleteOutlined, EnvironmentOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../../stores/auth.store'

interface Note {
  id: string; date: string; title: string; content: string; color: string
  tags: string; created_at: string; updated_at: string
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const NOTE_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']

export default function CalendarPage() {
  const userId = useAuthStore((s) => s.userId)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [noteForm, setNoteForm] = useState({ title: '', content: '', color: '#FFD700', tags: '' })
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const loadNotes = useCallback(async () => {
    const data = await window.api.listCalendarNotes(year, month + 1)
    setNotes(data)
  }, [year, month])

  useEffect(() => { loadNotes() }, [loadNotes])

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToday = () => setCurrentDate(new Date())

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  // Build month grid
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const calendarDays: { day: number; date: string; isCurrentMonth: boolean }[] = []

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    calendarDays.push({ day: d, date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, isCurrentMonth: false })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      day: d,
      date: `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
      isCurrentMonth: true
    })
  }

  const remaining = 42 - calendarDays.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 1 : month + 2
    const y = month === 11 ? year + 1 : year
    calendarDays.push({ day: d, date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, isCurrentMonth: false })
  }

  const getNotesForDate = (date: string) => notes.filter(n => n.date === date)

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
  }

  const handleCreateNote = () => {
    setEditingNote(null)
    setNoteForm({ title: '', content: '', color: '#FFD700', tags: '' })
    setModalVisible(true)
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
    setNoteForm({
      title: note.title,
      content: note.content,
      color: note.color,
      tags: JSON.parse(note.tags || '[]').join(', ')
    })
    setModalVisible(true)
  }

  const handleSaveNote = async () => {
    if (!noteForm.title.trim()) { message.warning('请输入便签标题'); return }
    if (!selectedDate) { message.warning('请先选择日期'); return }

    const tags = noteForm.tags ? noteForm.tags.split(',').map(t => t.trim()).filter(Boolean) : []

    if (editingNote) {
      const updated = await window.api.updateNote(editingNote.id, {
        title: noteForm.title.trim(),
        content: noteForm.content,
        color: noteForm.color,
        tags
      })
      setNotes(notes.map(n => n.id === updated.id ? updated : n))
    } else {
      const created = await window.api.createNote({
        date: selectedDate,
        title: noteForm.title.trim(),
        content: noteForm.content,
        color: noteForm.color,
        tags
      })
      setNotes([...notes, created])
    }
    setModalVisible(false)
  }

  const handleDeleteNote = async (id: string) => {
    await window.api.deleteNote(id)
    setNotes(notes.filter(n => n.id !== id))
    message.success('已删除')
  }

  const selectedDateNotes = selectedDate ? notes.filter(n => n.date === selectedDate) : []

  function renderWeekView() {
    const dayOfWeek = currentDate.getDay()
    const sunday = new Date(currentDate)
    sunday.setDate(currentDate.getDate() - dayOfWeek)

    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      days.push(d)
    }

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
          {days.map((d, i) => {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            const dayNotes = getNotesForDate(dateStr)
            return (
              <div key={i} onClick={() => { setSelectedDate(dateStr); handleDateClick(dateStr) }}
                className={`calendar-day${selectedDate === dateStr ? ' selected' : ''}`}
                style={{ minHeight: 130 }}>
                <div style={{ fontWeight: 700, color: i === 0 || i === 6 ? 'var(--color-danger)' : 'var(--color-text)', marginBottom: 6 }}>
                  {WEEKDAYS[i]} {d.getDate()}
                </div>
                {dayNotes.slice(0, 3).map(n => (
                  <div key={n.id} className="note-pill" style={{ background: n.color }}>{n.title}</div>
                ))}
                {dayNotes.length > 3 && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>+{dayNotes.length - 3} 更多</div>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderDayView() {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(currentDate.getDate()).padStart(2,'0')}`
    const dayNotes = getNotesForDate(dateStr)

    return (
      <div>
        <h3 className="section-title" style={{ marginBottom: 16 }}>
          {year}年{month+1}月{currentDate.getDate()}日 {WEEKDAYS[currentDate.getDay()]}
        </h3>
        {dayNotes.length === 0 ? (
          <Empty description="当天没有便签" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayNotes.map(n => (
              <Card key={n.id} size="small" style={{ borderLeft: `4px solid ${n.color}` }}
                extra={
                  <span>
                    <EditOutlined style={{ marginRight: 8, cursor: 'pointer' }} onClick={() => handleEditNote(n)} />
                    <Popconfirm title="确认删除?" onConfirm={() => handleDeleteNote(n.id)}>
                      <DeleteOutlined style={{ cursor: 'pointer', color: 'var(--color-danger)' }} />
                    </Popconfirm>
                  </span>
                }
              >
                <strong>{n.title}</strong>
                <p style={{ marginTop: 4, color: '#666', whiteSpace: 'pre-wrap' }}>{n.content}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="calendar-page">
      <div className="calendar-workspace glass-panel" style={{ borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button icon={<LeftOutlined />} onClick={prevMonth} />
            <span style={{ fontSize: 20, fontWeight: 750, color: 'var(--color-text)', minWidth: 112 }}>
              {year}年 {month + 1}月
            </span>
            <Button icon={<RightOutlined />} onClick={nextMonth} />
            <Button onClick={goToday}>今天</Button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Tabs
              activeKey={viewMode}
              onChange={(k) => setViewMode(k as 'month' | 'week' | 'day')}
              items={[
                { key: 'month', label: '月' },
                { key: 'week', label: '周' },
                { key: 'day', label: '日' },
              ]}
              style={{ marginBottom: 0 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNote}>
              添加便签
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        {viewMode === 'month' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 700, padding: '6px 0 10px', color: 'var(--color-text-muted)' }}>
              {WEEKDAYS.map((w, i) => (
                <div key={w} style={{ color: i === 0 || i === 6 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{w}</div>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((d, idx) => {
                const dayNotes = getNotesForDate(d.date)
                const isToday = d.date === todayStr
                const isSelected = d.date === selectedDate
                return (
                  <div
                    key={idx}
                    onClick={() => { setSelectedDate(d.date); handleDateClick(d.date) }}
                    className={`calendar-day${!d.isCurrentMonth ? ' muted' : ''}${isSelected ? ' selected' : ''}`}
                  >
                    <div className={`day-number${isToday ? ' today' : ''}`}>
                      {d.day}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      {dayNotes.slice(0, 3).map(n => (
                        <div key={n.id}
                          onClick={(e) => { e.stopPropagation(); handleEditNote(n) }}
                          className="note-pill"
                          style={{ background: n.color }}>
                          {n.title}
                        </div>
                      ))}
                      {dayNotes.length > 3 && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>+{dayNotes.length - 3} 更多</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>

      <div className="side-panel surface-card" style={{ padding: 14 }}>
        <h4 className="section-title" style={{ marginBottom: 12 }}>
          {selectedDate ? `${selectedDate} 便签` : '选择一个日期'}
        </h4>
        {selectedDate && (
          <>
            <Button
              type="dashed" icon={<PlusOutlined />} block style={{ marginBottom: 12 }}
              onClick={handleCreateNote}
            >
              添加便签
            </Button>
            {selectedDateNotes.length === 0 ? (
              <Empty description="当天没有便签" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              selectedDateNotes.map(n => (
                <Card
                  key={n.id}
                  size="small"
                  className="task-card"
                  style={{ borderLeft: `4px solid ${n.color}` }}
                  extra={
                    <span>
                      <EditOutlined style={{ marginRight: 8, cursor: 'pointer', fontSize: 12 }} onClick={() => handleEditNote(n)} />
                      <Popconfirm title="删除?" onConfirm={() => handleDeleteNote(n.id)}>
                        <DeleteOutlined style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: 12 }} />
                      </Popconfirm>
                    </span>
                  }
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                  {n.content && <div style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 12, whiteSpace: 'pre-wrap' }}>{n.content}</div>}
                  {(() => {
                    try {
                      const tags = JSON.parse(n.tags || '[]')
                      if (tags.length > 0) {
                        return <div style={{ marginTop: 4 }}>{tags.map((t: string) => <Tag key={t} style={{ fontSize: 10 }}>{t}</Tag>)}</div>
                      }
                    } catch { return null }
                    return null
                  })()}
                </Card>
              ))
            )}
          </>
        )}
      </div>

      {/* Create/Edit Note Modal */}
      <Modal
        title={editingNote ? '编辑便签' : '新建便签'}
        open={modalVisible}
        onOk={handleSaveNote}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>日期</label>
          <Input value={selectedDate || ''} disabled />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>标题</label>
          <Input value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
            placeholder="便签标题" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>内容</label>
          <Input.TextArea value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
            rows={3} placeholder="便签内容" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>颜色</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {NOTE_COLORS.map(c => (
              <div key={c} onClick={() => setNoteForm({ ...noteForm, color: c })}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: noteForm.color === c ? '3px solid #333' : '3px solid transparent'
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4 }}>标签（逗号分隔）</label>
          <Input value={noteForm.tags} onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })}
            placeholder="如：会议, 个人" />
        </div>
      </Modal>
    </div>
  )
}
