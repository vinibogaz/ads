'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiRequest } from '@/lib/api'

interface GeoSource {
  domain: string
  favicon_url: string
  page_count: number
  prompt_count: number
  engine_count: number
  impact_pct: number
}

const ENGINES = ['chatgpt', 'gemini', 'claude', 'perplexity', 'grok']
const PAGE_SIZE = 20

export function GeoSourcesView() {
  const [sources, setSources] = useState<GeoSource[]>([])
  const [loading, setLoading] = useState(true)
  const [engineFilter, setEngineFilter] = useState('')
  const [page, setPage] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    const params = engineFilter ? `?engine=${engineFilter}` : ''
    apiRequest<GeoSource[]>(`/api/v1/geo/sources${params}`)
      .then(r => setSources(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [engineFilter])

  useEffect(() => { load() }, [load])

  const exportCsv = () => {
    const rows = [
      ['Domínio', 'Páginas', 'Prompts', 'Modelos', 'Impacto%'],
      ...sources.map(s => [s.domain, s.page_count, s.prompt_count, s.engine_count, s.impact_pct]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fontes-citadas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const displayed = sources.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(sources.length / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orf-text">Fontes Citadas</h1>
          <p className="text-orf-text-2 mt-1 text-sm">Domínios citados pelas IAs ao responder prompts monitorados</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={sources.length === 0}
          className="px-3 py-1.5 text-sm border border-orf-surface-2 text-orf-text-2 hover:text-orf-text rounded-lg transition-colors disabled:opacity-40"
        >
          Exportar CSV
        </button>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={engineFilter}
          onChange={e => { setEngineFilter(e.target.value); setPage(0) }}
          className="bg-orf-surface-2 text-orf-text-2 text-sm rounded-lg px-3 py-1.5 border border-orf-surface-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Todos os modelos</option>
          {ENGINES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="orf-card overflow-hidden">
        {loading ? (
          <p className="text-center py-10 text-sm text-orf-text-3">Carregando...</p>
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <p className="text-orf-text-2 text-sm font-medium">Nenhuma fonte citada ainda</p>
            <p className="text-orf-text-3 text-xs mt-1">Execute uma coleta GEO para ver domínios citados pelas IAs</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orf-surface-2/60">
                  <th className="text-left py-3 px-4 text-xs text-orf-text-3 font-medium uppercase tracking-wide">Domínio</th>
                  <th className="text-right py-3 px-4 text-xs text-orf-text-3 font-medium uppercase tracking-wide">Páginas</th>
                  <th className="text-right py-3 px-4 text-xs text-orf-text-3 font-medium uppercase tracking-wide">Prompts</th>
                  <th className="text-right py-3 px-4 text-xs text-orf-text-3 font-medium uppercase tracking-wide">Modelos</th>
                  <th className="text-right py-3 px-4 text-xs text-orf-text-3 font-medium uppercase tracking-wide">Impacto%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orf-surface-2/40">
                {displayed.map(s => (
                  <tr key={s.domain} className="hover:bg-orf-surface-2/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.favicon_url}
                          alt=""
                          width={16}
                          height={16}
                          className="rounded-sm shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        <span className="text-orf-text font-medium truncate max-w-xs">{s.domain}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-orf-text-2">{s.page_count}</td>
                    <td className="py-3 px-4 text-right text-orf-text-2">{s.prompt_count}</td>
                    <td className="py-3 px-4 text-right text-orf-text-2">{s.engine_count}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${s.impact_pct >= 10 ? 'text-green-400' : s.impact_pct >= 5 ? 'text-yellow-400' : 'text-orf-text-2'}`}>
                        {s.impact_pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-orf-surface-2/40">
                <span className="text-xs text-orf-text-3">{sources.length} domínios</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="text-xs text-orf-text-2 hover:text-orf-text disabled:opacity-40 px-2 py-1"
                  >
                    ← Anterior
                  </button>
                  <span className="text-xs text-orf-text-3">{page + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="text-xs text-orf-text-2 hover:text-orf-text disabled:opacity-40 px-2 py-1"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
