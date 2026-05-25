import { useState, useEffect, useCallback } from 'react'
import { Button, Input, Modal, Tree, message, Empty } from 'antd'
import {
  PlusOutlined, BookOutlined, FileTextOutlined, EditOutlined,
  DeleteOutlined, SearchOutlined, CloseOutlined
} from '@ant-design/icons'
import { useNotebookStore } from '../../stores/notebook.store'
import { useAuthStore } from '../../stores/auth.store'
import RichEditor from '../../components/editor/RichEditor'

export default function NotebookListPage() {
  const userId = useAuthStore((s) => s.userId)
  const {
    notebooks, selectedNotebookId, openDocs, activeDocId,
    setNotebooks, setSelectedNotebook, openDocument, closeDocument, setActiveDoc,
    addNotebook, removeNotebook, addDocument, removeDocument
  } = useNotebookStore()

  const [modalVisible, setModalVisible] = useState(false)
  const [editingNotebook, setEditingNotebook] = useState<any>(null)
  const [notebookName, setNotebookName] = useState('')
  const [notebookColor, setNotebookColor] = useState('#2563EB')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [documentsByNotebook, setDocumentsByNotebook] = useState<Record<string, any[]>>({})
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null)
  const [renamingDocSource, setRenamingDocSource] = useState<'tree' | 'tab' | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [sidebarWidth, setSidebarWidth] = useState(260)

  const loadNotebooks = useCallback(async () => {
    const list = await window.api.listNotebooks()
    setNotebooks(list)
  }, [setNotebooks])

  const loadDocuments = useCallback(async (notebookId: string) => {
    const list = await window.api.listDocuments(notebookId)
    setDocumentsByNotebook(prev => ({ ...prev, [notebookId]: list }))
  }, [])

  useEffect(() => { loadNotebooks() }, [loadNotebooks])

  const handleSelect = (keys: React.Key[]) => {
    if (keys.length === 0) return
    const key = keys[0] as string
    // Check if it's a notebook or a document
    const isNotebook = notebooks.some(nb => nb.id === key)
    if (isNotebook) {
      setSelectedNotebook(key)
      setExpandedKeys(prev => prev.includes(key) ? prev : [...prev, key])
      loadDocuments(key)
    } else {
      // It's a document - find which notebook it belongs to
      for (const nbId of Object.keys(documentsByNotebook)) {
        const doc = documentsByNotebook[nbId].find(d => d.id === key)
        if (doc) {
          setSelectedNotebook(nbId)
          setExpandedKeys(prev => prev.includes(nbId) ? prev : [...prev, nbId])
          openDocument({ id: doc.id, title: doc.title })
          window.api.getDocument(doc.id).then((d) => { if (d) setDocContent(d.content) })
          break
        }
      }
    }
  }

  const handleCreateNotebook = () => {
    setEditingNotebook(null)
    setNotebookName('')
    setNotebookColor('#2563EB')
    setModalVisible(true)
  }

  const handleEditNotebook = (nb: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingNotebook(nb)
    setNotebookName(nb.name)
    setNotebookColor(nb.color)
    setModalVisible(true)
  }

  const handleSaveNotebook = async () => {
    if (!notebookName.trim()) {
      message.warning('请输入笔记本名称')
      return
    }
    if (editingNotebook) {
      const updated = await window.api.updateNotebook(editingNotebook.id, {
        name: notebookName.trim(), color: notebookColor
      })
      setNotebooks(notebooks.map(n => n.id === updated.id ? updated : n))
    } else {
      const created = await window.api.createNotebook(notebookName.trim(), notebookColor)
      addNotebook(created)
    }
    setModalVisible(false)
  }

  const handleDeleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    Modal.confirm({
      title: '确认删除',
      content: '删除笔记本将同时删除其中的所有文档，此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await window.api.deleteNotebook(id)
        removeNotebook(id)
        setDocumentsByNotebook(prev => { const n = { ...prev }; delete n[id]; return n })
        message.success('已删除')
      }
    })
  }

  const handleCreateDoc = async () => {
    if (!selectedNotebookId) {
      message.warning('请先选择一个笔记本')
      return
    }
    const doc = await window.api.createDocument(selectedNotebookId, '未命名文档')
    addDocument(doc)
    openDocument({ id: doc.id, title: doc.title })
    setDocumentsByNotebook(prev => ({
      ...prev,
      [selectedNotebookId]: [...(prev[selectedNotebookId] || []), doc]
    }))
  }

  const handleDeleteDoc = async (id: string) => {
    Modal.confirm({
      title: '确认删除文档',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await window.api.deleteDocument(id)
        removeDocument(id)
        closeDocument(id)
        setDocumentsByNotebook(prev => {
          const next = { ...prev }
          for (const nbId of Object.keys(next)) {
            next[nbId] = next[nbId].filter(d => d.id !== id)
          }
          return next
        })
      }
    })
  }

  const startRename = (doc: any, e: React.MouseEvent, source: 'tree' | 'tab') => {
    e.preventDefault()
    e.stopPropagation()
    setRenamingDocId(doc.id)
    setRenamingDocSource(source)
    setRenameValue(doc.title)
  }

  const handleRenameDoc = async (id: string) => {
    const newTitle = renameValue.trim()
    if (!newTitle || newTitle === '') {
      setRenamingDocId(null)
      setRenamingDocSource(null)
      return
    }
    await window.api.renameDocument(id, newTitle)
    // Update documents in tree
    setDocumentsByNotebook(prev => {
      const next = { ...prev }
      for (const nbId of Object.keys(next)) {
        next[nbId] = next[nbId].map(d => d.id === id ? { ...d, title: newTitle } : d)
      }
      return next
    })
    // Update tab title
    const { openDocs } = useNotebookStore.getState()
    const doc = openDocs.find(d => d.id === id)
    if (doc) {
      useNotebookStore.setState({
        openDocs: openDocs.map(d => d.id === id ? { ...d, title: newTitle } : d)
      })
    }
    setRenamingDocId(null)
    setRenamingDocSource(null)
  }

  const handleSidebarResizeStart = (event: React.MouseEvent) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth
    const onMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.min(460, Math.max(220, startWidth + moveEvent.clientX - startX))
      setSidebarWidth(nextWidth)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleSaveDocument = async (json: string, plainText: string) => {
    if (activeDocId) {
      await window.api.saveDocument(activeDocId, json, plainText)
    }
  }

  const activeDoc = openDocs.find(d => d.id === activeDocId)
  const [docContent, setDocContent] = useState<string | null>(null)

  useEffect(() => {
    if (activeDocId) {
      window.api.getDocument(activeDocId).then((doc) => {
        if (doc) setDocContent(doc.content)
      })
    }
  }, [activeDocId])

  const colors = ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#0891B2', '#EA580C', '#334155']

  // Build tree data with notebooks and their documents nested
  const treeData = notebooks.map(nb => {
    const docs = documentsByNotebook[nb.id] || []
    const children = docs.map(doc => ({
      key: doc.id,
      title: renamingDocId === doc.id && renamingDocSource === 'tree' ? (
        <Input
          size="small"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={() => handleRenameDoc(doc.id)}
          onBlur={() => handleRenameDoc(doc.id)}
          autoFocus
          style={{ height: 24, fontSize: 12, width: '90%' }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '2px 0', width: '100%', minWidth: 0, overflow: 'hidden'
          }}
          onDoubleClick={(e) => startRename(doc, e, 'tree')}
        >
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden',
            flex: 1, minWidth: 0, fontSize: 13,
            color: activeDocId === doc.id ? 'var(--color-primary)' : 'var(--color-text)',
            fontWeight: activeDocId === doc.id ? 600 : 400,
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.title}
            </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <EditOutlined
              title="重命名"
              style={{ fontSize: 15, color: '#666', padding: 2 }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
              onClick={(e) => startRename(doc, e, 'tree')}
            />
            <DeleteOutlined
              title="删除"
              style={{ fontSize: 15, color: '#999', padding: 2 }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
              onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id) }}
            />
          </span>
        </div>
      ),
      icon: <FileTextOutlined />,
      isLeaf: true,
      selectable: true,
    }))

    return {
      key: nb.id,
      title: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: nb.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: selectedNotebookId === nb.id ? 600 : 400, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nb.name}
            </span>
            {children.length > 0 && (
              <span style={{ fontSize: 11, color: '#999' }}>({children.length})</span>
            )}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <EditOutlined
              style={{ fontSize: 15, color: '#666', padding: 2 }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
              onClick={(e) => handleEditNotebook(nb, e as any)}
            />
            <DeleteOutlined
              style={{ fontSize: 15, color: '#999', padding: 2 }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
              onClick={(e) => handleDeleteNotebook(nb.id, e as any)}
            />
          </span>
        </div>
      ),
      icon: <BookOutlined style={{ color: selectedNotebookId === nb.id ? nb.color : undefined }} />,
      selectable: true,
      isLeaf: false,
      children,
    }
  })

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <div style={{
        width: sidebarWidth, minWidth: 220, maxWidth: 460, borderRight: '1px solid var(--color-border)',
        background: 'rgba(255,255,255,0.68)', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--color-border-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="section-title">笔记本</span>
            <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleCreateNotebook} />
          </div>
          <Input
            size="small" placeholder="搜索文档..." prefix={<SearchOutlined />}
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
          {notebooks.length === 0 ? (
            <Empty description="暂无笔记本" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 40 }}>
              <Button type="primary" size="small" onClick={handleCreateNotebook}>创建笔记本</Button>
            </Empty>
          ) : (
            <Tree
              treeData={treeData}
              showIcon
              blockNode
              selectedKeys={activeDocId ? [activeDocId] : selectedNotebookId ? [selectedNotebookId] : []}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              onSelect={handleSelect}
              style={{ background: 'transparent', padding: '0 4px' }}
            />
          )}
        </div>
        {selectedNotebookId && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border-soft)' }}>
            <Button type="dashed" icon={<PlusOutlined />} block onClick={handleCreateDoc} size="small">
              新建文档
            </Button>
          </div>
        )}
      </div>

      <div
        onMouseDown={handleSidebarResizeStart}
        style={{
          width: 5, cursor: 'col-resize', background: 'transparent', flexShrink: 0,
          borderRight: '1px solid var(--color-border-soft)'
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-border-soft)',
          background: 'rgba(248,250,252,0.86)', minHeight: 42, paddingLeft: 8, overflow: 'auto'
        }}>
          {openDocs.map(doc => (
            <div
              key={doc.id}
              onClick={() => {
                if (renamingDocId !== doc.id) {
                  setActiveDoc(doc.id)
                  window.api.getDocument(doc.id).then((d) => { if (d) setDocContent(d.content) })
                }
              }}
              onDoubleClick={(e) => startRename(doc, e, 'tab')}
              style={{
                padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 6, fontSize: 13, borderRight: '1px solid var(--color-border-soft)',
                background: activeDocId === doc.id ? '#fff' : 'transparent',
                borderBottom: activeDocId === doc.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeDocId === doc.id ? 'var(--color-text)' : 'var(--color-text-muted)',
                maxWidth: 180, flexShrink: 0,
              }}
            >
              <FileTextOutlined style={{ fontSize: 11, color: 'var(--color-primary)' }} />
              {renamingDocId === doc.id && renamingDocSource === 'tab' ? (
                <Input
                  size="small"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onPressEnter={() => handleRenameDoc(doc.id)}
                  onBlur={() => handleRenameDoc(doc.id)}
                  autoFocus
                  style={{ height: 22, fontSize: 12, width: 100 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.title}
                </span>
              )}
              {renamingDocId !== doc.id && (
                <EditOutlined
                  title="重命名"
                  style={{ fontSize: 15, color: '#666', padding: 2 }}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onClick={(e) => startRename(doc, e, 'tab')}
                />
              )}
              <CloseOutlined
                style={{ fontSize: 14, color: '#999', padding: 2 }}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                onClick={(e) => { e.stopPropagation(); closeDocument(doc.id) }}
              />
            </div>
          ))}
          {selectedNotebookId && (
            <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleCreateDoc}
              style={{ marginLeft: 4, fontSize: 12, flexShrink: 0 }} />
          )}
        </div>

        {activeDocId ? (
          <RichEditor
            key={activeDocId}
            docId={activeDocId}
            content={docContent}
            onSave={handleSaveDocument}
          />
        ) : (
          <div style={{
            flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
            color: 'var(--color-text-muted)', flexDirection: 'column', gap: 12, background: '#fff'
          }}>
            <FileTextOutlined style={{ fontSize: 64, color: '#cbd5e1' }} />
            <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>选择一个文档开始编辑</span>
            <span style={{ fontSize: 12 }}>
              或 <Button type="link" onClick={handleCreateDoc} style={{ padding: 0 }}>创建新文档</Button>
            </span>
          </div>
        )}
      </div>

      {/* Create/Edit Notebook Modal */}
      <Modal
        title={editingNotebook ? '编辑笔记本' : '新建笔记本'}
        open={modalVisible}
        onOk={handleSaveNotebook}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>名称</label>
          <Input value={notebookName} onChange={(e) => setNotebookName(e.target.value)}
            onPressEnter={handleSaveNotebook} placeholder="笔记本名称" />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>颜色</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {colors.map(c => (
              <div
                key={c}
                onClick={() => setNotebookColor(c)}
                style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: notebookColor === c ? '3px solid var(--color-text)' : '3px solid transparent',
                  transition: 'all 0.15s'
                }}
              />
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
