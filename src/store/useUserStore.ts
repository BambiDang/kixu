import { create } from 'zustand'
import type { Database } from '@/types/database'

type User = Database['public']['Tables']['users']['Row']

interface UserStore {
  user: User | null
  setUser: (user: User | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))
