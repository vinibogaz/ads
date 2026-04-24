import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ClientState {
  selectedClientId: string | null
  setSelectedClientId: (id: string | null) => void
}

export const useClientStore = create<ClientState>()(
  persist(
    (set) => ({
      selectedClientId: null,
      setSelectedClientId: (id) => set({ selectedClientId: id }),
    }),
    { name: 'orffia-ads-client' }
  )
)
