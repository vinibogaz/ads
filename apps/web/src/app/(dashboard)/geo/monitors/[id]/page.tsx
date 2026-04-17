'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiRequest } from '@/lib/api'

interface MonitorScore {
  id: string
  overallScore: number
  mentionRate: string
  mentionCount: number
  totalMentions: number
  engineScores: Record<string, number>
  calculatedDate: string
}

interface GeoMonitorDetail {
  id: string
  brandName: string
  brandAliases: string[]
  competitors: string[]
  keywords: string[]
  engines: string[]
  frequency: string
  isActive: boolean
  createdAt: string
  scores: MonitorScore[]
}

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
  perplexity: 'Perplexity',
  grok: 'Grok',
}

const ENGINE_COLORS: Record<string, string> = {
  chatgpt: 'text-emerald-400',
  gemini: 'text-blue-400',
  claude: 'text-orange-400',
  perplexity: 'text-purple-400',
  grok: 'text-pink-400',
}

function ScoreBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-orf-success' : value >= 40 ? 'bg-orf-warning' : 'bg-orf-error'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-orf-surface-2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${value >= 70 ? 'text-orf-success' : value >= 40 ? 'text-orf-warning' : 'text-orf-error'}`}>
        {Math.round(value)}
      </span>
    </div>
  )
}

export default function GeoMonitorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [monitor, setMonitor] = useState<GeoMonitorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    apiRequest<GeoMonitorDetail>(`/geo/monitors/${id}`)
      .then(res => setMonitor(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-orf-surface-2 rounded w-1/3" />
        <div className="orf-card space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-4 bg-orf-surface-2 rounded" />)}
        </div>
      </div>
    )
  }

  if (notFound || !monitor) {
    return (
      <div className="orf-card flex flex-col items-center justify-center py-20 text-center">
        <p className="text-orf-text font-medium text-lg">Monitor não encontrado</p>
        <Link href="/geo" className="orf-btn-primary mt-6">← Voltar para GEO Monitor</Link>
      </div>
    )
  }

  const latest = monitor.scores[0] ?? null

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-orf-text-3">
        <Link href="/geo" className="hover:text-orf-primary transition-colors">GEO Monitor</Link>
        <span>/</span>
        <span className="text-orf-text">{monitor.brandName}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-orf-text">{monitor.brandName}</h1>
            <span className={`orf-badge ${monitor.isActive ? 'orf-badge-success' : 'orf-badge-warning'}`}>
              {monitor.isActive ? 'Ativo' : 'Inativo'}
            </span>
            <span className="orf-badge orf-badge-primary">{monitor.frequency}</span>
          </div>
          <p className="text-sm text-orf-text-3">
            Criado em {new Date(monitor.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Link href="/geo" className="orf-btn-ghost shrink-0">← Voltar</Link>
      </div>

      {/* Monitor Config */}
      <div className="orf-card space-y-4">
        <h2 className="text-sm font-semibold text-orf-text-2 uppercase tracking-wider">Configuração</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-orf-text-3 mb-1">Keywords monitoradas</p>
            <div className="flex flex-wrap gap-1">
              {monitor.keywords.map(kw => (
                <span key={kw} className="orf-badge bg-orf-surface-2 text-orf-text-2">{kw}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-orf-text-3 mb-1">Engines de IA</p>
            <div className="flex flex-wrap gap-1">
              {monitor.engines.map(eng => (
                <span key={eng} className={`orf-badge bg-orf-surface-2 ${ENGINE_COLORS[eng] ?? 'text-orf-text-2'}`}>
                  {ENGINE_LABELS[eng] ?? eng}
                </span>
              ))}
            </div>
          </div>
          {monitor.brandAliases.length > 0 && (
            <div>
              <p className="text-orf-text-3 mb-1">Aliases</p>
              <p className="text-orf-text">{monitor.brandAliases.join(', ')}</p>
            </div>
          )}
          {monitor.competitors.length > 0 && (
            <div>
              <p className="text-orf-text-3 mb-1">Concorrentes</p>
              <p className="text-orf-text">{monitor.competitors.join(', ')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Latest Score */}
      {latest ? (
        <div className="orf-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-orf-text-2 uppercase tracking-wider">Último Score GEO</h2>
            <p className="text-xs text-orf-text-3">
              {new Date(latest.calculatedDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>

          <div className="flex items-center gap-6 p-4 bg-orf-surface-2 rounded-orf-sm">
            <div className="text-center shrink-0">
              <p className={`text-4xl font-black ${
                latest.overallScore >= 70 ? 'text-orf-success' :
                latest.overallScore >= 40 ? 'text-orf-warning' : 'text-orf-error'
              }`}>{Math.round(latest.overallScore)}</p>
              <p className="text-xs text-orf-text-3 mt-1">Score geral</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-orf-text-3 mb-1">Visibility Rate: {latest.mentionRate}%</p>
              <div className="h-2 bg-orf-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    parseFloat(latest.mentionRate) >= 70 ? 'bg-orf-success' :
                    parseFloat(latest.mentionRate) >= 40 ? 'bg-orf-warning' : 'bg-orf-error'
                  }`}
                  style={{ width: `${latest.mentionRate}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {Object.entries(latest.engineScores).map(([engine, val]) => (
              <div key={engine} className="flex items-center gap-3">
                <span className={`text-xs font-medium w-20 shrink-0 ${ENGINE_COLORS[engine] ?? 'text-orf-text-2'}`}>
                  {ENGINE_LABELS[engine] ?? engine}
                </span>
                <div className="flex-1"><ScoreBar value={val} /></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="orf-card flex flex-col items-center py-10 text-center">
          <p className="text-orf-text-2 text-sm">Nenhuma coleta realizada ainda</p>
          <p className="text-orf-text-3 text-xs mt-1">Inicie uma coleta na lista de monitores.</p>
        </div>
      )}

      {/* Score History */}
      {monitor.scores.length > 1 && (
        <div className="orf-card">
          <h2 className="text-sm font-semibold text-orf-text-2 uppercase tracking-wider mb-4">
            Histórico ({monitor.scores.length} coletas)
          </h2>
          <div className="space-y-0">
            {monitor.scores.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-orf-border last:border-0">
                <p className="text-xs text-orf-text-3">
                  {new Date(s.calculatedDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-orf-text-3">Visibility: {s.mentionRate}%</span>
                  <span className={`text-sm font-bold w-8 text-right ${
                    s.overallScore >= 70 ? 'text-orf-success' :
                    s.overallScore >= 40 ? 'text-orf-warning' : 'text-orf-error'
                  }`}>{Math.round(s.overallScore)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
