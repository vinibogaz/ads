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
  website?: string
  industry?: string
  phone?: string
  notes?: string
  createdAt: string
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#3b82f6', '#64748b', '#1e293b',
]

const INDUSTRIES = [
  'Tecnologia', 'E-commerce', 'Saúde', 'Educação', 'Imobiliário',
  'Financeiro', 'Alimentação', 'Moda', 'Beleza', 'Automotivo',
  'Serviços', 'Varejo', 'Indústria', 'Agronegócio', 'Outro',
]

type FormState = {
  name: string
  description: string
  color: string
  website: string
  industry: string
  phone: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: '', description: '', color: '#6366f1',
  website: '', industry: '', phone: '', notes: '',
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-orf-surface border border-orf-border rounded-orf w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-orf-border sticky top-0 bg-orf-surface z-10">
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

function Field({ label, children, optional }: { label: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-orf-text-2 mb-1.5">
        {label} {optional && <span className="text-orf-text-3">(opcional)</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary'

export function ClientsView() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Client | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api<Client[]>('/clients'),
  })

  const clients: Client[] = data?.data ?? []

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setError('')
    setShowModal(true)
  }

  const openEdit = (c: Client) => {
    setForm({
      name: c.name,
      description: c.description ?? '',
      color: c.color,
      website: c.website ?? '',
      industry: c.industry ?? '',
      phone: c.phone ?? '',
      notes: c.notes ?? '',
    })
    setEditTarget(c)
    setError('')
    setShowModal(true)
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Nome obrigatório')
      const payload = {
        name: form.name.trim(),
        description: form.description || undefined,
        color: form.color,
        website: form.website || undefined,
        industry: form.industry || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      }
      if (editTarget) {
        return api(`/clients/${editTarget.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      }
      return api('/clients', { method: 'POST', body: JSON.stringify(payload) })
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
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-orf-text">{c.name}</p>
                    {c.industry && (
                      <span className="text-xs text-orf-text-3 bg-orf-surface-2 px-1.5 py-0.5 rounded mt-0.5 inline-block">{c.industry}</span>
                    )}
                    {!c.industry && c.description && (
                      <p className="text-xs text-orf-text-3 mt-0.5 line-clamp-1">{c.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {c.website && (
                  <p className="text-xs text-orf-text-3 flex items-center gap-1.5">
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
                    <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-orf-primary truncate">{c.website.replace(/^https?:\/\//, '')}</a>
                  </p>
                )}
                {c.phone && (
                  <p className="text-xs text-orf-text-3 flex items-center gap-1.5">
                    <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {c.phone}
                  </p>
                )}
                {c.description && c.industry && (
                  <p className="text-xs text-orf-text-3 line-clamp-2">{c.description}</p>
                )}
              </div>

              <p className="text-xs text-orf-text-3 mb-3">
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
            <Field label="Nome *">
              <input type="text" placeholder="Ex: Empresa XYZ" value={form.name} onChange={set('name')} className={inputCls} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Setor" optional>
                <select value={form.industry} onChange={set('industry')} className={inputCls}>
                  <option value="">Selecione...</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Telefone" optional>
                <input type="text" placeholder="(11) 99999-9999" value={form.phone} onChange={set('phone')} className={inputCls} />
              </Field>
            </div>

            <Field label="Website" optional>
              <input type="text" placeholder="exemplo.com.br" value={form.website} onChange={set('website')} className={inputCls} />
            </Field>

            <Field label="Descrição" optional>
              <input type="text" placeholder="Ex: E-commerce de moda feminina" value={form.description} onChange={set('description')} className={inputCls} />
            </Field>

            <Field label="Notas internas" optional>
              <textarea
                placeholder="Observações sobre o cliente, estratégias, metas..."
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </Field>

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
