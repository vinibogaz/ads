'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'

interface GeoPage {
  id: string
  pageUrl: string
  citationCount: number
  addedAt: string
}

export function GeoPagesView() {
  const [pages, setPages] = useState<GeoPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    apiRequest<GeoPage[]>('/api/v1/geo/pages')
      .then(r => setPages(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const addPage = async () => {
    if (!url.trim()) return
    setSaving(true)
    setError('')
    try {
      await apiRequest('/api/v1/geo/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageUrl: url.trim() }),
      })
      setUrl('')
      setShowAdd(false)
      load()
    } catch {
      setError('URL inválida ou erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const removePage = async (id: string) => {
    setPages(p => p.filter(x => x.id !== id))
    await apiRequest(`/api/v1/geo/pages/${id}`, { method: 'DELETE' }).catch(() => {
      load()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orf-text">Páginas Monitoradas</h1>
          <p className="text-orf-text-2 mt-1 text-sm">URLs do seu site monitoradas nas respostas das IAs</p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setError('') }}
          className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          + Adicionar Página
        </button>
      </div>

      {showAdd && (
        <div className="orf-card space-y-3">
          <p className="text-sm font-semibold text-orf-text">Nova Página</p>
          <input
            type="url"
            className="w-full bg-orf-surface-2 text-orf-text text-sm rounded-lg px-3 py-2 border border-orf-surface-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="https://seusite.com/pagina"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPage() }}
          />
          {error && <p className="text-xs text-orf-error">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={addPage}
              disabled={saving || !url.trim()}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setError('') }}
              className="px-3 py-1.5 text-sm text-orf-text-2 hover:text-orf-text"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="orf-card overflow-hidden">
        {loading ? (
          <p className="text-center py-10 text-sm text-orf-text-3">Carregando...</p>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-orf-surface-2 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orf-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-orf-text-2 text-sm font-medium">Nenhuma página monitorada</p>
            <p className="text-orf-text-3 text-xs mt-1">Adicione URLs do seu site para monitorar citações nas IAs</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2 border-b border-orf-surface-2/60">
              <span className="text-xs text-orf-text-3 font-medium uppercase tracking-wide">URL</span>
              <span className="text-xs text-orf-text-3 font-medium uppercase tracking-wide text-right">Citações</span>
              <span className="text-xs text-orf-text-3 font-medium uppercase tracking-wide text-right">Adicionada em</span>
              <span />
            </div>
            <div className="divide-y divide-orf-surface-2/40">
              {pages.map(p => (
                <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-4 py-3 hover:bg-orf-surface-2/20">
                  <span className="text-sm text-orf-text truncate">{p.pageUrl}</span>
                  <span className="text-sm text-orf-text-2 text-right whitespace-nowrap">{p.citationCount ?? 0}</span>
                  <span className="text-xs text-orf-text-3 text-right whitespace-nowrap">
                    {new Date(p.addedAt).toLocaleDateString('pt-BR')}
                  </span>
                  <button
                    onClick={() => removePage(p.id)}
                    className="text-xs text-orf-error hover:text-red-400 transition-colors whitespace-nowrap"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
