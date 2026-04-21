'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'

interface PromptRow {
  id: string
  promptText: string
  groupName: string | null
  mentionRate: number | null
}

interface CompetitorRow {
  id: string
  brandName: string
  websiteUrl: string | null
  mentionCount: number
}

interface DashboardData {
  totalPrompts: number
  totalCompetitors: number
  shareOfVoice: string | number
  shareOfSource: string | number
  avgSentiment: string | number
  totalResponses: number
  totalMentions: number
  topPrompts: PromptRow[]
  worstPrompts: PromptRow[]
  competitorRanking: CompetitorRow[]
}

function Gauge({ value, color }: { value: number; color: string }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, isNaN(value) ? 0 : value))
  const offset = circ - (pct / 100) * circ
  return (
    <svg width="88" height="88" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#1e1e2e" strokeWidth="9" />
      <circle
        cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`}
        strokeLinecap="round" transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dashoffset 0.7s ease' }}
      />
      <text x="48" y="53" textAnchor="middle" fontSize="13" fontWeight="700" fill="#e2e8f0">
        {pct.toFixed(1)}%
      </text>
    </svg>
  )
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="orf-card">
      <p className="text-xs text-orf-text-3 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-orf-text">{value}</p>
    </div>
  )
}

export function GeoDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest<DashboardData>('/geo/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sov = Number(data?.shareOfVoice ?? 0)
  const sos = Number(data?.shareOfSource ?? 0)
  const rawSentiment = Number(data?.avgSentiment ?? 0)
  const sentimentPct = ((rawSentiment + 1) / 2) * 100

  if (loading) {
    return <div className="orf-card py-16 text-center text-sm text-orf-text-3">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-orf-text">GEO Dashboard</h1>
        <p className="text-orf-text-2 mt-1 text-sm">Visão geral da presença da marca nas IAs generativas</p>
      </div>

      {/* Row 1: 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Prompts" value={data?.totalPrompts ?? 0} />
        <KpiCard label="Concorrentes" value={data?.totalCompetitors ?? 0} />
        <div className="orf-card flex flex-col items-center">
          <p className="text-xs text-orf-text-3 uppercase tracking-wide mb-2 self-start">Share of Voice</p>
          <Gauge value={sov} color="#6366f1" />
        </div>
        <div className="orf-card flex flex-col items-center">
          <p className="text-xs text-orf-text-3 uppercase tracking-wide mb-2 self-start">Share of Source</p>
          <Gauge value={sos} color="#22d3ee" />
        </div>
      </div>

      {/* Row 2: Sentiment + totals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="orf-card flex flex-col items-center">
          <p className="text-xs text-orf-text-3 uppercase tracking-wide mb-2 self-start">Sentimento Médio</p>
          <Gauge value={sentimentPct} color={rawSentiment >= 0 ? '#22c55e' : '#ef4444'} />
          <p className="text-xs text-orf-text-2 mt-1">{rawSentiment >= 0 ? 'Positivo' : 'Negativo'}</p>
        </div>
        <KpiCard label="Total Menções" value={data?.totalMentions ?? 0} />
        <KpiCard label="Total Respostas" value={data?.totalResponses ?? 0} />
      </div>

      {/* Row 3: Top/worst prompts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="orf-card">
          <p className="text-sm font-semibold text-orf-text mb-3">Top 3 Melhores Prompts</p>
          <div className="space-y-2.5">
            {(data?.topPrompts ?? []).slice(0, 3).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-xs text-orf-text-3 w-4 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-orf-text truncate">{p.promptText}</p>
                  {p.groupName ? <p className="text-xs text-orf-text-3">{p.groupName}</p> : null}
                </div>
                <span className="text-sm font-semibold text-orf-success shrink-0">
                  {Number(p.mentionRate ?? 0).toFixed(1)}%
                </span>
              </div>
            ))}
            {(data?.topPrompts ?? []).length === 0 && (
              <p className="text-xs text-orf-text-3">Sem dados ainda</p>
            )}
          </div>
        </div>
        <div className="orf-card">
          <p className="text-sm font-semibold text-orf-text mb-3">Top 3 Piores Prompts</p>
          <div className="space-y-2.5">
            {(data?.worstPrompts ?? []).slice(0, 3).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-xs text-orf-text-3 w-4 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-orf-text truncate">{p.promptText}</p>
                  {p.groupName ? <p className="text-xs text-orf-text-3">{p.groupName}</p> : null}
                </div>
                <span className="text-sm font-semibold text-orf-error shrink-0">
                  {Number(p.mentionRate ?? 0).toFixed(1)}%
                </span>
              </div>
            ))}
            {(data?.worstPrompts ?? []).length === 0 && (
              <p className="text-xs text-orf-text-3">Sem dados ainda</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Competitive ranking */}
      <div className="orf-card">
        <p className="text-sm font-semibold text-orf-text mb-3">Posicionamento Competitivo</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-orf-text-3 border-b border-orf-surface-2">
                <th className="pb-2 pr-4 font-medium">Ranking</th>
                <th className="pb-2 pr-4 font-medium">Marca</th>
                <th className="pb-2 font-medium">Menções</th>
              </tr>
            </thead>
            <tbody>
              {(data?.competitorRanking ?? []).map((c, i) => (
                <tr key={c.id} className="border-b border-orf-surface-2/40 last:border-0">
                  <td className="py-2.5 pr-4 text-orf-text-3">#{i + 1}</td>
                  <td className="py-2.5 pr-4 text-orf-text font-medium">{c.brandName}</td>
                  <td className="py-2.5 text-orf-text">{c.mentionCount}</td>
                </tr>
              ))}
              {(data?.competitorRanking ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-xs text-orf-text-3">
                    Nenhum concorrente cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
