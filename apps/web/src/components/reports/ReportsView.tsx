'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { AdsPlatform } from '@ads/shared'

type LeadMetrics = {
  total: number; paid: number; organic: number; paidPct: number; organicPct: number
  won: number; totalRevenue: number; totalMrr: number; ticketMedio: number; avgClosingDays: number
  bySegment: Record<string, number>
}

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const PLATFORM_LABELS: Record<AdsPlatform, string> = {
  meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn Ads', tiktok: 'TikTok Ads',
  twitter: 'Twitter', pinterest: 'Pinterest', taboola: 'Taboola', other: 'Outro',
}

const PLATFORM_COLORS: Record<AdsPlatform, string> = {
  meta: 'bg-blue-500', google: 'bg-green-500', linkedin: 'bg-sky-600', tiktok: 'bg-pink-500',
  twitter: 'bg-sky-400', pinterest: 'bg-red-500', taboola: 'bg-orange-500', other: 'bg-gray-400',
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtN = (v: number) => v.toLocaleString('pt-BR')

type Client = { id: string; name: string; color: string }
type ReportData = {
  client: Client | null
  period: { month: number; year: number }
  summary: {
    totalBudgetPlanned: number; totalBudgetSpent: number; totalBudgetRemaining: number; budgetUsagePct: number
    totalLeads: number; qualifiedLeads: number; wonLeads: number
    cpl: number; cpa: number; qualificationRate: number; closeRate: number; totalConversionsSent: number
  }
  budgetByPlatform: { id: string; platform: AdsPlatform; integrationName: string | null; plannedAmount: number; spentAmount: number; remainingAmount: number; percentUsed: number; currency: string }[]
  integrationMetrics: { id: string; name: string; platform: AdsPlatform; impressions: number; clicks: number; leads: number; ctr: number; cpm: number; cpl: number; cpc: number; spend: number; planned: number; lastSyncAt?: string | null }[]
  revenueMetrics?: { totalRevenue: number; totalMrr: number; ticketMedio: number; avgClosingDays: number; won: number; paid: number; organic: number; paidPct: number; organicPct: number; bySegment: Record<string, number> }
  leadsByStage: { stageName: string; count: number; isWon: boolean; isLost: boolean; pct: number }[]
  conversionsByPlatform: { platform: AdsPlatform; count: number }[]
  topUtmSources: { source: string; medium: string | null; campaign: string | null; hits: number }[]
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
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
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

export function ReportsView() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [clientId, setClientId] = useState<string>('')

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api<Client[]>('/clients'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['report-marketing', month, year, clientId],
    queryFn: () => {
      const params = new URLSearchParams({ month: String(month), year: String(year) })
      if (clientId) params.set('clientId', clientId)
      return api<ReportData>(`/reports/marketing?${params}`)
    },
  })

  const { data: lmData } = useQuery({
    queryKey: ['lead-metrics-report', month, year, clientId],
    queryFn: () => {
      const from = new Date(year, month - 1, 1).toISOString()
      const to = new Date(year, month, 0, 23, 59, 59).toISOString()
      const params = new URLSearchParams({ from, to })
      if (clientId) params.set('clientId', clientId)
      return api<LeadMetrics>(`/leads/metrics?${params}`)
    },
  })

  const clients: Client[] = clientsData?.data ?? []
  const r = data?.data
  const lm = lmData?.data
  const monthLabel = `${MONTHS[month - 1]} ${year}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orf-text">Relatório de Marketing</h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }} className="text-orf-text-2 hover:text-orf-text">‹</button>
            <span className="text-sm text-orf-text-2">{monthLabel}</span>
            <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }} className="text-orf-text-2 hover:text-orf-text">›</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {clients.length > 0 && (
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="px-3 py-1.5 bg-orf-surface border border-orf-border rounded-orf-sm text-sm text-orf-text focus:outline-none focus:border-orf-primary"
            >
              <option value="">Todos os clientes</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-orf-text-2">Carregando relatório...</div>
      ) : !r ? null : (
        <>
          {r.client && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orf-surface border border-orf-border rounded-orf-sm w-fit">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.client.color }} />
              <span className="text-sm font-medium text-orf-text">{r.client.name}</span>
            </div>
          )}

          {/* KPIs principais — 4+4 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Budget Investido" value={fmt(r.summary.totalBudgetSpent)} sub={`de ${fmt(r.summary.totalBudgetPlanned)} planejado`} />
            <StatCard label="Saldo Restante" value={fmt(r.summary.totalBudgetRemaining)} sub={`${r.summary.budgetUsagePct}% utilizado`} color={r.summary.totalBudgetRemaining < 0 ? 'text-red-400' : 'text-orf-text'} />
            <StatCard label="Total de Leads" value={fmtN(r.summary.totalLeads)} sub={`${r.summary.qualifiedLeads} qualificados`} color="text-orf-primary" />
            <StatCard label="CPL Médio" value={r.summary.cpl > 0 ? fmt(r.summary.cpl) : '—'} sub="Custo por lead" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Taxa de Qualificação" value={r.summary.totalLeads > 0 ? `${r.summary.qualificationRate}%` : '—'} sub="Leads qualificados / total" />
            <StatCard label="Taxa de Fechamento" value={r.summary.qualifiedLeads > 0 ? `${r.summary.closeRate}%` : '—'} sub="Vendas / qualificados" />
            <StatCard label="Vendas Fechadas" value={fmtN(r.summary.wonLeads)} sub={r.summary.cpa > 0 ? `CPA: ${fmt(r.summary.cpa)}` : undefined} color="text-emerald-400" />
            <StatCard label="Conv. Offline Enviadas" value={fmtN(r.summary.totalConversionsSent)} sub="Enviadas para plataformas" />
          </div>

          {/* Revenue KPIs */}
          {lm && (lm.totalRevenue > 0 || lm.totalMrr > 0 || lm.won > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Receita Total" value={lm.totalRevenue > 0 ? fmt(lm.totalRevenue) : '—'} sub={`${lm.won} venda${lm.won !== 1 ? 's' : ''}`} color="text-emerald-400" />
              <StatCard label="Ticket Médio" value={lm.ticketMedio > 0 ? fmt(lm.ticketMedio) : '—'} sub="Por venda fechada" />
              <StatCard label="MRR Total" value={lm.totalMrr > 0 ? fmt(lm.totalMrr) : '—'} sub="Receita recorrente" />
              <StatCard label="Tempo Médio de Fechamento" value={lm.avgClosingDays > 0 ? `${lm.avgClosingDays} dias` : '—'} sub="Da entrada até fechar" />
            </div>
          )}

          {/* Pago vs Orgânico */}
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
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${lm.paidPct}%` }} />
                  </div>
                  {r.summary.cpl > 0 && <p className="text-xs text-orf-text-3 mt-1">CPL: <strong className="text-orf-text">{fmt(r.summary.cpl)}</strong></p>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-orf-text-2">Orgânico</span>
                    <span className="text-sm font-semibold text-orf-text">{lm.organic} <span className="text-orf-text-3 font-normal">({lm.organicPct}%)</span></span>
                  </div>
                  <div className="h-2 bg-orf-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${lm.organicPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Métricas por conta de anúncio */}
          {r.integrationMetrics.length > 0 && (
            <div className="bg-orf-surface border border-orf-border rounded-orf">
              <div className="px-5 py-4 border-b border-orf-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-orf-text">Métricas por Conta</h2>
                <span className="text-xs text-orf-text-3">Dados do período sincronizado</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-orf-border text-orf-text-2">
                      <th className="text-left px-5 py-2.5 font-medium">Conta</th>
                      <th className="text-right px-4 py-2.5 font-medium">Investido</th>
                      <th className="text-right px-4 py-2.5 font-medium">Impressões</th>
                      <th className="text-right px-4 py-2.5 font-medium">Cliques</th>
                      <th className="text-right px-4 py-2.5 font-medium">CTR</th>
                      <th className="text-right px-4 py-2.5 font-medium">CPM</th>
                      <th className="text-right px-4 py-2.5 font-medium">CPC</th>
                      <th className="text-right px-5 py-2.5 font-medium">Leads</th>
                      <th className="text-right px-5 py-2.5 font-medium">CPL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orf-border">
                    {r.integrationMetrics.map((m) => (
                      <tr key={m.id} className="hover:bg-orf-surface-2/30">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${PLATFORM_COLORS[m.platform]}`} />
                            <div>
                              <p className="text-orf-text font-medium">{m.name}</p>
                              <p className="text-orf-text-3">{PLATFORM_LABELS[m.platform]}</p>
                              {m.lastSyncAt && <p className="text-orf-text-3">Sync: {new Date(m.lastSyncAt).toLocaleString('pt-BR')}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-orf-text font-medium">{fmt(m.spend)}</td>
                        <td className="px-4 py-3 text-right text-orf-text-2">{m.impressions > 0 ? fmtN(m.impressions) : '—'}</td>
                        <td className="px-4 py-3 text-right text-orf-text-2">{m.clicks > 0 ? fmtN(m.clicks) : '—'}</td>
                        <td className="px-4 py-3 text-right text-orf-text-2">{m.ctr > 0 ? `${m.ctr}%` : '—'}</td>
                        <td className="px-4 py-3 text-right text-orf-text-2">{m.cpm > 0 ? fmt(m.cpm) : '—'}</td>
                        <td className="px-4 py-3 text-right text-orf-text-2">{m.cpc > 0 ? fmt(m.cpc) : '—'}</td>
                        <td className="px-5 py-3 text-right text-orf-primary font-medium">{fmtN(m.leads)}</td>
                        <td className="px-5 py-3 text-right text-orf-text-2">{m.cpl > 0 ? fmt(m.cpl) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Budget por plataforma */}
          {r.budgetByPlatform.length > 0 && (
            <div className="bg-orf-surface border border-orf-border rounded-orf">
              <div className="px-5 py-4 border-b border-orf-border">
                <h2 className="text-sm font-semibold text-orf-text">Budget por Plataforma</h2>
              </div>
              <div className="divide-y divide-orf-border">
                {r.budgetByPlatform.map((b) => (
                  <div key={b.id} className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PLATFORM_COLORS[b.platform]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-orf-text">{b.integrationName ?? PLATFORM_LABELS[b.platform]}</span>
                          <div className="flex gap-4 text-xs text-orf-text-2">
                            <span>Planejado: <strong className="text-orf-text">{fmt(b.plannedAmount)}</strong></span>
                            <span>Gasto: <strong className={b.spentAmount > b.plannedAmount ? 'text-red-400' : 'text-orf-text'}>{fmt(b.spentAmount)}</strong></span>
                            <span>Saldo: <strong className={b.remainingAmount < 0 ? 'text-red-400' : 'text-emerald-400'}>{fmt(b.remainingAmount)}</strong></span>
                          </div>
                        </div>
                        <ProgressBar pct={b.percentUsed} />
                      </div>
                      <span className="text-xs font-medium text-orf-text-2 w-10 text-right">{b.percentUsed}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Leads por etapa */}
            {r.leadsByStage.length > 0 && (
              <div className="bg-orf-surface border border-orf-border rounded-orf">
                <div className="px-5 py-4 border-b border-orf-border">
                  <h2 className="text-sm font-semibold text-orf-text">Funil de Leads</h2>
                </div>
                <div className="divide-y divide-orf-border">
                  {r.leadsByStage.map((s) => (
                    <div key={s.stageName} className="px-5 py-3 flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${s.isWon ? 'bg-emerald-400' : s.isLost ? 'bg-red-400' : 'bg-orf-primary'}`} />
                      <span className="text-sm text-orf-text flex-1 truncate">{s.stageName}</span>
                      <div className="w-24"><div className="h-1.5 bg-orf-surface-2 rounded-full overflow-hidden"><div className="h-full bg-orf-primary rounded-full" style={{ width: `${s.pct}%` }} /></div></div>
                      <span className="text-xs text-orf-text-2 w-8 text-right">{s.count}</span>
                      <span className="text-xs text-orf-text-3 w-8 text-right">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top UTM sources */}
            {r.topUtmSources.length > 0 && (
              <div className="bg-orf-surface border border-orf-border rounded-orf">
                <div className="px-5 py-4 border-b border-orf-border">
                  <h2 className="text-sm font-semibold text-orf-text">Top Origens de Tráfego</h2>
                </div>
                <div className="divide-y divide-orf-border">
                  {r.topUtmSources.map((u, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3">
                      <span className="text-xs font-bold text-orf-text-3 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-orf-text truncate">{u.source}{u.medium ? ` / ${u.medium}` : ''}</p>
                        {u.campaign && <p className="text-xs text-orf-text-3 truncate">{u.campaign}</p>}
                      </div>
                      <span className="text-xs text-orf-text-2">{fmtN(u.hits)} hits</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Leads por Segmento */}
          {lm && Object.keys(lm.bySegment).length > 0 && (
            <div className="bg-orf-surface border border-orf-border rounded-orf">
              <div className="px-5 py-4 border-b border-orf-border">
                <h2 className="text-sm font-semibold text-orf-text">Leads por Segmento / Campanha</h2>
              </div>
              <div className="divide-y divide-orf-border">
                {Object.entries(lm.bySegment)
                  .sort(([, a], [, b]) => b - a)
                  .map(([seg, count]) => {
                    const pct = lm.total > 0 ? Math.round((count / lm.total) * 100) : 0
                    return (
                      <div key={seg} className="px-5 py-3 flex items-center gap-3">
                        <span className="text-sm text-orf-text flex-1 truncate">{seg}</span>
                        <div className="w-32">
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

          {/* Empty state */}
          {r.summary.totalLeads === 0 && r.budgetByPlatform.length === 0 && (
            <div className="py-12 text-center text-sm text-orf-text-2">
              Nenhum dado encontrado para {monthLabel}{r.client ? ` — ${r.client.name}` : ''}. Certifique-se de sincronizar o período.
            </div>
          )}
        </>
      )}
    </div>
  )
}
