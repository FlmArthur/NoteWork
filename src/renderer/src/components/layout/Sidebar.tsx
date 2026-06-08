import { useNavigate, useLocation } from 'react-router-dom'
import {
  HomeOutlined, BookOutlined, CalendarOutlined, CheckSquareOutlined,
  FileTextOutlined, SettingOutlined, LogoutOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../../stores/auth.store'

const menuItems = [
  { key: '/home', icon: HomeOutlined, label: '首页' },
  { key: '/notebook', icon: BookOutlined, label: '笔记本' },
  { key: '/calendar', icon: CalendarOutlined, label: '日历' },
  { key: '/tasks', icon: CheckSquareOutlined, label: '工作清单' },
  { key: '/report', icon: FileTextOutlined, label: '报告' },
  { key: '/settings', icon: SettingOutlined, label: '设置' },
]
export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const username = useAuthStore((s) => s.username)

  const currentKey = '/' + (location.pathname.split('/')[1] || 'home')

  const handleLogout = async () => {
    await window.api.logout()
    localStorage.removeItem('noteworks:autoLogin')
    logout()
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="brand-mark sidebar-brand-mark">N</div>
        <div>
          <div className="sidebar-brand">NoteWorks</div>
          <div className="sidebar-workspace">个人工作台</div>
        </div>
      </div>

      <div className="sidebar-label">工作空间</div>
      <div className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentKey === item.key
          return (
            <div
              key={item.key}
              onClick={() => navigate(item.key)}
              className={`sidebar-item${isActive ? ' active' : ''}`}
            >
              <Icon style={{ fontSize: 18, width: 20, textAlign: 'center' }} />
              <span>{item.label}</span>
            </div>
          )
        })}
      </div>

      <div className="sidebar-account">
        <div className="sidebar-avatar">{(username || 'U').slice(0, 1).toUpperCase()}</div>
        <div className="sidebar-account-copy">
          <div className="sidebar-user">{username || '未登录'}</div>
          <div className="sidebar-account-status">本地数据已连接</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="退出登录"
          className="sidebar-logout"
          aria-label="退出登录"
        >
          <LogoutOutlined />
        </button>
      </div>
    </div>
  )
}
