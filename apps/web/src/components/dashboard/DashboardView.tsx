'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useClientStore } from '@/store/client'
import type { AdsPlatform, AdsPlatformIntegration } from '@ads/shared'

type LeadMetrics = {
  total: number
  paid: number
  organic: number
  paidPct: number
  organicPct: number
  won: number
  totalRevenue: number
  totalMrr: number
  ticketMedio: number
  avgClosingDays: number
  bySegment: Record<string, number>
}

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
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  leads: number
  cpl: number
}

type DashboardData = {
  period: { month: number; year: number }
  totalBudgetPlanned: number
  totalBudgetSpent: number
  totalLeads: number
  totalQualifiedLeads: number
  totalWon: number
  totalConversionsSent: number
  totalImpressions: number
  totalClicks: number
  avgCtr: number
  avgCpm: number
  cpl: number
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
      <p className={`text-xl font-bold mt-1 ${color ?? 'text-orf-text'}`}>{value}</p>
      {sub && <p className="text-xs text-orf-text-3 mt-0.5">{sub}</p>}
    </div>
  )
}

function ProgressBar({ pct }: { pct: number }) {
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
  const { selectedClientId } = useClientStore()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-summary', month, year, selectedClientId],
    queryFn: () => {
      const params = new URLSearchParams({ month: String(month), year: String(year) })
      if (selectedClientId) params.set('clientId', selectedClientId)
      return api<DashboardData>(`/dashboard/summary?${params}`)
    },
  })

  const { data: intData } = useQuery({
    queryKey: ['ads-platforms', selectedClientId],
    queryFn: () => {
      const params = selectedClientId ? `?clientId=${selectedClientId}` : ''
      return api<AdsPlatformIntegration[]>(`/ads-integrations/platforms${params}`)
    },
  })

  const { data: leadMetricsData } = useQuery({
    queryKey: ['lead-metrics', selectedClientId, month, year],
    queryFn: () => {
      const from = new Date(year, month - 1, 1).toISOString()
      const to = new Date(year, month, 0, 23, 59, 59).toISOString()
      const params = new URLSearchParams({ from, to })
      if (selectedClientId) params.set('clientId', selectedClientId)
      return api<LeadMetrics>(`/leads/metrics?${params}`)
    },
  })

  const lm = leadMetricsData?.data

  const d = data?.data
  const integrations = (intData?.data ?? []).filter((i) => i.status === 'active' && i.platform === 'meta')

  const syncAccount = async (integrationId: string) => {
    setSyncingId(integrationId)
    setSyncMsg(null)
    try {
      const res = await api<{ spend: number; leads: number; impressions: number; clicks: number; ctr: number; budgetUpdated: boolean }>(`/auth/meta/sync/${integrationId}`)
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['budget'] })
      const { spend, leads, impressions, clicks, ctr, budgetUpdated } = res.data
      setSyncMsg(`✓ Gasto: ${fmt(spend)} · Leads: ${leads} · ${fmtN(impressions)} impressões · ${fmtN(clicks)} cliques · CTR: ${ctr}%${budgetUpdated ? ' · Budget atualizado' : ''}`)
    } catch (e: any) {
      setSyncMsg(`Erro: ${e.message}`)
    } finally {
      setSyncingId(null)
    }
  }

  const syncAll = async () => {
    setSyncMsg(null)
    for (const i of integrations) await syncAccount(i.id)
    refetch()
  }

  const totalPlanned = d?.totalBudgetPlanned ?? 0
  const totalSpent = d?.totalBudgetSpent ?? 0
  const totalRemaining = totalPlanned - totalSpent
  const totalPct = totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0
  const totalLeads = d?.totalLeads ?? 0
  const monthLabel = `${MONTHS[month - 1]} ${year}`

  if (isLoading) return <div className="flex items-center justify-center h-64 text-orf-text-2 text-sm">Carregando...</div>

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

      {/* KPIs - row 1: budget + leads */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Budget Planejado" value={fmt(totalPlanned)} sub={`${totalPct}% utilizado`} />
        <KPI label="Budget Gasto" value={fmt(totalSpent)} sub={`Saldo: ${fmt(totalRemaining)}`} color={totalSpent > totalPlanned ? 'text-red-400' : 'text-orf-text'} />
        <KPI label="Total de Leads" value={fmtN(totalLeads)} sub={`${d?.totalQualifiedLeads ?? 0} qualificados · ${d?.totalWon ?? 0} fechados`} color="text-orf-primary" />
        <KPI label="CPL Médio" value={(d?.cpl ?? 0) > 0 ? fmt(d!.cpl) : '—'} sub="Custo por lead" />
      </div>

      {/* KPIs - row 2: tráfego */}
      {((d?.totalImpressions ?? 0) > 0 || (d?.totalClicks ?? 0) > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Impressões" value={fmtN(d?.totalImpressions ?? 0)} sub="Total do período" />
          <KPI label="Cliques" value={fmtN(d?.totalClicks ?? 0)} sub="Total do período" />
          <KPI label="CTR Médio" value={(d?.avgCtr ?? 0) > 0 ? `${d!.avgCtr}%` : '—'} sub="Taxa de clique" />
          <KPI label="CPM Médio" value={(d?.avgCpm ?? 0) > 0 ? fmt(d!.avgCpm) : '—'} sub="Custo por mil impressões" />
        </div>
      )}

      {/* Budget por conta */}
      {(d?.budgetByPlatform?.length ?? 0) > 0 && (
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-orf-text">Budget por Conta</h2>
            <span className="text-xs text-orf-text-3">{monthLabel}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-orf-border text-orf-text-2">
                  <th className="text-left px-5 py-2.5 font-medium">Conta</th>
                  <th className="text-right px-4 py-2.5 font-medium">Planejado</th>
                  <th className="text-right px-4 py-2.5 font-medium">Gasto</th>
                  <th className="text-right px-4 py-2.5 font-medium">Saldo</th>
                  <th className="text-right px-4 py-2.5 font-medium">Impressões</th>
                  <th className="text-right px-4 py-2.5 font-medium">Cliques</th>
                  <th className="text-right px-4 py-2.5 font-medium">CTR</th>
                  <th className="text-right px-4 py-2.5 font-medium">CPM</th>
                  <th className="px-4 py-2.5 font-medium w-28">Progresso</th>
                  <th className="text-right px-5 py-2.5 font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orf-border">
                {d!.budgetByPlatform.map((b) => (
                  <tr key={b.id} className="hover:bg-orf-surface-2/30">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${PLATFORM_COLORS[b.platform]}`} />
                        <div>
                          <p className="text-orf-text font-medium">{b.integrationName ?? PLATFORM_LABELS[b.platform]}</p>
                          {b.integrationName && <p className="text-orf-text-3">{PLATFORM_LABELS[b.platform]}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-orf-text">{fmt(b.plannedAmount)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={b.spentAmount > b.plannedAmount ? 'text-red-400' : 'text-orf-text'}>{fmt(b.spentAmount)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={b.remainingAmount < 0 ? 'text-red-400' : 'text-emerald-400'}>{fmt(b.remainingAmount)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-orf-text-2">{b.impressions > 0 ? fmtN(b.impressions) : '—'}</td>
                    <td className="px-4 py-3 text-right text-orf-text-2">{b.clicks > 0 ? fmtN(b.clicks) : '—'}</td>
                    <td className="px-4 py-3 text-right text-orf-text-2">{b.ctr > 0 ? `${b.ctr}%` : '—'}</td>
                    <td className="px-4 py-3 text-right text-orf-text-2">{b.cpm > 0 ? fmt(b.cpm) : '—'}</td>
                    <td className="px-4 py-3 w-28"><ProgressBar pct={b.percentUsed} /></td>
                    <td className="px-5 py-3 text-right font-medium text-orf-text-2">{b.percentUsed}%</td>
                  </tr>
                ))}
                <tr className="bg-orf-surface-2/30 font-semibold">
                  <td className="px-5 py-3 text-orf-text">Total</td>
                  <td className="px-4 py-3 text-right text-orf-text">{fmt(totalPlanned)}</td>
                  <td className="px-4 py-3 text-right text-orf-text">{fmt(totalSpent)}</td>
                  <td className="px-4 py-3 text-right"><span className={totalRemaining < 0 ? 'text-red-400' : 'text-emerald-400'}>{fmt(totalRemaining)}</span></td>
                  <td className="px-4 py-3 text-right text-orf-text-2">{(d?.totalImpressions ?? 0) > 0 ? fmtN(d!.totalImpressions) : '—'}</td>
                  <td className="px-4 py-3 text-right text-orf-text-2">{(d?.totalClicks ?? 0) > 0 ? fmtN(d!.totalClicks) : '—'}</td>
                  <td className="px-4 py-3 text-right text-orf-text-2">{(d?.avgCtr ?? 0) > 0 ? `${d!.avgCtr}%` : '—'}</td>
                  <td className="px-4 py-3 text-right text-orf-text-2">{(d?.avgCpm ?? 0) > 0 ? fmt(d!.avgCpm) : '—'}</td>
                  <td className="px-4 py-3 w-28"><ProgressBar pct={totalPct} /></td>
                  <td className="px-5 py-3 text-right text-orf-text">{totalPct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contas Meta — sync individual */}
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

      {/* Revenue KPIs */}
      {lm && (lm.totalRevenue > 0 || lm.totalMrr > 0 || lm.won > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI
            label="Receita Total"
            value={lm.totalRevenue > 0 ? fmt(lm.totalRevenue) : '—'}
            sub={`${lm.won} venda${lm.won !== 1 ? 's' : ''} fechada${lm.won !== 1 ? 's' : ''}`}
            color="text-emerald-400"
          />
          <KPI
            label="Ticket Médio"
            value={lm.ticketMedio > 0 ? fmt(lm.ticketMedio) : '—'}
            sub="Por venda fechada"
          />
          <KPI
            label="MRR Total"
            value={lm.totalMrr > 0 ? fmt(lm.totalMrr) : '—'}
            sub="Receita recorrente mensal"
          />
          <KPI
            label="Tempo Médio de Fechamento"
            value={lm.avgClosingDays > 0 ? `${lm.avgClosingDays}d` : '—'}
            sub="Da entrada até o fechamento"
          />
        </div>
      )}

      {/* Leads Pago vs Orgânico */}
      {lm && lm.total > 0 && (
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border">
            <h2 className="text-sm font-semibold text-orf-text">Leads — Pago vs Orgânico</h2>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-orf-text-2">Pago</span>
                <span className="text-sm font-semibold text-orf-text">{lm.paid} <span className="text-orf-text-3 font-normal">({lm.paidPct}%)</span></span>
              </div>
              <div className="h-2 bg-orf-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${lm.paidPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-orf-text-2">Orgânico</span>
                <span className="text-sm font-semibold text-orf-text">{lm.organic} <span className="text-orf-text-3 font-normal">({lm.organicPct}%)</span></span>
              </div>
              <div className="h-2 bg-orf-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${lm.organicPct}%` }} />
              </div>
            </div>
          </div>
          {/* CPL for paid leads */}
          {(d?.cpl ?? 0) > 0 && lm.paid > 0 && (
            <div className="px-5 pb-4 flex gap-6">
              <div className="text-xs text-orf-text-3">CPL (pago): <span className="text-orf-text font-semibold">{fmt(d!.cpl)}</span></div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Leads por etapa */}
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border">
            <h2 className="text-sm font-semibold text-orf-text">Leads por Etapa</h2>
          </div>
          {!d?.leadsByStage?.length ? (
            <div className="px-5 py-8 text-center text-sm text-orf-text-2">Configure o funil para visualizar.</div>
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

        {/* Métricas do Mês */}
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border">
            <h2 className="text-sm font-semibold text-orf-text">Métricas do Mês</h2>
          </div>
          <div className="px-5 py-4 space-y-3.5">
            {[
              ['Taxa de qualificação', totalLeads > 0 ? `${Math.round(((d?.totalQualifiedLeads ?? 0) / totalLeads) * 100)}%` : '—'],
              ['Taxa de fechamento', (d?.totalQualifiedLeads ?? 0) > 0 ? `${Math.round(((d?.totalWon ?? 0) / d!.totalQualifiedLeads) * 100)}%` : '—'],
              ['Vendas fechadas', String(d?.totalWon ?? 0), 'text-emerald-400'],
              ['Conv. offline enviadas', String(d?.totalConversionsSent ?? 0)],
              ['Utilização do budget', `${totalPct}%`, totalPct > 90 ? 'text-red-400' : totalPct > 70 ? 'text-yellow-400' : undefined],
              ...(((d?.cpl ?? 0) > 0) ? [['CPL médio', fmt(d!.cpl)]] : []),
              ...(((d?.avgCtr ?? 0) > 0) ? [['CTR médio', `${d!.avgCtr}%`]] : []),
              ...(((d?.avgCpm ?? 0) > 0) ? [['CPM médio', fmt(d!.avgCpm)]] : []),
              ...(lm && lm.ticketMedio > 0 ? [['Ticket médio', fmt(lm.ticketMedio), 'text-emerald-400']] : []),
              ...(lm && lm.totalMrr > 0 ? [['MRR', fmt(lm.totalMrr)]] : []),
              ...(lm && lm.avgClosingDays > 0 ? [['Tempo médio de fechamento', `${lm.avgClosingDays} dias`]] : []),
            ].map(([label, value, color]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-sm text-orf-text-2">{label}</span>
                <span className={`text-sm font-semibold ${color ?? 'text-orf-text'}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leads por Segmento */}
      {lm && Object.keys(lm.bySegment).length > 0 && (
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border">
            <h2 className="text-sm font-semibold text-orf-text">Leads por Segmento</h2>
          </div>
          <div className="divide-y divide-orf-border">
            {Object.entries(lm.bySegment)
              .sort(([, a], [, b]) => b - a)
              .map(([seg, count]) => {
                const pct = lm.total > 0 ? Math.round((count / lm.total) * 100) : 0
                return (
                  <div key={seg} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-sm text-orf-text flex-1 truncate">{seg}</span>
                    <div className="w-24">
                      <div className="h-1.5 bg-orf-surface-2 rounded-full overflow-hidden">
                        <div className="h-full bg-orf-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-orf-text-3 w-8 text-right">{pct}%</span>
                    <span className="text-xs text-orf-text-2 w-6 text-right font-semibold">{count}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
