'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { BudgetSummary, AdsPlatform } from '@ads/shared'

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

export function BudgetView() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const { data, isLoading } = useQuery({
    queryKey: ['budget', month, year],
    queryFn: () => api<{ data: BudgetSummary[] }>(`/budget?month=${month}&year=${year}`),
  })

  const budgets = data?.data ?? []
  const totalPlanned = budgets.reduce((s, b) => s + b.plannedAmount, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spentAmount, 0)
  const totalRemaining = totalPlanned - totalSpent

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orf-text">Budget</h1>
          <p className="text-sm text-orf-text-2 mt-0.5">
            {new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button className="px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 transition-colors">
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

      {/* Budget by platform */}
      <div className="bg-orf-surface rounded-orf border border-orf-border">
        <div className="px-5 py-4 border-b border-orf-border">
          <h2 className="text-sm font-semibold text-orf-text">Por Plataforma</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-orf-text-2 text-sm">Carregando...</div>
        ) : budgets.length === 0 ? (
          <div className="p-8 text-center text-orf-text-2 text-sm">
            Nenhum budget cadastrado para este mês.
          </div>
        ) : (
          <div className="divide-y divide-orf-border">
            {budgets.map((b) => (
              <div key={b.platform} className="px-5 py-4 flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${PLATFORM_COLORS[b.platform]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-orf-text">
                      {PLATFORM_LABELS[b.platform]}
                    </span>
                    <span className="text-xs text-orf-text-2">
                      {b.spentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      {' / '}
                      {b.plannedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
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
                <span className="text-xs font-medium text-orf-text-2 w-10 text-right">
                  {b.percentUsed}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
