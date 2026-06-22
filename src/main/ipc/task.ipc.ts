import { ipcMain } from 'electron'
import {
  listTasks, createTask, updateTask, deleteTask, reorderTasks,
  addTaskSummary, updateTaskSummary, deleteTaskSummary, deferTask, listTaskActivities
} from '../services/task.service'
import type { TaskFilters } from '../services/task.service'

export function registerTaskIpc(): void {
  ipcMain.handle('task:list', (_event, filters?: TaskFilters) => listTasks(filters))
  ipcMain.handle('task:create', (_event, task: {
    title: string; description?: string; priority?: string; status?: string;
    startDate?: string; endDate?: string; dueDate?: string; tags?: string[]
  }) => createTask(task))
  ipcMain.handle('task:update', (_event, id: string, data: {
    title?: string; description?: string; priority?: string; status?: string;
    statusNote?: string; startDate?: string | null; endDate?: string | null;
    dueDate?: string | null; tags?: string[]
  }) => updateTask(id, data))
  ipcMain.handle('task:add-summary', (_event, id: string, data: {
    type: 'progress_summary' | 'daily_summary'; content: string; summaryDate?: string
  }) => addTaskSummary(id, data))
  ipcMain.handle('task:update-summary', (_event, taskId: string, activityId: string, data: {
    type: 'progress_summary' | 'daily_summary'; content: string; summaryDate: string
  }) => updateTaskSummary(taskId, activityId, data))
  ipcMain.handle('task:delete-summary', (_event, taskId: string, activityId: string) =>
    deleteTaskSummary(taskId, activityId))
  ipcMain.handle('task:defer', (_event, id: string, data: {
    newDate: string; reason?: string
  }) => deferTask(id, data))
  ipcMain.handle('task:activities', (_event, id: string) => listTaskActivities(id))
  ipcMain.handle('task:delete', (_event, id: string) => { deleteTask(id) })
  ipcMain.handle('task:reorder', (_event, ids: string[]) => { reorderTasks(ids) })
}
