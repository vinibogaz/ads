'use client'

import { useState } from 'react'
import { apiRequest } from '@/lib/api'

interface Finding {
  category: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  action: string
}

interface DiagnosticResult {
  geoReadinessScore: number
  findings: Finding[]
}

interface GeoDiagnosticViewProps {
  monitorId?: string
  brandUrl?: string
}

const STATUS_COLORS: Record<string, string> = {
  pass: 'border-orf-success bg-orf-success/10 text-orf-success',
  warn: 'border-orf-warning bg-orf-warning/10 text-orf-warning',
  fail: 'border-orf-error bg-orf-error/10 text-orf-error',
}

const STATUS_LABELS: Record<string, string> = {
  pass: 'OK',
  warn: 'Atenção',
  fail: 'Falha',
}

const STATUS_DOT: Record<string, string> = {
  pass: 'bg-orf-success',
  warn: 'bg-orf-warning',
  fail: 'bg-orf-error',
}

function ScoreGauge({ score }: { score: number }) {
  const clampedScore = Math.min(100, Math.max(0, score ?? 0))
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference
  const color =
    clampedScore >= 70
      ? '#22c55e'
      : clampedScore >= 40
      ? '#f59e0b'
      : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-orf-surface-2"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-orf-text">{clampedScore}</span>
          <span className="text-xs text-orf-text-3">/ 100</span>
        </div>
      </div>
      <p className="text-sm font-medium text-orf-text-2">GEO Readiness Score</p>
    </div>
  )
}

function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false)
  const colorClass = STATUS_COLORS[finding.status] ?? STATUS_COLORS.fail
  const dotClass = STATUS_DOT[finding.status] ?? STATUS_DOT.fail
  const label = STATUS_LABELS[finding.status] ?? 'Falha'

  return (
    <div className={`orf-card border ${colorClass} cursor-pointer`} onClick={() => setExpanded(v => !v)}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-orf-text truncate">{finding.category}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colorClass} flex-shrink-0`}>
              {label}
            </span>
          </div>
          <p className="text-xs text-orf-text-2 mt-1">{finding.message}</p>
          {expanded && (
            <p className="text-xs text-orf-text-3 mt-2 pt-2 border-t border-orf-border">
              <span className="font-medium text-orf-text-2">Ação: </span>
              {finding.action}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function GeoDiagnosticView({ monitorId, brandUrl }: GeoDiagnosticViewProps) {
  const [urlInput, setUrlInput] = useState(brandUrl ?? '')
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runDiagnostic() {
    if (!urlInput.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiRequest<DiagnosticResult>('/geo/diagnostic', {
        method: 'POST',
        body: JSON.stringify({
          url: urlInput.trim(),
          monitorId: monitorId ?? '',
        }),
      })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao executar diagnóstico')
    } finally {
      setLoading(false)
    }
  }

  const passCount = result?.findings.filter(f => f.status === 'pass').length ?? 0
  const warnCount = result?.findings.filter(f => f.status === 'warn').length ?? 0
  const failCount = result?.findings.filter(f => f.status === 'fail').length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-orf-text">Diagnóstico GEO</h1>
        <p className="text-orf-text-2 mt-1 text-sm">
          Avaliação técnica do seu site para otimização em IAs generativas
        </p>
      </div>

      {/* URL input + action */}
      <div className="orf-card">
        <p className="text-sm font-medium text-orf-text mb-3">URL do site a diagnosticar</p>
        <div className="flex gap-3">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://exemplo.com.br"
            className="flex-1 bg-orf-surface-2 border border-orf-border rounded-lg px-3 py-2 text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-accent"
            onKeyDown={e => e.key === 'Enter' && runDiagnostic()}
          />
          <button
            onClick={runDiagnostic}
            disabled={loading || !urlInput.trim()}
            className="orf-btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analisando…' : 'Rodar Diagnóstico'}
          </button>
        </div>
        {error && (
          <p className="text-xs text-orf-error mt-2">{error}</p>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="orf-card flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-orf-accent border-t-transparent animate-spin" />
          <p className="text-sm text-orf-text-2">Analisando o site…</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Score + summary */}
          <div className="orf-card flex flex-col sm:flex-row items-center gap-8">
            <ScoreGauge score={result.geoReadinessScore} />
            <div className="flex-1 space-y-3 w-full">
              <p className="text-sm font-semibold text-orf-text">Resumo do diagnóstico</p>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orf-success" />
                  <span className="text-orf-text-2">{passCount} aprovados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orf-warning" />
                  <span className="text-orf-text-2">{warnCount} atenção</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orf-error" />
                  <span className="text-orf-text-2">{failCount} falhas</span>
                </div>
              </div>
              <p className="text-xs text-orf-text-3">
                Clique em cada item para ver a ação recomendada.
              </p>
            </div>
          </div>

          {/* Findings grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.findings.map((f, i) => (
              <FindingCard key={i} finding={f} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="orf-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <p className="text-orf-text-2 text-sm font-medium">Pronto para diagnosticar</p>
          <p className="text-orf-text-3 text-xs mt-1">
            Informe a URL do site acima e clique em Rodar Diagnóstico
          </p>
        </div>
      )}
    </div>
  )
}
