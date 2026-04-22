'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Webhook } from '@ads/shared'

export function WebhooksView() {
  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => api<{ data: Webhook[] }>('/webhooks'),
  })

  const webhooks = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orf-text">Webhooks</h1>
          <p className="text-sm text-orf-text-2 mt-0.5">
            Receba leads de qualquer fonte via webhook
          </p>
        </div>
        <button className="px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 transition-colors">
          + Novo Webhook
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-orf-sm px-4 py-3 text-sm text-blue-700">
        <strong>Como funciona:</strong> Gere uma URL de webhook e configure na sua fonte de leads (landing page, formulário, etc.).
        Os leads recebidos entram automaticamente no seu funil.
      </div>

      <div className="bg-orf-surface rounded-orf border border-orf-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-orf-text-2 text-sm">Carregando...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-8 text-center text-orf-text-2 text-sm">
            Nenhum webhook configurado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orf-border bg-orf-surface-2">
                <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">URL de Recebimento</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Último Disparo</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-orf-border">
              {webhooks.map((wh) => (
                <tr key={wh.id} className="hover:bg-orf-surface-2 transition-colors">
                  <td className="px-5 py-3 font-medium text-orf-text">{wh.name}</td>
                  <td className="px-5 py-3">
                    <code className="text-xs bg-orf-surface-2 px-2 py-1 rounded font-mono text-orf-text-2">
                      /api/v1/webhooks/receive/{wh.id}
                    </code>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      wh.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {wh.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-orf-text-2 text-xs">
                    {wh.lastTriggeredAt
                      ? new Date(wh.lastTriggeredAt).toLocaleString('pt-BR')
                      : 'Nunca'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="text-xs text-orf-text-2 hover:text-orf-primary transition-colors">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
