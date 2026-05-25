import { useState, useEffect } from 'react'
import { Button, Card, Input, message, Divider, Modal, Switch, Space, Tabs } from 'antd'
import {
  UserOutlined, LockOutlined, SaveOutlined, FolderOpenOutlined,
  DownloadOutlined, UploadOutlined, KeyOutlined, SettingOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../../stores/auth.store'

export default function SettingsPage() {
  const { userId, username } = useAuthStore()
  const [activeTab, setActiveTab] = useState('account')

  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [changingPwd, setChangingPwd] = useState(false)

  const [backupPath, setBackupPath] = useState('')
  const [autoBackup, setAutoBackup] = useState(false)
  const [intervalDays, setIntervalDays] = useState(7)
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)

  useEffect(() => {
    if (userId) {
      window.api.getBackupSettings(userId).then((s) => {
        if (s) {
          setAutoBackup(s.autoBackup)
          setIntervalDays(s.intervalDays)
          setBackupPath(s.backupPath)
        }
      })
    }
  }, [userId])

  const handleChangePassword = async () => {
    if (!oldPwd) { message.warning('请输入原密码'); return }
    if (!newPwd || newPwd.length < 6) { message.warning('新密码至少6位'); return }
    if (newPwd !== confirmPwd) { message.warning('两次输入不一致'); return }

    setChangingPwd(true)
    try {
      const result = await window.api.changePassword(userId!, oldPwd, newPwd)
      if (result.success) {
        message.success('密码已修改')
        setOldPwd(''); setNewPwd(''); setConfirmPwd('')
      } else {
        message.error(result.error || '修改失败')
      }
    } catch { message.error('操作失败') }
    setChangingPwd(false)
  }

  const handleBackup = async () => {
    setBackupLoading(true)
    try {
      const result = await window.api.createBackup(userId!)
      if (result.success) {
        message.success(`备份成功！位置: ${result.filePath}`)
      } else {
        message.info('已取消备份')
      }
    } catch { message.error('备份失败') }
    setBackupLoading(false)
  }

  const handleRestore = async () => {
    Modal.confirm({
      title: '确认恢复数据',
      content: '恢复数据将覆盖当前所有数据，此操作不可恢复。建议先备份当前数据。确定要继续吗？',
      okText: '确认恢复',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setRestoreLoading(true)
        try {
          const result = await window.api.restoreBackup(userId!)
          if (result.success) {
            message.success('数据恢复成功！应用将重新加载。')
            setTimeout(() => window.location.reload(), 1500)
          } else {
            message.error(result.error || '恢复失败')
          }
        } catch { message.error('恢复失败') }
        setRestoreLoading(false)
      }
    })
  }

  const tabItems = [
    {
      key: 'account',
      label: <span><UserOutlined /> 账号</span>,
      children: (
        <div style={{ maxWidth: 480 }}>
          <Card size="small" title="账号信息" style={{ marginBottom: 16 }}>
            <p><strong>用户名：</strong>{username}</p>
            <p><strong>用户ID：</strong><code style={{ fontSize: 12 }}>{userId}</code></p>
          </Card>
          <Card size="small" title={<span><KeyOutlined /> 修改密码</span>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input.Password
                prefix={<LockOutlined />} placeholder="原密码"
                value={oldPwd} onChange={(e) => setOldPwd(e.target.value)}
              />
              <Input.Password
                prefix={<LockOutlined />} placeholder="新密码（至少6位）"
                value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
              />
              <Input.Password
                prefix={<LockOutlined />} placeholder="确认新密码"
                value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                onPressEnter={handleChangePassword}
              />
              <Button type="primary" icon={<SaveOutlined />}
                onClick={handleChangePassword} loading={changingPwd}>
                修改密码
              </Button>
            </div>
          </Card>
        </div>
      )
    },
    {
      key: 'backup',
      label: <span><FolderOpenOutlined /> 备份恢复</span>,
      children: (
        <div style={{ maxWidth: 480 }}>
          <Card size="small" title="数据备份" style={{ marginBottom: 16 }}>
            <p style={{ color: '#666', marginBottom: 12, fontSize: 13 }}>
              将数据库和附件备份到指定位置，备份文件可用于数据恢复。
            </p>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleBackup}
              loading={backupLoading}
              block
            >
              创建备份
            </Button>
          </Card>

          <Card size="small" title="数据恢复" style={{ marginBottom: 16 }}>
            <p style={{ color: 'var(--color-danger)', marginBottom: 12, fontSize: 12 }}>
              警告：恢复数据将覆盖当前所有数据，建议先备份！
            </p>
            <Button
              danger
              icon={<UploadOutlined />}
              onClick={handleRestore}
              loading={restoreLoading}
              block
            >
              从备份恢复
            </Button>
          </Card>

          <Card size="small" title="自动备份设置">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>自动备份</span>
                <Switch checked={autoBackup} onChange={(v) => {
                  setAutoBackup(v)
                  window.api.setBackupSettings(userId!, { autoBackup: v, intervalDays, backupPath })
                }} />
              </div>
              {autoBackup && (
                <p style={{ color: '#666', fontSize: 12, marginTop: 8 }}>
                  应用关闭时将自动备份（间隔每 {intervalDays} 天）
                </p>
              )}
            </Space>
          </Card>
        </div>
      )
    },
    {
      key: 'about',
      label: <span><SettingOutlined /> 关于</span>,
      children: (
        <Card size="small" style={{ maxWidth: 480 }}>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 20, margin: '0 auto 12px' }}>N</div>
            <h2 style={{ color: 'var(--color-text)', marginBottom: 8 }}>NoteWorks</h2>
            <p style={{ color: '#666' }}>版本 1.0.0</p>
            <p style={{ color: '#999', fontSize: 12 }}>
              笔记 · 日历 · 清单 · 报告 — 一站式办公
            </p>
            <Divider />
            <p style={{ color: '#999', fontSize: 12 }}>
              技术栈：Electron + React + TypeScript + SQLite
            </p>
            <p style={{ color: '#999', fontSize: 12 }}>
              数据存储于本地，加密保护，不上传任何信息
            </p>
          </div>
        </Card>
      )
    }
  ]

  return (
    <div className="page-shell">
      <h1 className="page-title" style={{ marginBottom: 4 }}>设置</h1>
      <p className="page-kicker" style={{ marginBottom: 16 }}>管理账号、安全和本地数据备份。</p>
      <Tabs activeKey={activeTab} onChange={setActiveTab} tabPosition="left" items={tabItems}
        style={{ minHeight: 400 }}
      />
    </div>
  )
}
