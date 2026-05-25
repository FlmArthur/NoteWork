import { useState, useEffect } from 'react'
import { BorderOutlined, CloseOutlined, MinusOutlined, SwitcherOutlined } from '@ant-design/icons'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.onMaximizedChange(setIsMaximized)
  }, [])

  const handleMinimize = () => window.api.minimize()
  const handleMaximize = () => window.api.maximize()
  const handleClose = () => window.api.close()

  return (
    <div className="titlebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="brand-mark" style={{ width: 24, height: 24, borderRadius: 7, fontSize: 12 }}>N</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>NoteWorks</span>
      </div>
      <div style={{ WebkitAppRegion: 'no-drag' as any, display: 'flex', height: '100%' }}>
        <button aria-label="最小化" onClick={handleMinimize} className="window-control"><MinusOutlined /></button>
        <button aria-label={isMaximized ? '还原' : '最大化'} onClick={handleMaximize} className="window-control">
          {isMaximized ? <SwitcherOutlined /> : <BorderOutlined />}
        </button>
        <button aria-label="关闭" onClick={handleClose} className="window-control close"><CloseOutlined /></button>
      </div>
    </div>
  )
}
