'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'

interface GeoCompetitor {
  id: string
  brandName: string
  websiteUrl: string | null
  mentionCount: number
  createdAt: string
}

const SUGGESTIONS = [
  'Semrush', 'Ahrefs', 'Moz', 'SpyFu', 'SimilarWeb',
  'Conductor', 'BrightEdge', 'Searchmetrics', 'SE Ranking', 'Serpstat',
]

export function GeoCompetitorsView() {
  const [competitors, setCompetitors] = useState<GeoCompetitor[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    apiRequest<GeoCompetitor[]>('/geo/competitors')
      .then(r => setCompetitors(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const addCompetitor = async (name: string, url?: string) => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await apiRequest('/geo/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: name.trim(),
          websiteUrl: (url ?? '').trim() || undefined,
        }),
      })
      setBrandName('')
      setWebsiteUrl('')
      setShowAdd(false)
      load()
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setCompetitors(c => c.filter(x => x.id !== id))
    await apiRequest(`/geo/competitors/${id}`, { method: 'DELETE' }).catch(() => {
      load()
    })
  }

  const existing = new Set(competitors.map(c => c.brandName.toLowerCase()))
  const suggestions = SUGGESTIONS.filter(s => !existing.has(s.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orf-text">Concorrentes</h1>
          <p className="text-orf-text-2 mt-1 text-sm">Monitore concorrentes e compare visibilidade nas IAs</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          + Adicionar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main list */}
        <div className="lg:col-span-2 space-y-4">
          {showAdd && (
            <div className="orf-card space-y-3">
              <p className="text-sm font-semibold text-orf-text">Novo Concorrente</p>
              <input
                className="w-full bg-orf-surface-2 text-orf-text text-sm rounded-lg px-3 py-2 border border-orf-surface-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Nome da marca"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
              />
              <input
                className="w-full bg-orf-surface-2 text-orf-text text-sm rounded-lg px-3 py-2 border border-orf-surface-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="URL do site (opcional)"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => addCompetitor(brandName, websiteUrl)}
                  disabled={saving || !brandName.trim()}
                  className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 text-sm text-orf-text-2 hover:text-orf-text"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="orf-card">
            {loading ? (
              <p className="text-center py-10 text-sm text-orf-text-3">Carregando...</p>
            ) : (
              <div className="divide-y divide-orf-surface-2/40">
                {competitors.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-3 hover:bg-orf-surface-2/20 -mx-4 px-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-orf-text">{c.brandName}</p>
                      {c.websiteUrl ? (
                        <p className="text-xs text-orf-text-3 truncate">{c.websiteUrl}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-orf-text-2 whitespace-nowrap shrink-0">
                      {c.mentionCount} menções
                    </span>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-orf-error hover:text-red-400 shrink-0 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                ))}
                {competitors.length === 0 && (
                  <p className="text-center py-10 text-xs text-orf-text-3">
                    Nenhum concorrente cadastrado. Use as sugestões ao lado ou clique em &quot;+ Adicionar&quot;.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Suggestions panel */}
        <div className="orf-card self-start">
          <p className="text-sm font-semibold text-orf-text mb-1">Sugestões Automáticas</p>
          <p className="text-xs text-orf-text-3 mb-3">Concorrentes comuns no mercado SEO/GEO:</p>
          <div className="space-y-2">
            {suggestions.map(s => (
              <div key={s} className="flex items-center justify-between gap-2">
                <span className="text-sm text-orf-text-2">{s}</span>
                <button
                  onClick={() => addCompetitor(s)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 shrink-0 transition-colors"
                >
                  + Adicionar
                </button>
              </div>
            ))}
            {suggestions.length === 0 && (
              <p className="text-xs text-orf-text-3">Todas as sugestões já foram adicionadas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
