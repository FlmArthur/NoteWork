import { useState, useEffect } from 'react'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import LoginPage from './pages/login/LoginPage'
import MainLayout from './components/layout/MainLayout'
import { useAuthStore } from './stores/auth.store'

export default function App() {
  const { userId, setUser } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('noteworks:autoLogin')
    if (!saved) {
      setLoading(false)
      return
    }

    try {
      const { username, password } = JSON.parse(saved) as { username?: string; password?: string }
      if (!username || !password) {
        localStorage.removeItem('noteworks:autoLogin')
        setLoading(false)
        return
      }

      window.api.login(username, password)
        .then((result) => {
          if (result.success && result.userId) {
            setUser(result.userId, username)
          } else {
            localStorage.removeItem('noteworks:autoLogin')
          }
        })
        .finally(() => setLoading(false))
    } catch {
      localStorage.removeItem('noteworks:autoLogin')
      setLoading(false)
    }
  }, [setUser])

  useEffect(() => {
    if (loading) return
    if (userId) {
      window.api.showMainWindow()
    } else {
      window.api.showLoginWindow()
    }
  }, [loading, userId])

  if (loading) {
    return (
      <div className="app-shell" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 20, marginBottom: 12 }}>N</div>
        <span style={{ fontSize: 24, color: 'var(--color-text)', fontWeight: 750 }}>NoteWorks</span>
      </div>
    )
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563EB',
          colorSuccess: '#059669',
          colorWarning: '#D97706',
          colorError: '#DC2626',
          colorText: '#0F172A',
          colorTextSecondary: '#64748B',
          colorBorder: '#DFE7F2',
          colorBgLayout: '#F7F9FC',
          borderRadius: 8,
          fontSize: 14,
        }
      }}
    >
      {userId ? <MainLayout /> : <LoginPage />}
    </ConfigProvider>
  )
}
