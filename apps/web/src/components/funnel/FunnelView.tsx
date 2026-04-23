'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FunnelStage, Lead } from '@ads/shared'

type StageWithLeads = FunnelStage & { leads: Lead[] }

export function FunnelView() {
  const { data, isLoading } = useQuery({
    queryKey: ['funnel-overview'],
    queryFn: () => api<StageWithLeads[]>('/funnel/overview'),
  })

  const stages: StageWithLeads[] = data?.data ?? []
  const totalLeads = stages.reduce((s, st) => s + (st.leadCount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-orf-text">Funil</h1>
          <p className="text-sm text-orf-text-2 mt-0.5">Pipeline espelhado do seu CRM</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-orf-surface border border-orf-border text-orf-text-2 rounded-orf-sm text-sm font-medium hover:text-orf-text transition-colors">
            Configurar Etapas
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-orf-text-2 text-sm">Carregando funil...</div>
      ) : stages.length === 0 ? (
        <div className="text-center py-16 text-orf-text-2 text-sm">
          <p className="font-medium text-orf-text mb-1">Nenhuma etapa configurada</p>
          <p>Configure as etapas do funil ou conecte seu CRM para espelhar o pipeline.</p>
        </div>
      ) : (
        <>
          {/* Funnel bar visualization */}
          <div className="bg-orf-surface rounded-orf border border-orf-border p-5">
            <div className="flex gap-1 h-10 items-stretch">
              {stages.map((stage) => {
                const pct = totalLeads > 0 ? (stage.leadCount / totalLeads) * 100 : 0
                return (
                  <div
                    key={stage.id}
                    className="rounded flex items-center justify-center text-xs font-medium text-white transition-all"
                    style={{
                      width: `${Math.max(pct, 4)}%`,
                      backgroundColor: stage.color ?? '#6366f1',
                    }}
                    title={`${stage.name}: ${stage.leadCount} leads`}
                  >
                    {stage.leadCount > 0 && stage.leadCount}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-3 flex-wrap">
              {stages.map((stage) => (
                <div key={stage.id} className="flex items-center gap-1.5 text-xs text-orf-text-2">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: stage.color ?? '#6366f1' }}
                  />
                  {stage.name}
                </div>
              ))}
            </div>
          </div>

          {/* Kanban columns */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <div key={stage.id} className="min-w-[240px] flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stage.color ?? '#6366f1' }}
                    />
                    <span className="text-xs font-semibold text-orf-text">{stage.name}</span>
                  </div>
                  <span className="text-xs text-orf-text-3 bg-orf-surface-2 px-2 py-0.5 rounded-full">
                    {stage.leadCount}
                  </span>
                </div>

                <div className="space-y-2">
                  {stage.leads.slice(0, 10).map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-orf-surface border border-orf-border rounded-orf-sm p-3 cursor-pointer hover:border-orf-primary/30 transition-colors"
                    >
                      <p className="text-sm font-medium text-orf-text truncate">{lead.name ?? 'Sem nome'}</p>
                      {lead.email && (
                        <p className="text-xs text-orf-text-2 truncate mt-0.5">{lead.email}</p>
                      )}
                      {lead.utmSource && (
                        <p className="text-xs text-orf-text-3 mt-1">{lead.utmSource}</p>
                      )}
                    </div>
                  ))}
                  {stage.leadCount > 10 && (
                    <p className="text-xs text-orf-text-3 text-center py-1">
                      +{stage.leadCount - 10} mais
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
