import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  sub: string
  tid: string
  role: string
  email?: string
  name?: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  role: string
  plan?: string
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  workspaces: Workspace[]
  isAuthenticated: boolean
  setTokens: (accessToken: string, workspaces?: Workspace[]) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  clearTokens: () => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      workspaces: [],
      isAuthenticated: false,

      setTokens: (accessToken, workspaces) => {
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]!)) as AuthUser
          set((s) => ({
            accessToken,
            isAuthenticated: true,
            user: payload,
            workspaces: workspaces ?? s.workspaces,
          }))
        } catch {
          set((s) => ({
            accessToken,
            isAuthenticated: true,
            workspaces: workspaces ?? s.workspaces,
          }))
        }
      },

      setWorkspaces: (workspaces) => set({ workspaces }),

      clearTokens: () => set({ accessToken: null, user: null, isAuthenticated: false, workspaces: [] }),

      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        set({ accessToken: null, user: null, isAuthenticated: false, workspaces: [] })
        window.location.href = '/login'
      },
    }),
    {
      name: 'orffia-auth',
      partialize: (s) => ({ workspaces: s.workspaces }),
    }
  )
)
