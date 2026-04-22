'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { UtmEntry } from '@ads/shared'

export function UtmView() {
  const { data: summaryData } = useQuery({
    queryKey: ['utm-summary'],
    queryFn: () =>
      api<{
        data: {
          total: number
          valid: number
          invalid: number
          withGclid: number
          withFbclid: number
          bySource: Record<string, number>
        }
      }>('/utm/summary'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['utm-entries'],
    queryFn: () => api<{ data: UtmEntry[] }>('/utm'),
  })

  const summary = summaryData?.data
  const entries = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-orf-text">Config UTMs</h1>
        <p className="text-sm text-orf-text-2 mt-0.5">
          Auditoria de origens para validar dados de conversão offline
        </p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-orf-surface rounded-orf border border-orf-border p-4">
            <p className="text-xs text-orf-text-2 uppercase tracking-wide">Total de Origens</p>
            <p className="text-2xl font-bold text-orf-text mt-1">{summary.total}</p>
          </div>
          <div className="bg-orf-surface rounded-orf border border-orf-border p-4">
            <p className="text-xs text-orf-text-2 uppercase tracking-wide">Válidas para Conv. Offline</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.valid}</p>
          </div>
          <div className="bg-orf-surface rounded-orf border border-orf-border p-4">
            <p className="text-xs text-orf-text-2 uppercase tracking-wide">Com GCLID (Google)</p>
            <p className="text-2xl font-bold text-orf-text mt-1">{summary.withGclid}</p>
          </div>
          <div className="bg-orf-surface rounded-orf border border-orf-border p-4">
            <p className="text-xs text-orf-text-2 uppercase tracking-wide">Com FBCLID (Meta)</p>
            <p className="text-2xl font-bold text-orf-text mt-1">{summary.withFbclid}</p>
          </div>
        </div>
      )}

      {/* Entries table */}
      <div className="bg-orf-surface rounded-orf border border-orf-border overflow-hidden">
        <div className="px-5 py-4 border-b border-orf-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-orf-text">Origens Detectadas</h2>
          <span className="text-xs text-orf-text-2">{entries.length} entradas</span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-orf-border bg-orf-surface-2">
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Fonte</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Campanha</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Clics ID</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Conv. Offline</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Hits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orf-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-orf-text-2">Carregando...</td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-orf-text-2">
                  Nenhuma UTM detectada ainda.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-orf-surface-2 transition-colors">
                  <td className="px-5 py-3 font-medium text-orf-text">
                    {entry.source}
                    {entry.medium ? <span className="text-orf-text-2 font-normal"> / {entry.medium}</span> : null}
                  </td>
                  <td className="px-5 py-3 text-orf-text-2">{entry.campaign ?? '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      {entry.hasGclid && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">GCLID</span>
                      )}
                      {entry.hasFbclid && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-medium">FBCLID</span>
                      )}
                      {!entry.hasGclid && !entry.hasFbclid && (
                        <span className="text-orf-text-3 text-xs">Nenhum</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {entry.isValidForOfflineConversion ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 font-medium">Válida</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 font-medium">Inválida</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-orf-text-2">{entry.hitCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
