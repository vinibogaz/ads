'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { AdsPlatform, AdsPlatformIntegration } from '@ads/shared'

const PLATFORM_LABELS: Record<AdsPlatform, string> = {
  meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn Ads', tiktok: 'TikTok Ads',
  twitter: 'Twitter', pinterest: 'Pinterest', taboola: 'Taboola', other: 'Outro',
}

const PLATFORM_COLORS: Record<AdsPlatform, string> = {
  meta: 'bg-blue-500', google: 'bg-green-500', linkedin: 'bg-sky-600', tiktok: 'bg-pink-500',
  twitter: 'bg-sky-400', pinterest: 'bg-red-500', taboola: 'bg-orange-500', other: 'bg-gray-400',
}

type BudgetAccount = {
  id: string
  platform: AdsPlatform
  integrationId: string | null
  integrationName: string | null
  plannedAmount: number
  spentAmount: number
  remainingAmount: number
  percentUsed: number
  currency: string
}

type DashboardData = {
  period: { month: number; year: number }
  totalBudgetPlanned: number
  totalBudgetSpent: number
  totalLeads: number
  totalQualifiedLeads: number
  totalWon: number
  totalConversionsSent: number
  activePlatforms: number
  activeCrms: number
  conversionsByPlatform: { platform: AdsPlatform; count: number }[]
  leadsByStage: { stageName: string; count: number }[]
  budgetByPlatform: BudgetAccount[]
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtN = (v: number) => v.toLocaleString('pt-BR')

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-orf-surface border border-orf-border rounded-orf p-4">
      <p className="text-xs text-orf-text-2 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color ?? 'text-orf-text'}`}>{value}</p>
      {sub && <p className="text-xs text-orf-text-3 mt-0.5">{sub}</p>}
    </div>
  )
}

