'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'

interface GeoMonitor {
  id: string
  brandName: string
  brandAliases: string[]
  competitors: string[]
  keywords: string[]
  engines: string[]
  frequency: string
  isActive: boolean
  createdAt: string
}

interface CollectResult {
  overallScore: number
  mentionRate: string
  mentionCount: number
  totalMentions: number
  engineScores: Record<string, number>
}

interface MonitorScore {
  monitorId: string
  overallScore: number
  mentionRate: string
  engineScores: Record<string, number>
  collectedAt: string
}

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
  perplexity: 'Perplexity',
  grok: 'Grok',
}

const ENGINE_COLORS: Record<string, string> = {
  chatgpt:   'text-emerald-400',
  gemini:    'text-blue-400',
  claude:    'text-orange-400',
  perplexity: 'text-purple-400',
  grok:      'text-pink-400',
}

const ALL_ENGINES = ['chatgpt', 'gemini', 'claude', 'perplexity', 'grok']

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100)
  const color = pct >= 70 ? 'bg-orf-success' : pct >= 40 ? 'bg-orf-warning' : 'bg-orf-error'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-orf-surface-2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${
        pct >= 70 ? 'text-orf-success' : pct >= 40 ? 'text-orf-warning' : 'text-orf-error'
      }`}>
        {Math.round(value)}
      </span>
    </div>
  )
}

export function GeoMonitorsView() {
  const [monitors, setMonitors] = useState<GeoMonitor[]>([])
  const [scores, setScores] = useState<Record<string, MonitorScore>>({})
  const [collecting, setCollecting] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    brandName: '',
    brandAliases: '',
    competitors: '',
    keywords: '',
    engines: ALL_ENGINES,
    frequency: 'daily',
  })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    try {
      const res = await apiRequest<GeoMonitor[]>('/geo/monitors')
      setMonitors(res.data)
    } catch {
      setError('Erro ao carregar monitores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggleEngine = (engine: string) => {
    setForm((f) => ({
      ...f,
      engines: f.engines.includes(engine)
        ? f.engines.filter((e) => e !== engine)
        : [...f.engines, engine],
    }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.engines.length === 0) { setError('Selecione pelo menos 1 engine'); return }
    setSubmitting(true)
    setError('')

    try {
      await apiRequest('/geo/monitors', {
        method: 'POST',
        body: JSON.stringify({
          brandName: form.brandName,
          brandAliases: form.brandAliases.split(',').map((s) => s.trim()).filter(Boolean),
          competitors: form.competitors.split(',').map((s) => s.trim()).filter(Boolean),
          keywords: form.keywords.split(',').map((s) => s.trim()).filter(Boolean),
          engines: form.engines,
          frequency: form.frequency,
        }),
      })
      setShowForm(false)
      setForm({ brandName: '', brandAliases: '', competitors: '', keywords: '', engines: ALL_ENGINES, frequency: 'daily' })
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar monitor')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Desativar este monitor?')) return
    await apiRequest(`/geo/monitors/${id}`, { method: 'DELETE' }).catch(() => null)
    load()
  }

  const handleCollect = async (monitor: GeoMonitor) => {
    setCollecting(c => ({ ...c, [monitor.id]: true }))
    setError('')
    try {
      const res = await apiRequest<CollectResult>(`/geo/monitors/${monitor.id}/collect`, {
        method: 'POST',
      })
      setScores(s => ({
        ...s,
        [monitor.id]: {
          monitorId: monitor.id,
          overallScore: res.data.overallScore,
          mentionRate: res.data.mentionRate,
          engineScores: res.data.engineScores,
          collectedAt: new Date().toISOString(),
        },
      }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro na coleta'
      setError(msg.includes('Worker') || msg.includes('worker') ? 'AI Worker indisponível. Verifique OPENAI_API_KEY no .env.' : msg)
    } finally {
      setCollecting(c => ({ ...c, [monitor.id]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orf-text">GEO Monitor</h1>
          <p className="text-orf-text-2 mt-1 text-sm">Monitore sua marca nas IAs generativas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="orf-btn-primary">
          {showForm ? 'Cancelar' : '+ Novo Monitor'}
        </button>
      </div>

      {error && (
        <div className="text-orf-warning text-sm bg-orf-warning/10 border border-orf-warning/20 rounded-orf-sm px-4 py-3">
          ⚠️ {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="orf-card space-y-4">
          <h2 className="text-base font-semibold text-orf-text">Criar Monitor</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-orf-text-2 mb-1.5">Nome da marca *</label>
              <input
                className="orf-input"
                placeholder="Ex: ORFFIA"
                value={form.brandName}
                onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-orf-text-2 mb-1.5">Frequência</label>
              <select
                className="orf-input"
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
              >
                <option value="hourly">A cada hora</option>
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-orf-text-2 mb-1.5">
              Keywords a monitorar * <span className="text-orf-text-3">(separadas por vírgula)</span>
            </label>
            <input
              className="orf-input"
              placeholder="ferramenta SEO, marketing IA, geração de conteúdo"
              value={form.keywords}
              onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orf-text-2 mb-1.5">
              Outros nomes da marca <span className="text-orf-text-3">(opcional, vírgula)</span>
            </label>
            <input
              className="orf-input"
              placeholder="ORFFIA.io, ORFFIA Hub"
              value={form.brandAliases}
              onChange={(e) => setForm((f) => ({ ...f, brandAliases: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orf-text-2 mb-1.5">
              Concorrentes <span className="text-orf-text-3">(opcional, vírgula)</span>
            </label>
            <input
              className="orf-input"
              placeholder="Semrush, Ahrefs, SurferSEO"
              value={form.competitors}
              onChange={(e) => setForm((f) => ({ ...f, competitors: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-orf-text-2 mb-2">Engines de IA</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ENGINES.map((eng) => (
                <button
                  key={eng}
                  type="button"
                  onClick={() => toggleEngine(eng)}
                  className={`px-3 py-1.5 rounded-orf-sm text-xs font-medium border transition-colors ${
                    form.engines.includes(eng)
                      ? 'bg-orf-primary/10 border-orf-primary text-orf-primary'
                      : 'bg-transparent border-orf-border text-orf-text-3 hover:border-orf-border-2'
                  }`}
                >
                  {ENGINE_LABELS[eng]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="orf-btn-primary">
              {submitting ? 'Criando...' : 'Criar Monitor'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="orf-card animate-pulse">
              <div className="h-4 bg-orf-surface-2 rounded w-1/3 mb-2" />
              <div className="h-3 bg-orf-surface-2 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : monitors.length === 0 ? (
        <div className="orf-card flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-orf-text-2 text-sm">Nenhum monitor criado</p>
          <p className="text-orf-text-3 text-xs mt-1">Crie um monitor para rastrear sua marca nas IAs</p>
        </div>
      ) : (
        <div className="space-y-4">
          {monitors.map((m) => {
            const score = scores[m.id]
            const isCollecting = collecting[m.id] ?? false

            return (
              <div key={m.id} className="orf-card space-y-4">
                {/* Monitor header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-orf-text">{m.brandName}</span>
                      <span className={`orf-badge ${m.isActive ? 'orf-badge-success' : 'orf-badge-warning'}`}>
                        {m.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="orf-badge orf-badge-primary">{m.frequency}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {m.keywords.slice(0, 5).map((kw) => (
                        <span key={kw} className="text-xs text-orf-text-3 bg-orf-surface-2 px-2 py-0.5 rounded-orf-sm">
                          {kw}
                        </span>
                      ))}
                      {m.keywords.length > 5 && (
                        <span className="text-xs text-orf-text-3">+{m.keywords.length - 5}</span>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {m.engines.map((eng) => (
                        <span key={eng} className="text-xs text-orf-primary bg-orf-primary/10 px-2 py-0.5 rounded-orf-sm">
                          {ENGINE_LABELS[eng] ?? eng}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCollect(m)}
                      disabled={isCollecting}
                      className="orf-btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {isCollecting ? (
                        <>
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Coletando...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Simular coleta
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-orf-text-3 hover:text-orf-error transition-colors p-1"
                      title="Desativar monitor"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Score panel — shown after collection */}
                {score && (
                  <div className="border-t border-orf-border pt-4 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-orf-text-2 uppercase tracking-wider">GEO Score</p>
                      <p className="text-xs text-orf-text-3">
                        {new Date(score.collectedAt).toLocaleString('pt-BR', { timeStyle: 'short', dateStyle: 'short' })}
                      </p>
                    </div>

                    {/* Overall score */}
                    <div className="flex items-center gap-4 p-3 bg-orf-surface-2 rounded-orf-sm">
                      <div className="text-center w-16 shrink-0">
                        <p className={`text-3xl font-black ${
                          score.overallScore >= 70 ? 'text-orf-success' :
                          score.overallScore >= 40 ? 'text-orf-warning' : 'text-orf-error'
                        }`}>
                          {Math.round(score.overallScore)}
                        </p>
                        <p className="text-[10px] text-orf-text-3 mt-0.5">Score geral</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-orf-text-3 mb-1">Visibility Rate</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-orf-border rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                parseFloat(score.mentionRate) >= 70 ? 'bg-orf-success' :
                                parseFloat(score.mentionRate) >= 40 ? 'bg-orf-warning' : 'bg-orf-error'
                              }`}
                              style={{ width: `${score.mentionRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-orf-text w-12 text-right">{score.mentionRate}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Per-engine scores */}
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(score.engineScores).map(([engine, val]) => (
                        <div key={engine} className="flex items-center gap-3">
                          <span className={`text-xs font-medium w-20 shrink-0 ${ENGINE_COLORS[engine] ?? 'text-orf-text-2'}`}>
                            {ENGINE_LABELS[engine] ?? engine}
                          </span>
                          <div className="flex-1">
                            <ScoreBar value={val} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
