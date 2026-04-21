'use client'

import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'

interface GeoPrompt {
  id: string
  promptText: string
  intentCluster: string | null
  groupName: string | null
  isActive: boolean
  createdAt: string
}

export function GeoPromptsView() {
  const [prompts, setPrompts] = useState<GeoPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newText, setNewText] = useState('')
  const [newCluster, setNewCluster] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    apiRequest<GeoPrompt[]>('/geo/prompts')
      .then(r => setPrompts(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!newText.trim()) return
    setSaving(true)
    try {
      await apiRequest('/geo/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: newText.trim(),
          intentCluster: newCluster.trim() || undefined,
        }),
      })
      setNewText('')
      setNewCluster('')
      setShowAdd(false)
      load()
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setPrompts(p => p.filter(x => x.id !== id))
    await apiRequest(`/geo/prompts/${id}`, { method: 'DELETE' }).catch(() => {
      load()
    })
  }

  const exportCsv = () => {
    const rows = [['Prompt', 'Cluster', 'Grupo', 'Data'].join(',')]
    for (const p of prompts) {
      rows.push([
        `"${p.promptText.replace(/"/g, '""')}"`,
        p.intentCluster ?? '',
        p.groupName ?? '',
        p.createdAt,
      ].join(','))
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'prompts-geo.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orf-text">Prompts Monitorados</h1>
          <p className="text-orf-text-2 mt-1 text-sm">Gerencie os prompts monitorados nas IAs generativas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="px-3 py-1.5 text-sm border border-orf-surface-2 rounded-lg text-orf-text-2 hover:text-orf-text transition-colors"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            + Novo Prompt
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="orf-card space-y-3">
          <p className="text-sm font-semibold text-orf-text">Novo Prompt</p>
          <textarea
            className="w-full bg-orf-surface-2 text-orf-text text-sm rounded-lg px-3 py-2 border border-orf-surface-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            rows={3}
            placeholder="Digite o prompt a monitorar..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
          />
          <input
            className="w-full bg-orf-surface-2 text-orf-text text-sm rounded-lg px-3 py-2 border border-orf-surface-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Cluster de intenção (ex: comparação, tutorial, recomendação)"
            value={newCluster}
            onChange={e => setNewCluster(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !newText.trim()}
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

      <div className="orf-card overflow-x-auto">
        {loading ? (
          <p className="text-center py-10 text-sm text-orf-text-3">Carregando...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-orf-text-3 border-b border-orf-surface-2">
                <th className="pb-2 pr-4 font-medium">Prompt</th>
                <th className="pb-2 pr-4 font-medium">Cluster de Intenção</th>
                <th className="pb-2 pr-4 font-medium">Grupo</th>
                <th className="pb-2 pr-4 font-medium">Data</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {prompts.map(p => (
                <tr key={p.id} className="border-b border-orf-surface-2/40 last:border-0 hover:bg-orf-surface-2/20">
                  <td className="py-2.5 pr-4 text-orf-text max-w-xs">
                    <p className="truncate">{p.promptText}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-orf-text-2 whitespace-nowrap">
                    {p.intentCluster ?? <span className="text-orf-text-3">—</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-orf-text-2 whitespace-nowrap">
                    {p.groupName ?? <span className="text-orf-text-3">—</span>}
                  </td>
                  <td className="py-2.5 pr-4 text-orf-text-3 whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-2.5">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs text-orf-error hover:text-red-400 transition-colors"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {prompts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-orf-text-3">
                    Nenhum prompt cadastrado. Clique em &quot;+ Novo Prompt&quot; para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
