'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import type { Workspace } from '@/store/auth'

const inputCls = 'w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary'

export function CreateWorkspaceView() {
  const router = useRouter()
  const { setTokens, setWorkspaces, workspaces } = useAuthStore()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const slugify = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api<Workspace>('/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      })
      const newWorkspace = res.data
      setWorkspaces([...workspaces, newWorkspace])

      // Switch to new workspace
      const switchRes = await api<{ accessToken: string; refreshToken: string }>(
        `/workspaces/${newWorkspace.id}/switch`,
        { method: 'POST' }
      )
      setTokens(switchRes.data.accessToken)
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message ?? 'Erro ao criar workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-bold text-orf-text">Criar Workspace</h1>
        <p className="text-sm text-orf-text-2 mt-0.5">
          Crie um workspace isolado para um novo cliente ou projeto.
        </p>
      </div>

      <div className="bg-orf-surface border border-orf-border rounded-orf p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Nome do workspace</label>
          <input
            type="text"
            placeholder="Ex: HubCount, Empresa XYZ"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          {name && (
            <p className="text-xs text-orf-text-3 mt-1">Slug: <code>{slugify(name)}</code></p>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Workspace'}
          </button>
        </div>
      </div>

      <div className="bg-orf-surface border border-orf-border rounded-orf p-4">
        <p className="text-xs font-medium text-orf-text-2 mb-2">Como funciona</p>
        <ul className="text-xs text-orf-text-3 space-y-1.5">
          <li>• Cada workspace tem dados completamente isolados (leads, budget, integrações)</li>
          <li>• Você pode alternar entre workspaces pelo seletor no menu lateral</li>
          <li>• Convide membros com acesso restrito apenas ao workspace desejado</li>
        </ul>
      </div>
    </div>
  )
}
