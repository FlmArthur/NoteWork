import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'

interface ContextMenuProps {
  editor: Editor | null
  visible: boolean
  x: number
  y: number
  onClose: () => void
}

export default function EditorContextMenu({ editor, visible, x, y, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (visible) {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, onClose])

  if (!visible || !editor) return null

  const menuStyle: React.CSSProperties = {
    position: 'fixed', top: y, left: x, zIndex: 9999,
    background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8,
    padding: '4px 0', minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  }

  const itemStyle: React.CSSProperties = {
    padding: '6px 16px', cursor: 'pointer', fontSize: 13, color: '#333',
    display: 'flex', alignItems: 'center', gap: 10,
  }

  const disabledStyle: React.CSSProperties = { ...itemStyle, color: '#ccc', cursor: 'not-allowed' }

  const items = [
    {
      label: '剪切', shortcut: 'Ctrl+X',
      action: () => { document.execCommand('cut') },
      disabled: editor.state.selection.empty,
    },
    {
      label: '复制', shortcut: 'Ctrl+C',
      action: () => { document.execCommand('copy') },
      disabled: editor.state.selection.empty,
    },
    {
      label: '粘贴', shortcut: 'Ctrl+V',
      action: () => { document.execCommand('paste') },
      disabled: false,
    },
    { type: 'divider' },
    {
      label: '加粗', shortcut: 'Ctrl+B',
      action: () => editor.chain().focus().toggleBold().run(),
      disabled: false,
    },
    {
      label: '斜体', shortcut: 'Ctrl+I',
      action: () => editor.chain().focus().toggleItalic().run(),
      disabled: false,
    },
    {
      label: '下划线', shortcut: 'Ctrl+U',
      action: () => editor.chain().focus().toggleUnderline().run(),
      disabled: false,
    },
    { type: 'divider' },
    {
      label: '删除线', shortcut: '',
      action: () => editor.chain().focus().toggleStrike().run(),
      disabled: false,
    },
    {
      label: '行内代码', shortcut: '',
      action: () => editor.chain().focus().toggleCode().run(),
      disabled: false,
    },
  ]

  return (
    <div ref={ref} style={menuStyle}>
      {items.map((item: any, i) => {
        if (item.type === 'divider') {
          return <div key={i} style={{ height: 1, background: '#f0f0f0', margin: '4px 0' }} />
        }
        return (
          <div
            key={i}
            style={item.disabled ? disabledStyle : itemStyle}
            onMouseEnter={(e) => {
              if (!item.disabled) (e.currentTarget as HTMLElement).style.background = '#f5f5f5'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
            onClick={() => {
              if (!item.disabled) {
                item.action()
                onClose()
              }
            }}
          >
            <span style={{ flex: 1 }}>{item.label}</span>
            <span style={{ color: '#999', fontSize: 11 }}>{item.shortcut}</span>
          </div>
        )
      })}
    </div>
  )
}
