'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

type ConversionStats = {
  total: number
  sent: number
  pending: number
  failed: number
  successRate: number
  byPlatform: Record<string, { total: number; sent: number; failed: number }>
  byEvent: Record<string, number>
}

type Conversion = {
  id: string
  platform: string
  event: string
  value: string | null
  currency: string
  status: string
  sentAt: string | null
  createdAt: string
  lead?: { name: string | null; email: string | null }
  integration?: { name: string; platform: string }
}

const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Meta', google: 'Google', linkedin: 'LinkedIn',
  tiktok: 'TikTok', twitter: 'Twitter', pinterest: 'Pinterest',
  taboola: 'Taboola', other: 'Outro',
}

const EVENT_LABELS: Record<string, string> = {
  lead: 'Lead', qualified_lead: 'Lead Qualificado',
  opportunity: 'Oportunidade', sale: 'Venda', custom: 'Customizado',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-600',
  inactive: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Enviado', pending: 'Pendente', error: 'Falhou', inactive: 'Inativo',
}

export function ConversionsView() {
  const { data: statsData } = useQuery({
    queryKey: ['conversions-stats'],
    queryFn: () => api<ConversionStats>('/conversions/stats'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['conversions'],
    queryFn: () => api<Conversion[]>('/conversions'),
  })

  const stats = statsData?.data
  const conversions: Conversion[] = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-orf-text">Conversões Offline</h1>
        <p className="text-sm text-orf-text-2 mt-0.5">
          Acompanhe os disparos de sinais de conversão para as plataformas de anúncio
        </p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-orf-surface rounded-orf border border-orf-border p-4">
            <p className="text-xs text-orf-text-2 uppercase tracking-wide">Total Disparado</p>
            <p className="text-2xl font-bold text-orf-text mt-1">{stats.total}</p>
          </div>
          <div className="bg-orf-surface rounded-orf border border-orf-border p-4">
            <p className="text-xs text-orf-text-2 uppercase tracking-wide">Enviados com Sucesso</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.sent}</p>
          </div>
          <div className="bg-orf-surface rounded-orf border border-orf-border p-4">
            <p className="text-xs text-orf-text-2 uppercase tracking-wide">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-orf-surface rounded-orf border border-orf-border p-4">
            <p className="text-xs text-orf-text-2 uppercase tracking-wide">Falhas</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{stats.failed}</p>
          </div>
        </div>
      )}

      {/* Taxa de sucesso + breakdown */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* Taxa de sucesso */}
          <div className="bg-orf-surface rounded-orf border border-orf-border p-5">
            <p className="text-xs font-semibold text-orf-text-2 uppercase tracking-wide mb-3">Taxa de Sucesso</p>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold text-orf-primary">{stats.successRate}%</p>
              <p className="text-sm text-orf-text-2 mb-1">{stats.sent} de {stats.total} conversões</p>
            </div>
            <div className="mt-3 h-2 bg-orf-surface-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  stats.successRate >= 80 ? 'bg-emerald-500' : stats.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
          </div>

          {/* Por plataforma */}
          <div className="bg-orf-surface rounded-orf border border-orf-border p-5">
            <p className="text-xs font-semibold text-orf-text-2 uppercase tracking-wide mb-3">Por Plataforma</p>
            <div className="space-y-2">
              {Object.entries(stats.byPlatform).map(([platform, counts]) => (
                <div key={platform} className="flex items-center justify-between text-sm">
                  <span className="text-orf-text">{PLATFORM_LABELS[platform] ?? platform}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-600">{counts.sent} ok</span>
                    {counts.failed > 0 && <span className="text-red-500">{counts.failed} falha</span>}
                    <span className="text-orf-text-3">{counts.total} total</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-orf-surface rounded-orf border border-orf-border overflow-hidden">
        <div className="px-5 py-4 border-b border-orf-border">
          <h2 className="text-sm font-semibold text-orf-text">Histórico de Disparos</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-orf-border bg-orf-surface-2">
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Lead</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Plataforma</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Evento</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Valor</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-orf-text-2 uppercase tracking-wide">Enviado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orf-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-orf-text-2">Carregando...</td></tr>
            ) : conversions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-orf-text-2">
                  Nenhuma conversão disparada ainda. As conversões aparecem aqui quando você marca um lead como venda qualificada.
                </td>
              </tr>
            ) : (
              conversions.map((c) => (
                <tr key={c.id} className="hover:bg-orf-surface-2 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-orf-text">{c.lead?.name ?? '—'}</p>
                    {c.lead?.email && <p className="text-xs text-orf-text-3">{c.lead.email}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-orf-text">{c.integration?.name ?? PLATFORM_LABELS[c.platform] ?? c.platform}</p>
                    <p className="text-xs text-orf-text-3">{PLATFORM_LABELS[c.platform] ?? c.platform}</p>
                  </td>
                  <td className="px-5 py-3 text-orf-text-2">{EVENT_LABELS[c.event] ?? c.event}</td>
                  <td className="px-5 py-3 text-orf-text-2">
                    {c.value
                      ? Number(c.value).toLocaleString('pt-BR', { style: 'currency', currency: c.currency })
                      : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-orf-text-2 text-xs">
                    {c.sentAt ? new Date(c.sentAt).toLocaleString('pt-BR') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
