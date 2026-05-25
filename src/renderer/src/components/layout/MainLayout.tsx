import { Routes, Route, Navigate, HashRouter } from 'react-router-dom'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import HomePage from '../../pages/home/HomePage'
import NotebookListPage from '../../pages/notebook/NotebookListPage'
import CalendarPage from '../../pages/calendar/CalendarPage'
import TaskListPage from '../../pages/tasks/TaskListPage'
import ReportPage from '../../pages/report/ReportPage'
import SettingsPage from '../../pages/settings/SettingsPage'

export default function MainLayout() {
  return (
    <HashRouter>
      <div className="app-shell">
        <TitleBar />
        <div className="app-content">
          <Sidebar />
          <div className="main-surface">
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/notebook" element={<NotebookListPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/tasks" element={<TaskListPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </div>
      </div>
    </HashRouter>
  )
}
