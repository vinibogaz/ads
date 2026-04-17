import { create } from 'zustand'

interface AuthUser {
  sub: string
  tid: string
  role: string
  email?: string
  name?: string
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setTokens: (accessToken: string) => void
  setUser: (user: AuthUser) => void
  clearTokens: () => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setTokens: (accessToken) => {
    // Decode JWT payload (no signature verification — just display)
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]!)) as AuthUser
      set({ accessToken, isAuthenticated: true, user: payload })
    } catch {
      set({ accessToken, isAuthenticated: true })
    }
  },

  setUser: (user) => set({ user }),

  clearTokens: () => set({ accessToken: null, user: null, isAuthenticated: false }),

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ accessToken: null, user: null, isAuthenticated: false })
    window.location.href = '/login'
  },
}))
