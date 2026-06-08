import { useState, useEffect } from 'react'
import { Button, Checkbox, Modal } from 'antd'
import {
  BorderOutlined, CloseOutlined, MinusOutlined, QuestionCircleOutlined,
  SwitcherOutlined
} from '@ant-design/icons'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [closePromptOpen, setClosePromptOpen] = useState(false)
  const [rememberCloseChoice, setRememberCloseChoice] = useState(false)
  const [closeSubmitting, setCloseSubmitting] = useState<'tray' | 'quit' | null>(null)

  useEffect(() => {
    window.api.onMaximizedChange(setIsMaximized)
  }, [])

  useEffect(() => {
    return window.api.onCloseRequest(() => {
      setRememberCloseChoice(false)
      setCloseSubmitting(null)
      setClosePromptOpen(true)
    })
  }, [])

  const handleMinimize = () => window.api.minimize()
  const handleMaximize = () => window.api.maximize()
  const handleClose = () => window.api.close()

  const handleClosePromptCancel = () => {
    setClosePromptOpen(false)
    setCloseSubmitting(null)
    window.api.cancelCloseAction()
  }

  const handleCloseAction = async (action: 'tray' | 'quit') => {
    const remember = rememberCloseChoice
    setCloseSubmitting(action)
    setClosePromptOpen(false)
    setRememberCloseChoice(false)

    try {
      await window.api.applyCloseAction(action, remember)
    } catch {
      setClosePromptOpen(true)
    } finally {
      setCloseSubmitting(null)
    }
  }

  return (
    <>
      <div className="titlebar">
        <div className="titlebar-brand">
          <span className="brand-mark titlebar-brand-mark">N</span>
          <span>NoteWorks</span>
        </div>
        <div style={{ WebkitAppRegion: 'no-drag' as any, display: 'flex', height: '100%' }}>
          <button aria-label="Minimize" onClick={handleMinimize} className="window-control"><MinusOutlined /></button>
          <button aria-label={isMaximized ? 'Restore' : 'Maximize'} onClick={handleMaximize} className="window-control">
            {isMaximized ? <SwitcherOutlined /> : <BorderOutlined />}
          </button>
          <button aria-label="Close" onClick={handleClose} className="window-control close"><CloseOutlined /></button>
        </div>
      </div>

      <Modal
        open={closePromptOpen}
        width={430}
        centered
        closable={false}
        maskClosable={false}
        footer={null}
        onCancel={handleClosePromptCancel}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '4px 0' }}>
          <div
            style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-primary-soft)', color: 'var(--color-primary)',
              fontSize: 20
            }}
          >
            <QuestionCircleOutlined />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.35 }}>
              {'\u5173\u95ed NoteWorks\uff1f'}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-muted)' }}>
              {'\u4f60\u53ef\u4ee5\u8ba9\u5b83\u5728\u6258\u76d8\u7ee7\u7eed\u8fd0\u884c\uff0c\u4e5f\u53ef\u4ee5\u76f4\u63a5\u9000\u51fa\u7a0b\u5e8f\u3002'}
            </div>
            <Checkbox
              checked={rememberCloseChoice}
              onChange={(event) => setRememberCloseChoice(event.target.checked)}
              style={{ marginTop: 14, color: 'var(--color-text-muted)', fontSize: 13 }}
            >
              {'\u8bb0\u4f4f\u6211\u7684\u9009\u62e9'}
            </Checkbox>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
              <Button onClick={handleClosePromptCancel}>
                {'\u53d6\u6d88'}
              </Button>
              <Button
                onClick={() => handleCloseAction('quit')}
                danger
                loading={closeSubmitting === 'quit'}
              >
                {'\u76f4\u63a5\u9000\u51fa'}
              </Button>
              <Button
                type="primary"
                onClick={() => handleCloseAction('tray')}
                loading={closeSubmitting === 'tray'}
              >
                {'\u6700\u5c0f\u5316\u5230\u6258\u76d8'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
