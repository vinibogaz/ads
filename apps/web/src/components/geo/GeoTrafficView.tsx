'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'

const AI_SOURCES = ['ChatGPT', 'Gemini', 'Perplexity', 'Claude', 'Copilot', 'You.com', 'Phind']

const SOURCE_COLORS: Record<string, string> = {
  ChatGPT: '#10b981',
  Gemini: '#3b82f6',
  Perplexity: '#a855f7',
  Claude: '#f59e0b',
  Copilot: '#06b6d4',
  'You.com': '#ec4899',
  Phind: '#f97316',
}

interface TrafficRow {
  source: string
  day: string
  visits: number
}

interface TotalRow {
  source: string
  total: number
}

interface TrafficData {
  rows: TrafficRow[]
  totals: TotalRow[]
  days: number
}

const PERIOD_OPTIONS = [
  { label: '7 dias', value: '7' },
  { label: '30 dias', value: '30' },
  { label: '90 dias', value: '90' },
]

function MiniLineChart({ rows, source, color }: { rows: TrafficRow[]; source: string; color: string }) {
  const sourceRows = rows.filter(r => r.source === source)
  if (sourceRows.length === 0) return <div className="h-10 flex items-center text-xs text-orf-text-3">Sem dados</div>

  const max = Math.max(...sourceRows.map(r => Number(r.visits)), 1)
  const w = 120
  const h = 40
  const pts = sourceRows.map((r, i) => {
    const x = (i / Math.max(sourceRows.length - 1, 1)) * w
    const y = h - (Number(r.visits) / max) * h
    return `${x},${y}`
  })

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function GeoTrafficView() {
  const [data, setData] = useState<TrafficData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState('30')
  const [filterSource, setFilterSource] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ days })
    if (filterSource) params.set('source', filterSource)
    apiRequest<TrafficData>(`/api/v1/geo/traffic?${params.toString()}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [days, filterSource])

  const tenantId =
    typeof window !== 'undefined'
      ? (document.cookie.match(/tid=([^;]+)/)?.[1] ?? 'SEU_TENANT_ID')
      : 'SEU_TENANT_ID'

  const snippet = `<script src="https://app.orffia.com/orffia.js" data-tenant-id="${tenantId}" data-api-url="https://api.orffia.com" defer></script>`

  function copySnippet() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const grandTotal = (data?.totals ?? []).reduce((acc, t) => acc + Number(t.total), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-orf-text">AI Traffic Analytics</h1>
          <p className="text-sm text-orf-text-3 mt-1">Visitas originadas de assistentes de IA</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="orf-input text-sm"
          >
            <option value="">Todas as fontes</option>
            {AI_SOURCES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  days === opt.value
                    ? 'bg-orf-accent text-white'
                    : 'bg-orf-surface-2 text-orf-text-2 hover:text-orf-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Installation snippet */}
      <div className="orf-card border border-orf-accent/30">
        <p className="text-xs font-semibold text-orf-accent uppercase tracking-wide mb-2">
          Instale o script de rastreamento
        </p>
        <p className="text-xs text-orf-text-3 mb-3">
          Adicione este snippet no <code className="text-orf-text">&lt;head&gt;</code> do seu site para rastrear visitas de IA.
        </p>
        <div className="bg-orf-bg rounded p-3 flex items-start gap-2">
          <code className="text-xs text-orf-text-2 flex-1 break-all whitespace-pre-wrap">{snippet}</code>
          <button
            onClick={copySnippet}
            className="flex-shrink-0 px-3 py-1 rounded text-xs bg-orf-accent text-white hover:bg-orf-accent/80 transition-colors"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="orf-card py-16 text-center text-sm text-orf-text-3">Carregando...</div>
      ) : !data || grandTotal === 0 ? (
        <div className="orf-card py-16 text-center">
          <p className="text-orf-text-3 text-sm">Nenhum tráfego de IA registrado ainda.</p>
          <p className="text-orf-text-3 text-xs mt-1">Instale o script acima e aguarde visitas de ChatGPT, Gemini, etc.</p>
        </div>
      ) : (
        <>
          {/* KPI totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="orf-card col-span-2 sm:col-span-1">
              <p className="text-xs text-orf-text-3 uppercase tracking-wide mb-1">Total de visitas</p>
              <p className="text-2xl font-bold text-orf-text">{grandTotal.toLocaleString('pt-BR')}</p>
            </div>
            {(data.totals ?? []).slice(0, 3).map(t => (
              <div key={t.source} className="orf-card">
                <p className="text-xs text-orf-text-3 uppercase tracking-wide mb-1">{t.source}</p>
                <p className="text-2xl font-bold" style={{ color: SOURCE_COLORS[t.source] ?? '#e2e8f0' }}>
                  {Number(t.total).toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>

          {/* Per-source sparklines */}
          <div className="orf-card">
            <h2 className="text-sm font-semibold text-orf-text mb-4">Tráfego por fonte</h2>
            <div className="space-y-4">
              {(data.totals ?? []).map(t => {
                const color = SOURCE_COLORS[t.source] ?? '#94a3b8'
                const pct = grandTotal > 0 ? (Number(t.total) / grandTotal) * 100 : 0
                return (
                  <div key={t.source} className="flex items-center gap-4">
                    <div className="w-24 flex-shrink-0">
                      <p className="text-xs font-medium text-orf-text">{t.source}</p>
                      <p className="text-xs text-orf-text-3">{Number(t.total).toLocaleString('pt-BR')} visitas</p>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-orf-surface-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct.toFixed(1)}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                    <div className="w-10 text-right">
                      <span className="text-xs text-orf-text-3">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="hidden sm:block">
                      <MiniLineChart rows={data.rows} source={t.source} color={color} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Daily breakdown table */}
          <div className="orf-card overflow-x-auto">
            <h2 className="text-sm font-semibold text-orf-text mb-4">Histórico diário</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-orf-border">
                  <th className="text-left py-2 pr-4 text-orf-text-3 font-medium">Data</th>
                  <th className="text-left py-2 pr-4 text-orf-text-3 font-medium">Fonte</th>
                  <th className="text-right py-2 text-orf-text-3 font-medium">Visitas</th>
                </tr>
              </thead>
              <tbody>
                {(data.rows ?? []).map((r, i) => (
                  <tr key={i} className="border-b border-orf-border/50 hover:bg-orf-surface-2/50">
                    <td className="py-2 pr-4 text-orf-text-2">{r.day}</td>
                    <td className="py-2 pr-4">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-white text-[10px] font-medium"
                        style={{ backgroundColor: SOURCE_COLORS[r.source] ?? '#64748b' }}
                      >
                        {r.source}
                      </span>
                    </td>
                    <td className="py-2 text-right text-orf-text font-medium">
                      {Number(r.visits).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
