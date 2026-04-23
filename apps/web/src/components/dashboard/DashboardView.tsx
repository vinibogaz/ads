'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdsPlatform } from '@ads/shared'

const PLATFORM_LABELS: Record<AdsPlatform, string> = {
  meta: 'Meta',
  google: 'Google',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  twitter: 'Twitter',
  pinterest: 'Pinterest',
  taboola: 'Taboola',
  other: 'Outro',
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
  budgetByPlatform: {
    platform: AdsPlatform
    plannedAmount: number
    spentAmount: number
    remainingAmount: number
    percentUsed: number
    currency: string
  }[]
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-orf-surface border border-orf-border rounded-orf p-5">
      <p className="text-xs text-orf-text-2 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1.5 ${accent ? 'text-orf-primary' : 'text-orf-text'}`}>{value}</p>
      {sub && <p className="text-xs text-orf-text-3 mt-1">{sub}</p>}
    </div>
  )
}

export function DashboardView() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary', month, year],
    queryFn: () => api<{ data: DashboardData }>(`/dashboard/summary?month=${month}&year=${year}`),
  })

  const d = data?.data

  const monthLabel = new Date(year, month - 1).toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-orf-text-2 text-sm">
        Carregando dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orf-text">Resumo</h1>
          <p className="text-sm text-orf-text-2 mt-0.5 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-orf-text-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          {d?.activePlatforms ?? 0} plataformas · {d?.activeCrms ?? 0} CRMs conectados
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Budget Planejado"
          value={(d?.totalBudgetPlanned ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          sub={`Gasto: ${(d?.totalBudgetSpent ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
        />
        <StatCard
          label="Total de Leads"
          value={d?.totalLeads ?? 0}
          sub="Todos os status"
        />
        <StatCard
          label="Leads Qualificados"
          value={d?.totalQualifiedLeads ?? 0}
          sub={`${d?.totalWon ?? 0} vendas fechadas`}
          accent
        />
        <StatCard
          label="Conv. Offline Enviadas"
          value={d?.totalConversionsSent ?? 0}
          sub="Sinais enviados às plataformas"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Budget por plataforma */}
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border">
            <h2 className="text-sm font-semibold text-orf-text">Budget por Plataforma</h2>
          </div>
          {!d?.budgetByPlatform?.length ? (
            <div className="px-5 py-8 text-center text-sm text-orf-text-2">
              Nenhum budget cadastrado este mês.
            </div>
          ) : (
            <div className="divide-y divide-orf-border">
              {d.budgetByPlatform.map((b) => (
                <div key={b.platform} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-sm text-orf-text w-20">{PLATFORM_LABELS[b.platform]}</span>
                  <div className="flex-1">
                    <div className="h-1.5 bg-orf-surface-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${b.percentUsed > 90 ? 'bg-red-500' : b.percentUsed > 70 ? 'bg-yellow-500' : 'bg-orf-primary'}`}
                        style={{ width: `${Math.min(b.percentUsed, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-orf-text-2 w-8 text-right">{b.percentUsed}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leads por etapa */}
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border">
            <h2 className="text-sm font-semibold text-orf-text">Leads por Etapa do Funil</h2>
          </div>
          {!d?.leadsByStage?.length ? (
            <div className="px-5 py-8 text-center text-sm text-orf-text-2">
              Configure o funil para visualizar aqui.
            </div>
          ) : (
            <div className="divide-y divide-orf-border">
              {d.leadsByStage.map((s) => {
                const pct = d.totalLeads > 0 ? Math.round((s.count / d.totalLeads) * 100) : 0
                return (
                  <div key={s.stageName} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-sm text-orf-text flex-1 truncate">{s.stageName}</span>
                    <div className="w-24">
                      <div className="h-1.5 bg-orf-surface-2 rounded-full overflow-hidden">
                        <div className="h-full bg-orf-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-orf-text-2 w-8 text-right">{s.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Conversões offline por plataforma */}
      {d?.conversionsByPlatform && d.conversionsByPlatform.length > 0 && (
        <div className="bg-orf-surface border border-orf-border rounded-orf">
          <div className="px-5 py-4 border-b border-orf-border">
            <h2 className="text-sm font-semibold text-orf-text">Conversões Offline por Plataforma</h2>
          </div>
          <div className="px-5 py-4 flex gap-6 flex-wrap">
            {d.conversionsByPlatform.map((c) => (
              <div key={c.platform} className="text-center">
                <p className="text-2xl font-bold text-orf-text">{c.count}</p>
                <p className="text-xs text-orf-text-2 mt-0.5">{PLATFORM_LABELS[c.platform]}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
