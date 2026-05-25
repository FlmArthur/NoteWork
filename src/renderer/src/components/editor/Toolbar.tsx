import type { Editor } from '@tiptap/react'
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined, StrikethroughOutlined,
  OrderedListOutlined, UnorderedListOutlined, AlignLeftOutlined,
  AlignCenterOutlined, AlignRightOutlined, LinkOutlined,
  UndoOutlined, RedoOutlined, CodeOutlined, MinusOutlined,
  ClearOutlined, PictureOutlined, TableOutlined
} from '@ant-design/icons'
import { Select, ColorPicker, Tooltip, Divider } from 'antd'

interface ToolbarProps {
  editor: Editor
}

const btnBase: React.CSSProperties = {
  width: 32, height: 32, display: 'flex', alignItems: 'center',
  justifyContent: 'center', border: 'none', background: 'transparent',
  cursor: 'pointer', borderRadius: 6, fontSize: 14, color: 'var(--color-text-muted)'
}

function ToolBtn({ active, onClick, children, title }: {
  active?: boolean; onClick: () => void; children: React.ReactNode; title?: string
}) {
  return (
    <Tooltip title={title}>
      <button
        onClick={onClick}
        style={{ ...btnBase, background: active ? 'var(--color-primary-soft)' : 'transparent', color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
      >
        {children}
      </button>
    </Tooltip>
  )
}

const FONT_SIZES = [
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '28px', label: '28' },
  { value: '32px', label: '32' },
]

export default function EditorToolbar({ editor }: ToolbarProps) {
  const addLink = () => {
    const url = window.prompt('输入链接地址:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const addImage = () => {
    const url = window.prompt('输入图片地址（支持网络地址或本地路径）:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  const currentFontSize = editor.getAttributes('textStyle').fontSize || '16px'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2, padding: '6px 12px',
      borderBottom: '1px solid var(--color-border-soft)', flexWrap: 'wrap', background: 'var(--color-surface-soft)',
      userSelect: 'none',
    }}>
      {/* Undo / Redo */}
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="撤销">
        <UndoOutlined />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="重做">
        <RedoOutlined />
      </ToolBtn>

      <Divider type="vertical" />

      {/* Heading */}
      <Select
        size="small"
        value={editor.isActive('heading') ? `h${editor.getAttributes('heading').level || 1}` : 'p'}
        style={{ width: 90 }}
        onChange={(val) => {
          if (val === 'p') editor.chain().focus().setParagraph().run()
          else editor.chain().focus().toggleHeading({ level: parseInt(val.slice(1)) as 1 | 2 | 3 | 4 }).run()
        }}
        options={[
          { value: 'p', label: '正文' },
          { value: 'h1', label: '标题 1' },
          { value: 'h2', label: '标题 2' },
          { value: 'h3', label: '标题 3' },
          { value: 'h4', label: '标题 4' },
        ]}
      />

      {/* Font size */}
      <Select
        size="small"
        value={currentFontSize}
        style={{ width: 60 }}
        onChange={(val) => editor.chain().focus().setMark('textStyle', { fontSize: val }).run()}
        options={FONT_SIZES.map(s => ({ value: s.value, label: s.label }))}
      />

      <Divider type="vertical" />

      {/* Text formatting */}
      <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="加粗">
        <BoldOutlined />
      </ToolBtn>
      <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="斜体">
        <ItalicOutlined />
      </ToolBtn>
      <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="下划线">
        <UnderlineOutlined />
      </ToolBtn>
      <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="删除线">
        <StrikethroughOutlined />
      </ToolBtn>
      <ToolBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="行内代码">
        <CodeOutlined />
      </ToolBtn>

      <Divider type="vertical" />

      {/* Colors */}
      <ColorPicker
        size="small"
        value={editor.getAttributes('textStyle').color || '#000000'}
        onChange={(_, hex) => editor.chain().focus().setColor(hex).run()}
      />
      <ColorPicker
        size="small"
        value={editor.getAttributes('highlight').color || '#ffff00'}
        onChange={(_, hex) => editor.chain().focus().setHighlight({ color: hex }).run()}
      />

      <Divider type="vertical" />

      {/* Lists */}
      <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="无序列表">
        <UnorderedListOutlined />
      </ToolBtn>
      <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="有序列表">
        <OrderedListOutlined />
      </ToolBtn>

      <Divider type="vertical" />

      {/* Alignment */}
      <ToolBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="左对齐">
        <AlignLeftOutlined />
      </ToolBtn>
      <ToolBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="居中">
        <AlignCenterOutlined />
      </ToolBtn>
      <ToolBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="右对齐">
        <AlignRightOutlined />
      </ToolBtn>

      <Divider type="vertical" />

      {/* Insert */}
      <ToolBtn onClick={addLink} title="插入链接"><LinkOutlined /></ToolBtn>
      <ToolBtn onClick={addImage} title="插入图片">
        <PictureOutlined />
      </ToolBtn>
      <ToolBtn onClick={addTable} title="插入表格">
        <TableOutlined />
      </ToolBtn>

      <Divider type="vertical" />

      {/* Block elements */}
      <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="引用块">
        <span style={{ fontSize: 14, fontWeight: 600 }}>❝</span>
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分隔线">
        <MinusOutlined />
      </ToolBtn>

      {/* Clear formatting */}
      <ToolBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="清除格式">
        <ClearOutlined />
      </ToolBtn>
    </div>
  )
}
