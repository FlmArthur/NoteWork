import { create } from 'zustand'

interface AuthState {
  userId: string | null
  username: string | null
  setUser: (userId: string, username: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  username: null,
  setUser: (userId, username) => set({ userId, username }),
  logout: () => set({ userId: null, username: null })
}))
