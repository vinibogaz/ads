'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'

type Client = {
  id: string
  name: string
  description?: string
  color: string
  logoUrl?: string
  createdAt: string
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#3b82f6', '#64748b', '#1e293b',
]

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-orf-surface border border-orf-border rounded-orf w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-orf-border">
          <h2 className="text-sm font-semibold text-orf-text">{title}</h2>
          <button onClick={onClose} className="text-orf-text-2 hover:text-orf-text">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

export function ClientsView() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Client | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' })

  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api<Client[]>('/clients'),
  })

  const clients: Client[] = data?.data ?? []

  const openAdd = () => {
    setForm({ name: '', description: '', color: '#6366f1' })
    setEditTarget(null)
    setError('')
    setShowModal(true)
  }

  const openEdit = (c: Client) => {
    setForm({ name: c.name, description: c.description ?? '', color: c.color })
    setEditTarget(c)
    setError('')
    setShowModal(true)
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Nome obrigatório')
      if (editTarget) {
        return api(`/clients/${editTarget.id}`, { method: 'PATCH', body: JSON.stringify(form) })
      }
      return api('/clients', { method: 'POST', body: JSON.stringify(form) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setShowModal(false)
      setError('')
    },
    onError: (e: any) => setError(e.message ?? 'Erro ao salvar'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api(`/clients/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orf-text">Clientes</h1>
          <p className="text-sm text-orf-text-2 mt-0.5">Organize suas contas de anúncio por cliente</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 transition-colors"
        >
          + Novo Cliente
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-orf-text-2">Carregando...</div>
      ) : clients.length === 0 ? (
        <div className="bg-orf-surface border border-orf-border rounded-orf p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm text-orf-text-2 mb-1">Nenhum cliente cadastrado</p>
          <p className="text-xs text-orf-text-3 mb-4">Crie clientes para organizar suas contas de anúncio, budget e leads.</p>
          <button onClick={openAdd} className="text-sm text-orf-primary hover:underline">Criar primeiro cliente</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div key={c.id} className="bg-orf-surface border border-orf-border rounded-orf p-5 hover:border-orf-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-orf-sm flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-orf-text">{c.name}</p>
                    {c.description && <p className="text-xs text-orf-text-3 mt-0.5 line-clamp-1">{c.description}</p>}
                  </div>
                </div>
              </div>
              <p className="text-xs text-orf-text-3 mb-4">
                Criado em {new Date(c.createdAt).toLocaleDateString('pt-BR')}
              </p>
              <div className="flex items-center gap-3 border-t border-orf-border pt-3">
                <button onClick={() => openEdit(c)} className="text-xs text-orf-primary hover:underline">Editar</button>
                <button
                  onClick={() => {
                    if (confirm(`Remover "${c.name}"? Leads e integrações vinculados não serão deletados.`)) {
                      remove.mutate(c.id)
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editTarget ? 'Editar Cliente' : 'Novo Cliente'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Nome *</label>
              <input
                type="text"
                placeholder="Ex: Empresa XYZ"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Descrição <span className="text-orf-text-3">(opcional)</span></label>
              <input
                type="text"
                placeholder="Ex: E-commerce de moda feminina"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-2">Cor</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-orf-surface scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text">Cancelar</button>
              <button
                onClick={() => save.mutate()}
                disabled={!form.name || save.isPending}
                className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50"
              >
                {save.isPending ? 'Salvando...' : editTarget ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
