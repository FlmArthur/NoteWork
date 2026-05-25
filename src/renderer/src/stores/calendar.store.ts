import { create } from 'zustand'

interface CalendarNote {
  id: string; date: string; title: string; content: string; color: string; tags: string
  created_at: string; updated_at: string
}

interface CalendarState {
  notes: CalendarNote[]
  selectedDate: string | null
  currentYear: number
  currentMonth: number
  setNotes: (notes: CalendarNote[]) => void
  setSelectedDate: (date: string | null) => void
  setCurrentMonth: (year: number, month: number) => void
  addNote: (note: CalendarNote) => void
  removeNote: (id: string) => void
  updateNote: (id: string, data: Partial<CalendarNote>) => void
}

export const useCalendarStore = create<CalendarState>((set) => ({
  notes: [],
  selectedDate: null,
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  setNotes: (notes) => set({ notes }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setCurrentMonth: (year, month) => set({ currentYear: year, currentMonth: month }),
  addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),
  removeNote: (id) => set((s) => ({ notes: s.notes.filter(n => n.id !== id) })),
  updateNote: (id, data) => set((s) => ({
    notes: s.notes.map(n => n.id === id ? { ...n, ...data } : n)
  }))
}))
