import { create } from 'zustand'

interface Task {
  id: string; title: string; description: string; priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'paused' | 'done'; start_date: string | null; end_date: string | null
  due_date: string | null; tags: string; sort_order: number; completed_at: string | null
  created_at: string; updated_at: string; activities?: TaskActivity[]
}

interface TaskActivity {
  id: string; task_id: string
  type: 'progress_summary' | 'daily_summary' | 'status_change' | 'defer'
  content: string; summary_date: string; metadata: string; created_at: string
}
interface TaskFilters {
  status?: string; priority?: string; dateFrom?: string; dateTo?: string; search?: string
}

interface TaskState {
  tasks: Task[]
  filters: TaskFilters
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  removeTask: (id: string) => void
  updateTask: (id: string, data: Partial<Task>) => void
  setFilters: (filters: TaskFilters) => void
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  filters: {},
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter(t => t.id !== id) })),
  updateTask: (id, data) => set((s) => ({
    tasks: s.tasks.map(t => t.id === id ? { ...t, ...data } : t)
  })),
  setFilters: (filters) => set({ filters })
}))
