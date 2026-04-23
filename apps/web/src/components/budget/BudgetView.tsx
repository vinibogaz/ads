'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { BudgetSummary, AdsPlatformIntegration, AdsPlatform } from '@ads/shared'

const PLATFORM_LABELS: Record<AdsPlatform, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  linkedin: 'LinkedIn Ads',
  tiktok: 'TikTok Ads',
  twitter: 'Twitter Ads',
  pinterest: 'Pinterest Ads',
  taboola: 'Taboola',
  other: 'Outro',
}

const PLATFORM_COLORS: Record<AdsPlatform, string> = {
  meta: 'bg-blue-500',
  google: 'bg-green-500',
  linkedin: 'bg-sky-600',
  tiktok: 'bg-pink-500',
  twitter: 'bg-sky-400',
  pinterest: 'bg-red-500',
  taboola: 'bg-orange-500',
  other: 'bg-gray-400',
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-orf-surface border border-orf-border rounded-orf w-full max-w-md mx-4 shadow-xl">
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

type BudgetRow = BudgetSummary & { id: string; integrationId?: string; notes?: string; integration?: { name: string } }

export function BudgetView() {
  const queryClient = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<BudgetRow | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    integrationId: '',
    platform: 'meta' as AdsPlatform,
    plannedAmount: '',
    notes: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['budget', month, year],
    queryFn: () => api<BudgetRow[]>(`/budget?month=${month}&year=${year}`),
  })

  const { data: integrationsData } = useQuery({
    queryKey: ['ads-platforms'],
    queryFn: () => api<AdsPlatformIntegration[]>('/ads-integrations/platforms'),
  })

  const budgets: BudgetRow[] = data?.data ?? []
  const integrations = (integrationsData?.data ?? []).filter((i) => i.status === 'active')

  const totalPlanned = budgets.reduce((s, b) => s + b.plannedAmount, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spentAmount, 0)
  const totalRemaining = totalPlanned - totalSpent

  const openAdd = () => {
    setForm({ integrationId: integrations[0]?.id ?? '', platform: integrations[0]?.platform ?? 'meta', plannedAmount: '', notes: '' })
    setEditTarget(null)
    setError('')
    setShowModal(true)
  }

  const openEdit = (b: BudgetRow) => {
    setForm({
      integrationId: b.integrationId ?? '',
      platform: b.platform,
      plannedAmount: b.plannedAmount.toString(),
      notes: b.notes ?? '',
    })
    setEditTarget(b)
    setError('')
    setShowModal(true)
  }

  const saveBudget = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.plannedAmount.replace(',', '.'))
      if (!amount || amount <= 0) throw new Error('Valor inválido')

      if (editTarget) {
        return api(`/budget/${editTarget.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ plannedAmount: amount, notes: form.notes || undefined }),
        })
      }
      return api('/budget', {
        method: 'POST',
        body: JSON.stringify({
          integrationId: form.integrationId || undefined,
          platform: form.platform,
          month,
          year,
          plannedAmount: amount,
          currency: 'BRL',
          notes: form.notes || undefined,
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget'] })
      setShowModal(false)
      setError('')
    },
    onError: (e: any) => setError(e.message ?? 'Erro ao salvar'),
  })

  const deleteBudget = useMutation({
    mutationFn: (id: string) => api(`/budget/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget'] }),
  })

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orf-text">Budget</h1>
          {/* Month/Year navigation */}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }}
              className="text-orf-text-2 hover:text-orf-text transition-colors"
            >
              ‹
            </button>
            <span className="text-sm text-orf-text-2">
              {months[month - 1]} {year}
            </span>
            <button
              onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }}
              className="text-orf-text-2 hover:text-orf-text transition-colors"
            >
              ›
            </button>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 transition-colors"
        >
          + Adicionar Budget
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-orf-surface rounded-orf border border-orf-border p-4">
          <p className="text-xs text-orf-text-2 uppercase tracking-wide">Total Planejado</p>
          <p className="text-2xl font-bold text-orf-text mt-1">
            {totalPlanned.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="bg-orf-surface rounded-orf border border-orf-border p-4">
          <p className="text-xs text-orf-text-2 uppercase tracking-wide">Total Gasto</p>
          <p className="text-2xl font-bold text-orf-text mt-1">
            {totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="bg-orf-surface rounded-orf border border-orf-border p-4">
          <p className="text-xs text-orf-text-2 uppercase tracking-wide">Saldo Restante</p>
          <p className={`text-2xl font-bold mt-1 ${totalRemaining < 0 ? 'text-red-500' : 'text-orf-text'}`}>
            {totalRemaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      {/* Budget list */}
      <div className="bg-orf-surface rounded-orf border border-orf-border">
        <div className="px-5 py-4 border-b border-orf-border">
          <h2 className="text-sm font-semibold text-orf-text">Por Plataforma</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-orf-text-2 text-sm">Carregando...</div>
        ) : budgets.length === 0 ? (
          <div className="p-8 text-center text-orf-text-2 text-sm">
            Nenhum budget cadastrado para este mês.{' '}
            <button onClick={openAdd} className="text-orf-primary hover:underline">Adicionar agora</button>
          </div>
        ) : (
          <div className="divide-y divide-orf-border">
            {budgets.map((b) => (
              <div key={b.id} className="px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PLATFORM_COLORS[b.platform]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium text-orf-text">{PLATFORM_LABELS[b.platform]}</span>
                        {b.integration?.name && (
                          <span className="ml-2 text-xs text-orf-text-3">{b.integration.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-orf-text-2">
                          {b.spentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          {' / '}
                          {b.plannedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <button onClick={() => openEdit(b)} className="text-xs text-orf-primary hover:underline">Editar</button>
                        <button onClick={() => deleteBudget.mutate(b.id)} className="text-xs text-red-400 hover:text-red-600">Remover</button>
                      </div>
                    </div>
                    <div className="h-1.5 bg-orf-surface-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          b.percentUsed > 90 ? 'bg-red-500' : b.percentUsed > 70 ? 'bg-yellow-500' : 'bg-orf-primary'
                        }`}
                        style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-orf-text-2 w-10 text-right">{b.percentUsed}%</span>
                </div>
                {b.notes && <p className="mt-1.5 ml-6 text-xs text-orf-text-3">{b.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal
          title={editTarget ? 'Editar Budget' : 'Adicionar Budget'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            {!editTarget && (
              <>
                {integrations.length > 0 ? (
                  <div>
                    <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Conta de Anúncio</label>
                    <select
                      value={form.integrationId}
                      onChange={(e) => {
                        const integration = integrations.find((i) => i.id === e.target.value)
                        setForm((f) => ({ ...f, integrationId: e.target.value, platform: integration?.platform ?? f.platform }))
                      }}
                      className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text focus:outline-none focus:border-orf-primary"
                    >
                      <option value="">— Sem conta específica —</option>
                      {integrations.map((i) => (
                        <option key={i.id} value={i.id}>{i.name} ({PLATFORM_LABELS[i.platform]})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Plataforma</label>
                    <select
                      value={form.platform}
                      onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as AdsPlatform }))}
                      className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text focus:outline-none focus:border-orf-primary"
                    >
                      {(Object.entries(PLATFORM_LABELS) as [AdsPlatform, string][]).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Valor Planejado (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 5000"
                value={form.plannedAmount}
                onChange={(e) => setForm((f) => ({ ...f, plannedAmount: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Notas <span className="text-orf-text-3">(opcional)</span></label>
              <input
                type="text"
                placeholder="Ex: Verba aprovada reunião 15/04"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => saveBudget.mutate()}
                disabled={!form.plannedAmount || saveBudget.isPending}
                className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50 transition-colors"
              >
                {saveBudget.isPending ? 'Salvando...' : editTarget ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
