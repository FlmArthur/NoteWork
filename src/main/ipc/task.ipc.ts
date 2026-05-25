import { ipcMain } from 'electron'
import { listTasks, createTask, updateTask, deleteTask, reorderTasks } from '../services/task.service'
import type { TaskFilters } from '../services/task.service'

export function registerTaskIpc(): void {
  ipcMain.handle('task:list', (_event, filters?: TaskFilters) => listTasks(filters))
  ipcMain.handle('task:create', (_event, task: {
    title: string; description?: string; priority?: string; status?: string;
    startDate?: string; endDate?: string; dueDate?: string; tags?: string[]
  }) => createTask(task))
  ipcMain.handle('task:update', (_event, id: string, data: {
    title?: string; description?: string; priority?: string; status?: string;
    startDate?: string | null; endDate?: string | null; dueDate?: string | null; tags?: string[]
  }) => updateTask(id, data))
  ipcMain.handle('task:delete', (_event, id: string) => { deleteTask(id) })
  ipcMain.handle('task:reorder', (_event, ids: string[]) => { reorderTasks(ids) })
}
