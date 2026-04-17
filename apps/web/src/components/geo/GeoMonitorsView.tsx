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

const ENGINE_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
  perplexity: 'Perplexity',
  grok: 'Grok',
}

const ALL_ENGINES = ['chatgpt', 'gemini', 'claude', 'perplexity', 'grok']

export function GeoMonitorsView() {
  const [monitors, setMonitors] = useState<GeoMonitor[]>([])
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sx-text">GEO Monitor</h1>
          <p className="text-sx-text-2 mt-1 text-sm">Monitore sua marca nas IAs generativas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="sx-btn-primary">
          {showForm ? 'Cancelar' : '+ Novo Monitor'}
        </button>
      </div>

      {error && (
        <div className="text-sx-error text-sm bg-sx-error/10 border border-sx-error/20 rounded-sx-sm px-4 py-3">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="sx-card space-y-4">
          <h2 className="text-base font-semibold text-sx-text">Criar Monitor</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-sx-text-2 mb-1.5">Nome da marca *</label>
              <input
                className="sx-input"
                placeholder="Ex: Synthex"
                value={form.brandName}
                onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sx-text-2 mb-1.5">Frequência</label>
              <select
                className="sx-input"
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
            <label className="block text-sm font-medium text-sx-text-2 mb-1.5">
              Keywords a monitorar * <span className="text-sx-text-3">(separadas por vírgula)</span>
            </label>
            <input
              className="sx-input"
              placeholder="ferramenta SEO, marketing IA, geração de conteúdo"
              value={form.keywords}
              onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sx-text-2 mb-1.5">
              Outros nomes da marca <span className="text-sx-text-3">(opcional, vírgula)</span>
            </label>
            <input
              className="sx-input"
              placeholder="Synthex.io, Synthex Hub"
              value={form.brandAliases}
              onChange={(e) => setForm((f) => ({ ...f, brandAliases: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sx-text-2 mb-1.5">
              Concorrentes <span className="text-sx-text-3">(opcional, vírgula)</span>
            </label>
            <input
              className="sx-input"
              placeholder="Semrush, Ahrefs, SurferSEO"
              value={form.competitors}
              onChange={(e) => setForm((f) => ({ ...f, competitors: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sx-text-2 mb-2">Engines de IA</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ENGINES.map((eng) => (
                <button
                  key={eng}
                  type="button"
                  onClick={() => toggleEngine(eng)}
                  className={`px-3 py-1.5 rounded-sx-sm text-xs font-medium border transition-colors ${
                    form.engines.includes(eng)
                      ? 'bg-sx-primary/10 border-sx-primary text-sx-primary'
                      : 'bg-transparent border-sx-border text-sx-text-3 hover:border-sx-border-2'
                  }`}
                >
                  {ENGINE_LABELS[eng]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="sx-btn-primary">
              {submitting ? 'Criando...' : 'Criar Monitor'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-sx-text-2 text-sm py-8 text-center">Carregando monitores...</div>
      ) : monitors.length === 0 ? (
        <div className="sx-card flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-sx-surface-2 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-sx-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sx-text-2 text-sm">Nenhum monitor criado</p>
          <p className="text-sx-text-3 text-xs mt-1">Crie um monitor para rastrear sua marca nas IAs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {monitors.map((m) => (
            <div key={m.id} className="sx-card flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sx-text">{m.brandName}</span>
                  <span className={`sx-badge ${m.isActive ? 'sx-badge-success' : 'sx-badge-warning'}`}>
                    {m.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="sx-badge sx-badge-primary">{m.frequency}</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {m.keywords.slice(0, 5).map((kw) => (
                    <span key={kw} className="text-xs text-sx-text-3 bg-sx-surface-2 px-2 py-0.5 rounded-sx-sm">
                      {kw}
                    </span>
                  ))}
                  {m.keywords.length > 5 && (
                    <span className="text-xs text-sx-text-3">+{m.keywords.length - 5}</span>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {m.engines.map((eng) => (
                    <span key={eng} className="text-xs text-sx-primary bg-sx-primary/10 px-2 py-0.5 rounded-sx-sm">
                      {ENGINE_LABELS[eng] ?? eng}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleDelete(m.id)}
                className="text-sx-text-3 hover:text-sx-error transition-colors p-1 shrink-0"
                title="Desativar monitor"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