function ProgressBar({ pct, warn }: { pct: number; warn?: boolean }) {
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-orf-primary'
  return (
    <div className="h-1.5 bg-orf-surface-2 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function DashboardView() {
  const queryClient = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-summary', month, year],
    queryFn: () => api<DashboardData>(`/dashboard/summary?month=${month}&year=${year}`),
  })

  const { data: intData } = useQuery({
    queryKey: ['ads-platforms'],
    queryFn: () => api<AdsPlatformIntegration[]>('/ads-integrations/platforms'),
  })

  const d = data?.data
  const integrations = (intData?.data ?? []).filter((i) => i.status === 'active' && i.platform === 'meta')

  // Sync a single Meta account
  const syncAccount = async (integrationId: string) => {
    setSyncingId(integrationId)
    setSyncMsg(null)
    try {
      const res = await api<{ spend: number; leads: number; budgetUpdated: boolean }>(`/auth/meta/sync/${integrationId}`)
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['budget'] })
      const { spend, leads, budgetUpdated } = res.data
      setSyncMsg(`✓ Gasto: ${fmt(spend)} · Leads: ${leads}${budgetUpdated ? ' · Budget atualizado' : ''}`)
    } catch (e: any) {
      setSyncMsg(`Erro: ${e.message}`)
    } finally {
      setSyncingId(null)
    }
  }

  // Sync all Meta accounts
  const syncAll = async () => {
    setSyncMsg(null)
    for (const i of integrations) {
      await syncAccount(i.id)
    }
    refetch()
  }

  const totalPlanned = d?.totalBudgetPlanned ?? 0
  const totalSpent = d?.totalBudgetSpent ?? 0
  const totalRemaining = totalPlanned - totalSpent
  const totalPct = totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0
  const totalLeads = d?.totalLeads ?? 0
  const cpl = totalLeads > 0 && totalSpent > 0 ? totalSpent / totalLeads : 0
  const monthLabel = `${MONTHS[month - 1]} ${year}`

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-orf-text-2 text-sm">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orf-text">Resumo</h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }} className="text-orf-text-2 hover:text-orf-text">‹</button>
            <span className="text-sm text-orf-text-2">{monthLabel}</span>
            <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }} className="text-orf-text-2 hover:text-orf-text">›</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-orf-text-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            {d?.activePlatforms ?? 0} plataformas · {d?.activeCrms ?? 0} CRMs
          </span>
          {integrations.length > 0 && (
            <button
              onClick={syncAll}
              disabled={!!syncingId}
              className="px-3 py-1.5 bg-orf-surface border border-orf-border rounded-orf-sm text-xs text-orf-text-2 hover:text-orf-text hover:border-orf-primary transition-colors disabled:opacity-50"
            >
              {syncingId ? '⟳ Sincronizando...' : '⟳ Sincronizar Meta'}
            </button>
          )}
        </div>
      </div>

      {syncMsg && (
        <div className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-orf-sm px-3 py-2">
          {syncMsg}
        </div>
      )}

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI
          label="Budget Planejado"
          value={fmt(totalPlanned)}
          sub={`${totalPct}% utilizado`}
        />
        <KPI
          label="Budget Gasto"
          value={fmt(totalSpent)}
          sub={`Saldo: ${fmt(totalRemaining)}`}
          color={totalSpent > totalPlanned ? 'text-red-400' : 'text-orf-text'}
        />
        <KPI
          label="Total de Leads"
          value={fmtN(totalLeads)}
          sub={`${d?.totalQualifiedLeads ?? 0} qualificados · ${d?.totalWon ?? 0} fechados`}
          color="text-orf-primary"
        />
        <KPI
          label="CPL Médio"
          value={cpl > 0 ? fmt(cpl) : '—'}
          sub="Custo por lead"
        />
      </div>

      {/* Budget por conta (tabela) */}
      {(d?.budgetByPlatform?.length ?? 0) > 0 && (
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-orf-text">Budget por Conta</h2>
            <span className="text-xs text-orf-text-3">{monthLabel}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orf-border">
                  <th className="text-left px-5 py-2.5 text-xs text-orf-text-2 font-medium">Conta</th>
                  <th className="text-right px-4 py-2.5 text-xs text-orf-text-2 font-medium">Planejado</th>
                  <th className="text-right px-4 py-2.5 text-xs text-orf-text-2 font-medium">Gasto</th>
                  <th className="text-right px-4 py-2.5 text-xs text-orf-text-2 font-medium">Saldo</th>
                  <th className="px-4 py-2.5 text-xs text-orf-text-2 font-medium w-32">Progresso</th>
                  <th className="text-right px-5 py-2.5 text-xs text-orf-text-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orf-border">
                {d!.budgetByPlatform.map((b) => (
                  <tr key={b.id} className="hover:bg-orf-surface-2/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${PLATFORM_COLORS[b.platform]}`} />
                        <div>
                          <p className="text-orf-text font-medium text-xs">{b.integrationName ?? PLATFORM_LABELS[b.platform]}</p>
                          {b.integrationName && <p className="text-orf-text-3 text-xs">{PLATFORM_LABELS[b.platform]}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-orf-text text-xs">{fmt(b.plannedAmount)}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      <span className={b.spentAmount > b.plannedAmount ? 'text-red-400' : 'text-orf-text'}>{fmt(b.spentAmount)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <span className={b.remainingAmount < 0 ? 'text-red-400' : 'text-emerald-400'}>{fmt(b.remainingAmount)}</span>
                    </td>
                    <td className="px-4 py-3 w-32">
                      <ProgressBar pct={b.percentUsed} />
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-medium text-orf-text-2">{b.percentUsed}%</td>
                  </tr>
                ))}
                {/* Totais */}
                <tr className="bg-orf-surface-2/30 font-semibold">
                  <td className="px-5 py-3 text-xs text-orf-text">Total</td>
                  <td className="px-4 py-3 text-right text-xs text-orf-text">{fmt(totalPlanned)}</td>
                  <td className="px-4 py-3 text-right text-xs text-orf-text">{fmt(totalSpent)}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    <span className={totalRemaining < 0 ? 'text-red-400' : 'text-emerald-400'}>{fmt(totalRemaining)}</span>
                  </td>
                  <td className="px-4 py-3 w-32"><ProgressBar pct={totalPct} /></td>
                  <td className="px-5 py-3 text-right text-xs text-orf-text">{totalPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contas Meta com sync individual */}
      {integrations.length > 0 && (
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border">
            <h2 className="text-sm font-semibold text-orf-text">Contas Meta — Sincronização</h2>
          </div>
          <div className="divide-y divide-orf-border">
            {integrations.map((i) => (
              <div key={i.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-orf-text font-medium">{i.name}</p>
                  <p className="text-xs text-orf-text-3">
                    {i.accountId}
                    {i.lastSyncAt && ` · Sync: ${new Date(i.lastSyncAt).toLocaleString('pt-BR')}`}
                  </p>
                </div>
                <button
                  onClick={() => syncAccount(i.id)}
                  disabled={syncingId === i.id}
                  className="px-3 py-1 bg-blue-600/10 border border-blue-600/20 text-blue-400 rounded-orf-sm text-xs hover:bg-blue-600/20 transition-colors disabled:opacity-50"
                >
                  {syncingId === i.id ? 'Sincronizando...' : 'Sincronizar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Leads por etapa */}
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border">
            <h2 className="text-sm font-semibold text-orf-text">Leads por Etapa</h2>
          </div>
          {!d?.leadsByStage?.length ? (
            <div className="px-5 py-8 text-center text-sm text-orf-text-2">Configure o funil para visualizar aqui.</div>
          ) : (
            <div className="divide-y divide-orf-border">
              {d.leadsByStage.map((s) => {
                const pct = totalLeads > 0 ? Math.round((s.count / totalLeads) * 100) : 0
                return (
                  <div key={s.stageName} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-sm text-orf-text flex-1 truncate">{s.stageName}</span>
                    <div className="w-20"><div className="h-1.5 bg-orf-surface-2 rounded-full overflow-hidden"><div className="h-full bg-orf-primary rounded-full" style={{ width: `${pct}%` }} /></div></div>
                    <span className="text-xs text-orf-text-2 w-6 text-right">{s.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Stats rápidos */}
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border">
            <h2 className="text-sm font-semibold text-orf-text">Métricas do Mês</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-orf-text-2">Taxa de qualificação</span>
              <span className="text-sm font-semibold text-orf-text">
                {totalLeads > 0 ? `${Math.round(((d?.totalQualifiedLeads ?? 0) / totalLeads) * 100)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orf-text-2">Taxa de fechamento</span>
              <span className="text-sm font-semibold text-orf-text">
                {(d?.totalQualifiedLeads ?? 0) > 0 ? `${Math.round(((d?.totalWon ?? 0) / d!.totalQualifiedLeads) * 100)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orf-text-2">Vendas fechadas</span>
              <span className="text-sm font-semibold text-emerald-400">{d?.totalWon ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orf-text-2">Conv. offline enviadas</span>
              <span className="text-sm font-semibold text-orf-text">{d?.totalConversionsSent ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orf-text-2">Utilização do budget</span>
              <span className={`text-sm font-semibold ${totalPct > 90 ? 'text-red-400' : totalPct > 70 ? 'text-yellow-400' : 'text-orf-text'}`}>
                {totalPct}%
              </span>
            </div>
            {cpl > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-orf-text-2">CPL médio</span>
                <span className="text-sm font-semibold text-orf-text">{fmt(cpl)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
