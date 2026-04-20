'use client'

import { useState } from 'react'
import { apiRequest } from '@/lib/api'

interface ActionItem {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  category: string
}

interface ActionPlan {
  planId: string
  generatedAt: string
  actions: ActionItem[]
  archived?: boolean
}

interface GeoActionPlanViewProps {
  monitorId?: string
  brandName?: string
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-orf-error border-orf-error/40 bg-orf-error/10',
  medium: 'text-orf-warning border-orf-warning/40 bg-orf-warning/10',
  low: 'text-orf-text-3 border-orf-border bg-orf-surface-2',
}

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

const EFFORT_LABELS: Record<string, string> = {
  low: 'Esforço baixo',
  medium: 'Esforço médio',
  high: 'Esforço alto',
}

function PlanCard({ plan, onArchive }: { plan: ActionPlan; onArchive: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const date = plan.generatedAt
    ? new Date(plan.generatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

  return (
    <div className="orf-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-orf-text">
            Plano de Ação — {date}
          </p>
          <p className="text-xs text-orf-text-3 mt-0.5">
            {plan.actions?.length ?? 0} ações geradas
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!plan.archived && (
            <button
              onClick={() => onArchive(plan.planId)}
              className="text-xs text-orf-text-3 hover:text-orf-text transition-colors"
            >
              Arquivar
            </button>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-orf-accent hover:underline"
          >
            {expanded ? 'Recolher' : 'Ver ações'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 pt-2 border-t border-orf-border">
          {(plan.actions ?? []).map((action, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg bg-orf-surface-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orf-surface text-orf-text-3 text-xs flex items-center justify-center font-medium border border-orf-border">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-orf-text">{action.title}</p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                      PRIORITY_COLORS[action.priority] ?? PRIORITY_COLORS.medium
                    }`}
                  >
                    {PRIORITY_LABELS[action.priority] ?? action.priority}
                  </span>
                </div>
                <p className="text-xs text-orf-text-2">{action.description}</p>
                <p className="text-xs text-orf-text-3 mt-1">
                  {action.category} · {EFFORT_LABELS[action.effort] ?? action.effort}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function GeoActionPlanView({ monitorId, brandName }: GeoActionPlanViewProps) {
  const [plans, setPlans] = useState<ActionPlan[]>([])
  const [tab, setTab] = useState<'open' | 'archived'>('open')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openPlans = plans.filter(p => !p.archived)
  const archivedPlans = plans.filter(p => p.archived)
  const displayed = tab === 'open' ? openPlans : archivedPlans

  async function generatePlan() {
    setGenerating(true)
    setError(null)
    try {
      const { data } = await apiRequest<ActionPlan>('/geo/action-plans/generate', {
        method: 'POST',
        body: JSON.stringify({
          monitorId: monitorId ?? '',
          brandName: brandName ?? 'Sua marca',
          promptContext: `Monitor ${monitorId ?? 'sem ID'} — análise GEO para ${brandName ?? 'marca'}`,
        }),
      })
      setPlans(prev => [{ ...data, archived: false }, ...prev])
      setTab('open')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar plano de ação')
    } finally {
      setGenerating(false)
    }
  }

  function archivePlan(planId: string) {
    setPlans(prev =>
      prev.map(p => (p.planId === planId ? { ...p, archived: true } : p))
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-orf-text">Plano de Ação</h1>
          <p className="text-orf-text-2 mt-1 text-sm">
            Planos de ação gerados por IA para melhorar sua presença GEO
          </p>
        </div>
        <button
          onClick={generatePlan}
          disabled={generating}
          className="orf-btn-primary px-4 py-2 text-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? 'Gerando…' : 'Gerar Novo Plano'}
        </button>
      </div>

      {error && (
        <div className="orf-card border border-orf-error/40 bg-orf-error/10">
          <p className="text-xs text-orf-error">{error}</p>
        </div>
      )}

      {generating && (
        <div className="orf-card flex items-center gap-3 py-4">
          <div className="w-5 h-5 rounded-full border-2 border-orf-accent border-t-transparent animate-spin" />
          <p className="text-sm text-orf-text-2">Gerando 5 ações com GPT-4o-mini…</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-orf-border">
        {(['open', 'archived'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-orf-accent text-orf-text'
                : 'border-transparent text-orf-text-3 hover:text-orf-text-2'
            }`}
          >
            {t === 'open'
              ? `Em Aberto${openPlans.length > 0 ? ` (${openPlans.length})` : ''}`
              : `Arquivados${archivedPlans.length > 0 ? ` (${archivedPlans.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* Plan list */}
      {displayed.length > 0 ? (
        <div className="space-y-3">
          {displayed.map(plan => (
            <PlanCard key={plan.planId} plan={plan} onArchive={archivePlan} />
          ))}
        </div>
      ) : (
        <div className="orf-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-orf-text-2 text-sm font-medium">
            {tab === 'open' ? 'Nenhum plano em aberto' : 'Nenhum plano arquivado'}
          </p>
          {tab === 'open' && (
            <p className="text-orf-text-3 text-xs mt-1">
              Clique em Gerar Novo Plano para criar ações com IA
            </p>
          )}
        </div>
      )}
    </div>
  )
}
