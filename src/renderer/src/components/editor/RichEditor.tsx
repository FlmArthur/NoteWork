import { useState, useCallback } from 'react'
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { useEffect } from 'react'
import { LinkOutlined } from '@ant-design/icons'
import EditorToolbar from './Toolbar'
import EditorContextMenu from './EditorContextMenu'
import { FontSize } from './FontSizeExtension'

interface RichEditorProps {
  content: string | null
  onSave: (json: string, plainText: string) => void
  docId: string
}

const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
  Underline, TextStyle, FontSize, Color, Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Link.configure({ openOnClick: false }),
  Image.configure({ inline: true }),
  Table.configure({ resizable: true }),
  TableRow, TableCell, TableHeader,
]

export default function RichEditor({ content, onSave, docId }: RichEditorProps) {
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({
    visible: false, x: 0, y: 0
  })

  const editor = useEditor({
    extensions,
    content: content ? JSON.parse(content) : { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate({ editor }) {
      // Auto-save handled by interval
    },
    editorProps: {
      attributes: {
        style: 'padding: 24px 48px; min-height: 400px; outline: none; font-size: 16px; line-height: 1.8;',
      },
      handleContextMenu: (_view, event) => {
        event.preventDefault()
        setContextMenu({ visible: true, x: event.clientX, y: event.clientY })
        return true
      },
    },
  })

  // Reload content when switching documents
  useEffect(() => {
    if (editor && content !== undefined) {
      const newContent = content ? JSON.parse(content) : { type: 'doc', content: [{ type: 'paragraph' }] }
      const currentJson = editor.getJSON()
      if (JSON.stringify(currentJson) !== JSON.stringify(newContent)) {
        editor.commands.setContent(newContent)
      }
    }
  }, [docId])

  const handleSave = useCallback(() => {
    if (editor) {
      const json = JSON.stringify(editor.getJSON())
      const plainText = editor.getText()
      onSave(json, plainText)
    }
  }, [editor, onSave])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(handleSave, 30000)
    return () => clearInterval(interval)
  }, [handleSave])

  // Save on Ctrl+S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave])

  if (!editor) return null

  const openContextMenu = (event: React.MouseEvent) => {
    const editorElement = (event.currentTarget as HTMLElement).querySelector('.ProseMirror')
    if (!editorElement?.contains(event.target as Node)) return

    event.preventDefault()
    editor.commands.focus()
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      <EditorToolbar editor={editor} />

      {/* Floating bubble menu on text selection */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 150 }}
        style={{
          display: 'flex', gap: 2, padding: '4px 6px',
          background: '#fff', borderRadius: 8,
          border: '1px solid var(--color-border-soft)', boxShadow: 'var(--shadow-md)',
        }}
      >
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={{
            ...bubbleBtnStyle, fontWeight: 700,
            color: editor.isActive('bold') ? 'var(--color-primary)' : 'var(--color-text-muted)',
            background: editor.isActive('bold') ? 'var(--color-primary-soft)' : 'transparent',
          }}
        >B</button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={{
            ...bubbleBtnStyle, fontStyle: 'italic',
            color: editor.isActive('italic') ? 'var(--color-primary)' : 'var(--color-text-muted)',
            background: editor.isActive('italic') ? 'var(--color-primary-soft)' : 'transparent',
          }}
        >I</button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          style={{
            ...bubbleBtnStyle, textDecoration: 'underline',
            color: editor.isActive('underline') ? 'var(--color-primary)' : 'var(--color-text-muted)',
            background: editor.isActive('underline') ? 'var(--color-primary-soft)' : 'transparent',
          }}
        >U</button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          style={{
            ...bubbleBtnStyle, textDecoration: 'line-through',
            color: editor.isActive('strike') ? 'var(--color-primary)' : 'var(--color-text-muted)',
            background: editor.isActive('strike') ? 'var(--color-primary-soft)' : 'transparent',
          }}
        >S</button>
        <span style={{ width: 1, background: 'var(--color-border-soft)', margin: '2px 4px' }} />
        <button onClick={() => {
          const url = window.prompt('链接地址:')
          if (url) editor.chain().focus().setLink({ href: url }).run()
        }}
        style={{
          ...bubbleBtnStyle, color: editor.isActive('link') ? 'var(--color-primary)' : 'var(--color-text-muted)',
          background: editor.isActive('link') ? 'var(--color-primary-soft)' : 'transparent',
        }}><LinkOutlined /></button>
        <button onClick={() => editor.chain().focus().toggleCode().run()}
        style={{
          ...bubbleBtnStyle, fontFamily: 'monospace',
          color: editor.isActive('code') ? 'var(--color-primary)' : 'var(--color-text-muted)',
          background: editor.isActive('code') ? 'var(--color-primary-soft)' : 'transparent',
        }}>&lt;/&gt;</button>
      </BubbleMenu>

      <div style={{ flex: 1, overflow: 'auto' }} onBlur={handleSave} onContextMenu={openContextMenu}>
        <EditorContent editor={editor} />
      </div>

      {/* Right-click context menu */}
      <EditorContextMenu
        editor={editor}
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ visible: false, x: 0, y: 0 })}
      />
    </div>
  )
}

const bubbleBtnStyle: React.CSSProperties = {
  width: 28, height: 28, border: 'none', background: 'transparent',
  cursor: 'pointer', borderRadius: 4, fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
