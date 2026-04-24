'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

type UtmEntry = {
  id: string
  utmParameter: string
  utmValue: string
  label: string
  segment?: string
  color?: string
  description?: string
  createdAt: string
}

type EntryForm = {
  utmParameter: string
  utmValue: string
  label: string
  segment: string
  color: string
  description: string
}

const EMPTY_FORM: EntryForm = {
  utmParameter: 'source',
  utmValue: '',
  label: '',
  segment: '',
  color: '#6366f1',
  description: '',
}

const UTM_PARAMETERS = ['source', 'medium', 'campaign', 'content', 'term'] as const
type UtmParameter = typeof UTM_PARAMETERS[number]

const PARAMETER_LABELS: Record<UtmParameter, string> = {
  source: 'utm_source',
  medium: 'utm_medium',
  campaign: 'utm_campaign',
  content: 'utm_content',
  term: 'utm_term',
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-orf-surface border border-orf-border rounded-orf w-full max-w-lg mx-4 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-orf-border">
          <h2 className="text-sm font-semibold text-orf-text">{title}</h2>
          <button onClick={onClose} className="text-orf-text-2 hover:text-orf-text transition-colors">
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

export default function UtmDictionaryPage() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<UtmEntry | null>(null)
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['utm-dictionary'],
    queryFn: () => api<UtmEntry[]>('/utm-dictionary'),
  })
  const entries: UtmEntry[] = data?.data ?? []

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const openCreate = () => {
    setEditingEntry(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (entry: UtmEntry) => {
    setEditingEntry(entry)
    setForm({
      utmParameter: entry.utmParameter,
      utmValue: entry.utmValue,
      label: entry.label,
      segment: entry.segment ?? '',
      color: entry.color ?? '#6366f1',
      description: entry.description ?? '',
    })
    setFormError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingEntry(null)
    setFormError('')
  }

  const createEntry = useMutation({
    mutationFn: (body: EntryForm) =>
      api('/utm-dictionary', {
        method: 'POST',
        body: JSON.stringify({
          utmParameter: body.utmParameter,
          utmValue: body.utmValue.trim(),
          label: body.label.trim(),
          segment: body.segment.trim() || undefined,
          color: body.color || undefined,
          description: body.description.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-dictionary'] })
      closeModal()
      setToast({ type: 'success', message: 'Entrada criada com sucesso!' })
    },
    onError: (e: any) => setFormError(e.message ?? 'Erro ao criar entrada'),
  })

  const updateEntry = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<EntryForm> }) =>
      api(`/utm-dictionary/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          utmParameter: body.utmParameter,
          utmValue: body.utmValue?.trim(),
          label: body.label?.trim(),
          segment: body.segment?.trim() || undefined,
          color: body.color || undefined,
          description: body.description?.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-dictionary'] })
      closeModal()
      setToast({ type: 'success', message: 'Entrada atualizada com sucesso!' })
    },
    onError: (e: any) => setFormError(e.message ?? 'Erro ao atualizar entrada'),
  })

  const deleteEntry = useMutation({
    mutationFn: (id: string) => api(`/utm-dictionary/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-dictionary'] })
      setToast({ type: 'success', message: 'Entrada removida.' })
    },
    onError: (e: any) => setToast({ type: 'error', message: e.message ?? 'Erro ao remover entrada' }),
  })

  const handleSubmit = () => {
    if (!form.utmValue.trim()) { setFormError('Valor UTM é obrigatório'); return }
    if (!form.label.trim()) { setFormError('Label é obrigatório'); return }
    setFormError('')

    if (editingEntry) {
      updateEntry.mutate({ id: editingEntry.id, body: form })
    } else {
      createEntry.mutate(form)
    }
  }

  const isPending = createEntry.isPending || updateEntry.isPending

  // Group entries by utmParameter
  const grouped = UTM_PARAMETERS.reduce<Record<UtmParameter, UtmEntry[]>>((acc, param) => {
    acc[param] = entries.filter((e) => e.utmParameter === param)
    return acc
  }, {} as Record<UtmParameter, UtmEntry[]>)

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-orf shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orf-text">Dicionário de UTMs</h1>
          <p className="text-sm text-orf-text-2 mt-0.5">Traduza valores de UTM para nomes legíveis e segmentos</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 transition-colors"
        >
          + Adicionar UTM
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-orf-text-2">Carregando...</div>
      ) : (
        <div className="space-y-6">
          {UTM_PARAMETERS.map((param) => {
            const groupEntries = grouped[param]
            return (
              <section key={param} className="bg-orf-surface border border-orf-border rounded-orf overflow-hidden">
                {/* Section header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-orf-border bg-orf-surface-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-orf-primary bg-orf-primary/10 px-2 py-0.5 rounded">
                      {PARAMETER_LABELS[param]}
                    </span>
                    <span className="text-xs text-orf-text-3">
                      {groupEntries.length} {groupEntries.length === 1 ? 'entrada' : 'entradas'}
                    </span>
                  </div>
                  <button
                    onClick={() => { setForm({ ...EMPTY_FORM, utmParameter: param }); setEditingEntry(null); setFormError(''); setShowModal(true) }}
                    className="text-xs text-orf-primary hover:underline"
                  >
                    + Adicionar
                  </button>
                </div>

                {groupEntries.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-orf-text-3">
                    Nenhuma entrada para <span className="font-mono">{PARAMETER_LABELS[param]}</span>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-orf-border">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-orf-text-3 uppercase tracking-wide">Valor UTM</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-orf-text-3 uppercase tracking-wide">Label</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-orf-text-3 uppercase tracking-wide">Segmento</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-orf-text-3 uppercase tracking-wide">Cor</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-orf-text-3 uppercase tracking-wide">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupEntries.map((entry, idx) => (
                        <tr
                          key={entry.id}
                          className={`border-b border-orf-border last:border-0 ${idx % 2 === 1 ? 'bg-orf-surface-2/40' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-orf-text bg-orf-surface-2 border border-orf-border px-1.5 py-0.5 rounded">
                              {entry.utmValue}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-orf-text font-medium">{entry.label}</span>
                            {entry.description && (
                              <p className="text-xs text-orf-text-3 mt-0.5">{entry.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {entry.segment ? (
                              <span className="text-xs text-orf-text-2 bg-orf-surface-2 border border-orf-border px-2 py-0.5 rounded-full">
                                {entry.segment}
                              </span>
                            ) : (
                              <span className="text-xs text-orf-text-3">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {entry.color ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-4 h-4 rounded-full border border-orf-border shrink-0"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-xs font-mono text-orf-text-3">{entry.color}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-orf-text-3">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => openEdit(entry)}
                                className="text-xs text-orf-primary hover:text-orf-primary/80 transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Remover "${entry.label}"?`)) deleteEntry.mutate(entry.id)
                                }}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                              >
                                Remover
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* Modal: Create / Edit */}
      {showModal && (
        <Modal
          title={editingEntry ? 'Editar Entrada UTM' : 'Nova Entrada UTM'}
          onClose={closeModal}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Parâmetro</label>
                <select
                  value={form.utmParameter}
                  onChange={(e) => setForm((f) => ({ ...f, utmParameter: e.target.value }))}
                  className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text focus:outline-none focus:border-orf-primary"
                >
                  {UTM_PARAMETERS.map((p) => (
                    <option key={p} value={p}>{PARAMETER_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-orf-text-2 mb-1.5">
                  Valor UTM <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: google-cpc"
                  value={form.utmValue}
                  onChange={(e) => setForm((f) => ({ ...f, utmValue: e.target.value }))}
                  className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">
                Label <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="ex: Google CPC"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-orf-text-2 mb-1.5">
                  Segmento <span className="text-orf-text-3">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="ex: Pago"
                  value={form.segment}
                  onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
                  className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-orf-text-2 mb-1.5">
                  Cor <span className="text-orf-text-3">(hex)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-8 h-9 p-0.5 bg-orf-surface-2 border border-orf-border rounded-orf-sm cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text font-mono focus:outline-none focus:border-orf-primary"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">
                Descrição <span className="text-orf-text-3">(opcional)</span>
              </label>
              <input
                type="text"
                placeholder="ex: Tráfego pago via Google"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Salvando...' : editingEntry ? 'Salvar alterações' : 'Criar entrada'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
