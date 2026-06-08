import { useState, useEffect, useCallback, useRef } from 'react'
import { Button, Input, Modal, Tree, message, Empty } from 'antd'
import {
  PlusOutlined, FileTextOutlined, EditOutlined,
  DeleteOutlined, SearchOutlined, CloseOutlined, RightOutlined
} from '@ant-design/icons'
import { useNotebookStore } from '../../stores/notebook.store'
import { useAuthStore } from '../../stores/auth.store'
import RichEditor from '../../components/editor/RichEditor'

interface InlineRenameInputProps {
  initialValue: string
  className: string
  onCommit: (value: string) => void | Promise<void>
  onCancel: () => void
}

function InlineRenameInput({
  initialValue,
  className,
  onCommit,
  onCancel
}: InlineRenameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const composingRef = useRef(false)
  const submittingRef = useRef(false)
  const commitAfterCompositionRef = useRef(false)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const commit = async () => {
    if (composingRef.current) {
      commitAfterCompositionRef.current = true
      return
    }
    if (submittingRef.current) return

    const value = inputRef.current?.value.trim() ?? ''
    if (!value) {
      onCancel()
      return
    }

    submittingRef.current = true
    try {
      await onCommit(value)
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <input
      ref={inputRef}
      className={className}
      defaultValue={initialValue}
      spellCheck={false}
      onCompositionStart={(event) => {
        composingRef.current = true
        event.stopPropagation()
      }}
      onCompositionUpdate={(event) => event.stopPropagation()}
      onCompositionEnd={(event) => {
        composingRef.current = false
        event.stopPropagation()
        if (commitAfterCompositionRef.current) {
          commitAfterCompositionRef.current = false
          window.setTimeout(() => void commit(), 0)
        }
      }}
      onInput={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        const isComposing = composingRef.current || event.nativeEvent.isComposing
        if (event.key === 'Enter' && !isComposing) {
          event.preventDefault()
          void commit()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
      onKeyUp={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onBlur={() => window.setTimeout(() => void commit(), 0)}
    />
  )
}

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

  useEffect(() => {
    if (!selectedNotebookId || Object.prototype.hasOwnProperty.call(documentsByNotebook, selectedNotebookId)) {
      return
    }
    setExpandedKeys(prev => prev.includes(selectedNotebookId) ? prev : [...prev, selectedNotebookId])
    void loadDocuments(selectedNotebookId)
  }, [documentsByNotebook, loadDocuments, selectedNotebookId])

  const selectNotebook = useCallback((notebookId: string) => {
    setSelectedNotebook(notebookId)
    setExpandedKeys(prev => prev.includes(notebookId) ? prev : [...prev, notebookId])
    void loadDocuments(notebookId)
  }, [loadDocuments, setSelectedNotebook])

  const handleSelect = (keys: React.Key[]) => {
    if (keys.length === 0) return
    const key = keys[0] as string
    // Check if it's a notebook or a document
    const isNotebook = notebooks.some(nb => nb.id === key)
    if (isNotebook) {
      selectNotebook(key)
    } else {
      // It's a document - find which notebook it belongs to
      for (const nbId of Object.keys(documentsByNotebook)) {
        const doc = documentsByNotebook[nbId].find(d => d.id === key)
        if (doc) {
          setSelectedNotebook(nbId)
          setExpandedKeys(prev => prev.includes(nbId) ? prev : [...prev, nbId])
          openDocument({ id: doc.id, title: doc.title })
          break
        }
      }
    }
  }

  const handleExpand = useCallback((keys: React.Key[]) => {
    const nextKeys = keys.map(String)
    setExpandedKeys(nextKeys)
    nextKeys.forEach((key) => {
      const isNotebook = notebooks.some(nb => nb.id === key)
      if (isNotebook && !Object.prototype.hasOwnProperty.call(documentsByNotebook, key)) {
        void loadDocuments(key)
      }
    })
  }, [documentsByNotebook, loadDocuments, notebooks])

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
  }

  const handleRenameDoc = async (id: string, newTitle: string) => {
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

  const cancelRename = () => {
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

  const handleSaveDocument = useCallback(async (docId: string, json: string, plainText: string) => {
    await window.api.saveDocument(docId, json, plainText)
  }, [])

  const activeDoc = openDocs.find(d => d.id === activeDocId)
  const [docContent, setDocContent] = useState<string | null>(null)
  const [isDocLoading, setIsDocLoading] = useState(false)
  const loadDocRequestRef = useRef(0)

  useEffect(() => {
    const requestId = ++loadDocRequestRef.current

    if (!activeDocId) {
      setDocContent(null)
      setIsDocLoading(false)
      return
    }

    setDocContent(null)
    setIsDocLoading(true)

    window.api.getDocument(activeDocId)
      .then((doc) => {
        if (loadDocRequestRef.current === requestId) {
          setDocContent(doc?.content ?? null)
        }
      })
      .catch((error) => {
        if (loadDocRequestRef.current === requestId) {
          console.error('Failed to load document', error)
          setDocContent(null)
        }
      })
      .finally(() => {
        if (loadDocRequestRef.current === requestId) {
          setIsDocLoading(false)
        }
      })
  }, [activeDocId])

  const colors = ['#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED', '#0891B2', '#EA580C', '#334155']
  const normalizedSearch = searchQuery.trim().toLowerCase()

  // Build tree data with notebooks and their documents nested
  const treeData = notebooks.flatMap(nb => {
    const documentsLoaded = Object.prototype.hasOwnProperty.call(documentsByNotebook, nb.id)
    const rawDocs = documentsByNotebook[nb.id] || []
    const notebookMatches = !normalizedSearch || nb.name.toLowerCase().includes(normalizedSearch)
    const docs = rawDocs.filter(doc => notebookMatches || doc.title.toLowerCase().includes(normalizedSearch))
    if (!notebookMatches && docs.length === 0) return []
    const children = docs.map(doc => ({
      key: doc.id,
      title: (
        <div
          className={`notebook-document-row${activeDocId === doc.id ? ' active' : ''}`}
          onDoubleClick={(e) => startRename(doc, e, 'tree')}
        >
          <span className="notebook-document-icon">
            <FileTextOutlined />
          </span>
          {renamingDocId === doc.id && renamingDocSource === 'tree' ? (
            <InlineRenameInput
              initialValue={doc.title}
              className="notebook-inline-rename"
              onCommit={(value) => handleRenameDoc(doc.id, value)}
              onCancel={cancelRename}
            />
          ) : (
            <>
              <span className="notebook-node-name">{doc.title}</span>
              <span className="notebook-node-actions">
                <button
                  type="button"
                  title="重命名"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onClick={(e) => startRename(doc, e, 'tree')}
                  aria-label={`重命名 ${doc.title}`}
                >
                  <EditOutlined />
                </button>
                <button
                  type="button"
                  title="删除"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id) }}
                  aria-label={`删除 ${doc.title}`}
                >
                  <DeleteOutlined />
                </button>
              </span>
            </>
          )}
        </div>
      ),
      isLeaf: true,
      selectable: true,
    }))

    return [{
      key: nb.id,
      title: (
        <div className={`notebook-group-row${selectedNotebookId === nb.id ? ' active' : ''}`}>
          <span className="notebook-color-mark" style={{ background: nb.color }} />
          <span className="notebook-node-name">{nb.name}</span>
          {documentsLoaded && <span className="notebook-count">{children.length}</span>}
          <span className="notebook-node-actions">
            <button
              type="button"
              title="编辑笔记本"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
              onClick={(e) => handleEditNotebook(nb, e as any)}
              aria-label={`编辑 ${nb.name}`}
            >
              <EditOutlined />
            </button>
            <button
              type="button"
              title="删除笔记本"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
              onClick={(e) => handleDeleteNotebook(nb.id, e as any)}
              aria-label={`删除 ${nb.name}`}
            >
              <DeleteOutlined />
            </button>
          </span>
        </div>
      ),
      selectable: true,
      isLeaf: false,
      children,
    }]
  })

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <div className="notebook-panel" style={{
        width: sidebarWidth, minWidth: 220, maxWidth: 460, borderRight: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div className="notebook-panel-header">
          <div className="notebook-panel-title-row">
            <div>
              <div className="notebook-panel-eyebrow">资料库</div>
              <div className="notebook-panel-title">笔记本</div>
            </div>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleCreateNotebook}
              title="新建笔记本"
              className="notebook-add-button"
            />
          </div>
          <Input
            className="notebook-search"
            placeholder={'\u641c\u7d22\u7b14\u8bb0 (F6)'}
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
        </div>
        <div className="notebook-tree-scroll">
          {notebooks.length === 0 ? (
            <Empty description="暂无笔记本" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 40 }}>
              <Button type="primary" size="small" onClick={handleCreateNotebook}>创建笔记本</Button>
            </Empty>
          ) : (
            <Tree
              treeData={treeData}
              blockNode
              className="notebook-tree"
              switcherIcon={<RightOutlined />}
              selectedKeys={activeDocId ? [activeDocId] : selectedNotebookId ? [selectedNotebookId] : []}
              expandedKeys={expandedKeys}
              onExpand={handleExpand}
              onSelect={handleSelect}
              virtual={false}
            />
          )}
        </div>
        {selectedNotebookId && (
          <div className="notebook-panel-footer">
            <Button icon={<PlusOutlined />} block onClick={handleCreateDoc}>
              {'\u65b0\u5efa\u6587\u6863'}
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
          background: 'rgba(248,245,239,0.94)', minHeight: 42, paddingLeft: 8, overflow: 'auto'
        }}>
          {openDocs.map(doc => (
            <div
              key={doc.id}
              onClick={() => {
                if (renamingDocId !== doc.id) {
                  setActiveDoc(doc.id)
                }
              }}
              onDoubleClick={(e) => startRename(doc, e, 'tab')}
              style={{
                padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 6, fontSize: 13, borderRight: '1px solid var(--color-border-soft)',
                background: activeDocId === doc.id ? 'var(--color-surface)' : 'transparent',
                borderBottom: activeDocId === doc.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: activeDocId === doc.id ? 'var(--color-text)' : 'var(--color-text-muted)',
                maxWidth: 180, flexShrink: 0,
              }}
            >
              <FileTextOutlined style={{ fontSize: 11, color: 'var(--color-primary)' }} />
              {renamingDocId === doc.id && renamingDocSource === 'tab' ? (
                <InlineRenameInput
                  initialValue={doc.title}
                  className="notebook-tab-rename"
                  onCommit={(value) => handleRenameDoc(doc.id, value)}
                  onCancel={cancelRename}
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

        {activeDocId && !isDocLoading ? (
          <RichEditor
            key={activeDocId}
            docId={activeDocId}
            content={docContent}
            onSave={handleSaveDocument}
          />
        ) : activeDocId ? (
          <div style={{
            flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
            color: 'var(--color-text-muted)', background: 'var(--color-surface)'
          }}>
            {'\u6b63\u5728\u52a0\u8f7d\u6587\u6863...'}
          </div>
        ) : (
          <div style={{
            flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
            color: 'var(--color-text-muted)', flexDirection: 'column', gap: 12, background: 'var(--color-surface)'
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
