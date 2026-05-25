import { useState } from 'react'
import { Button, Checkbox, Input, message, Tabs, Card } from 'antd'
import { CloseOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '../../stores/auth.store'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [autoLogin, setAutoLogin] = useState(() => Boolean(localStorage.getItem('noteworks:autoLogin')))
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      message.warning('请输入用户名和密码')
      return
    }
    setLoading(true)
    try {
      const result = await window.api.login(username.trim(), password)
      if (result.success && result.userId) {
        if (autoLogin) {
          localStorage.setItem('noteworks:autoLogin', JSON.stringify({ username: username.trim(), password }))
        } else {
          localStorage.removeItem('noteworks:autoLogin')
        }
        setUser(result.userId, username.trim())
        message.success('登录成功')
      } else {
        message.error(result.error || '登录失败')
      }
    } catch (e) {
      message.error('登录失败，请重试')
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!username.trim() || !password) {
      message.warning('请输入用户名和密码')
      return
    }
    if (password !== confirmPwd) {
      message.warning('两次输入的密码不一致')
      return
    }
    if (password.length < 6) {
      message.warning('密码至少6位')
      return
    }
    setLoading(true)
    try {
      const result = await window.api.register(username.trim(), password)
      if (result.success && result.userId) {
        if (autoLogin) {
          localStorage.setItem('noteworks:autoLogin', JSON.stringify({ username: username.trim(), password }))
        } else {
          localStorage.removeItem('noteworks:autoLogin')
        }
        setUser(result.userId, username.trim())
        message.success('注册成功，已自动登录')
      } else {
        message.error(result.error || '注册失败')
      }
    } catch (e) {
      message.error('注册失败，请重试')
    }
    setLoading(false)
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', justifyContent: 'center',
      alignItems: 'center',
      padding: 0, position: 'relative'
    }} className="app-shell">
      <Button
        type="text"
        icon={<CloseOutlined />}
        onClick={() => window.api.close()}
        style={{ position: 'absolute', top: 8, right: 8, color: '#777', zIndex: 2 }}
      />
      <Card style={{
        width: '100%', height: '100%', borderRadius: 0, boxShadow: 'none',
        border: 'none', background: 'rgba(255,255,255,0.78)'
      }} bodyStyle={{ padding: '34px 36px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="brand-mark" style={{ width: 48, height: 48, fontSize: 22, margin: '0 auto 12px' }}>N</div>
          <h1 style={{ color: 'var(--color-text)', fontSize: 24, fontWeight: 750, margin: 0 }}>
            NoteWorks
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 6 }}>
            笔记 · 日历 · 清单 · 报告 — 一站式办公
          </p>
        </div>
        <Tabs activeKey={activeTab} onChange={setActiveTab} centered items={[
          {
            key: 'login',
            label: '登录',
            children: (
              <div style={{ padding: '0 4px' }}>
                <Input
                  size="large" placeholder="用户名" prefix={<UserOutlined />}
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  onPressEnter={handleLogin} style={{ marginBottom: 16 }}
                />
                <Input.Password
                  size="large" placeholder="密码" prefix={<LockOutlined />}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  onPressEnter={handleLogin} style={{ marginBottom: 12 }}
                />
                <Checkbox
                  checked={autoLogin}
                  onChange={(e) => setAutoLogin(e.target.checked)}
                  style={{ marginBottom: 18 }}
                >
                  下次自动登录
                </Checkbox>
                <Button type="primary" size="large" block loading={loading} onClick={handleLogin}
                  style={{ height: 44, fontSize: 15, fontWeight: 500 }}>
                  登录
                </Button>
              </div>
            )
          },
          {
            key: 'register',
            label: '注册',
            children: (
              <div style={{ padding: '0 4px' }}>
                <Input
                  size="large" placeholder="用户名" prefix={<UserOutlined />}
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  style={{ marginBottom: 16 }}
                />
                <Input.Password
                  size="large" placeholder="密码（至少6位）" prefix={<LockOutlined />}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  style={{ marginBottom: 16 }}
                />
                <Input.Password
                  size="large" placeholder="确认密码" prefix={<LockOutlined />}
                  value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                  onPressEnter={handleRegister} style={{ marginBottom: 12 }}
                />
                <Checkbox
                  checked={autoLogin}
                  onChange={(e) => setAutoLogin(e.target.checked)}
                  style={{ marginBottom: 18 }}
                >
                  下次自动登录
                </Checkbox>
                <Button type="primary" size="large" block loading={loading} onClick={handleRegister}
                  style={{ height: 44, fontSize: 15, fontWeight: 500 }}>
                  注册
                </Button>
              </div>
            )
          }
        ]} />
      </Card>
    </div>
  )
}
