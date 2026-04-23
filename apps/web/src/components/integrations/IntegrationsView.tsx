'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdsPlatformIntegration, CrmIntegration, AdsPlatform, CrmPlatform } from '@ads/shared'

const ADS_PLATFORM_LABELS: Record<AdsPlatform, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  linkedin: 'LinkedIn Ads',
  tiktok: 'TikTok Ads',
  twitter: 'Twitter Ads',
  pinterest: 'Pinterest Ads',
  taboola: 'Taboola',
  other: 'Outro',
}

const CRM_PLATFORM_LABELS: Record<CrmPlatform, string> = {
  rd_station: 'RD Station',
  hubspot: 'HubSpot',
  pipedrive: 'Pipedrive',
  nectar: 'Nectar CRM',
  moskit: 'Moskit',
  salesforce: 'Salesforce',
  zoho: 'Zoho CRM',
  webhook: 'Webhook',
  other: 'Outro',
}

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-500',
  error: 'bg-red-100 text-red-600',
  pending: 'bg-yellow-100 text-yellow-700',
}

const STATUS_LABELS = {
  active: 'Ativo',
  inactive: 'Inativo',
  error: 'Erro',
  pending: 'Pendente',
}

export function IntegrationsView() {
  const { data: platformsData, isLoading: loadingPlatforms } = useQuery({
    queryKey: ['ads-platforms'],
    queryFn: () => api<AdsPlatformIntegration[]>('/ads-integrations/platforms'),
  })

  const { data: crmData, isLoading: loadingCrm } = useQuery({
    queryKey: ['crm-integrations'],
    queryFn: () => api<CrmIntegration[]>('/ads-integrations/crm'),
  })

  const platforms: AdsPlatformIntegration[] = platformsData?.data ?? []
  const crms: CrmIntegration[] = crmData?.data ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-orf-text">Integrações</h1>
        <p className="text-sm text-orf-text-2 mt-0.5">
          Conecte plataformas de anúncio e CRMs para ativar conversão offline
        </p>
      </div>

      {/* Ads Platforms */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-orf-text">Plataformas de Anúncio</h2>
          <button className="px-3 py-1.5 bg-orf-primary text-white rounded-orf-sm text-xs font-medium hover:bg-orf-primary/90 transition-colors">
            + Conectar Plataforma
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {loadingPlatforms ? (
            <div className="col-span-2 py-8 text-center text-orf-text-2 text-sm">Carregando...</div>
          ) : platforms.length === 0 ? (
            <div className="col-span-2 bg-orf-surface border border-orf-border rounded-orf p-6 text-center text-sm text-orf-text-2">
              Nenhuma plataforma conectada. Conecte Meta, Google, LinkedIn ou outras para ativar conversão offline.
            </div>
          ) : (
            platforms.map((p) => (
              <div key={p.id} className="bg-orf-surface border border-orf-border rounded-orf p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-orf-text text-sm">{p.name}</p>
                  <p className="text-xs text-orf-text-2 mt-0.5">{ADS_PLATFORM_LABELS[p.platform]}</p>
                  {p.accountId && <p className="text-xs text-orf-text-3 mt-0.5">ID: {p.accountId}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                  <button className="text-xs text-orf-text-2 hover:text-orf-primary transition-colors">Editar</button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* CRM Integrations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-orf-text">CRMs</h2>
          <button className="px-3 py-1.5 bg-orf-primary text-white rounded-orf-sm text-xs font-medium hover:bg-orf-primary/90 transition-colors">
            + Conectar CRM
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {loadingCrm ? (
            <div className="col-span-2 py-8 text-center text-orf-text-2 text-sm">Carregando...</div>
          ) : crms.length === 0 ? (
            <div className="col-span-2 bg-orf-surface border border-orf-border rounded-orf p-6 text-center text-sm text-orf-text-2">
              Nenhum CRM conectado. Conecte RD Station, HubSpot, Pipedrive e outros para espelhar o funil aqui.
            </div>
          ) : (
            crms.map((crm) => (
              <div key={crm.id} className="bg-orf-surface border border-orf-border rounded-orf p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-orf-text text-sm">{crm.name}</p>
                  <p className="text-xs text-orf-text-2 mt-0.5">{CRM_PLATFORM_LABELS[crm.platform]}</p>
                  {crm.lastSyncAt && (
                    <p className="text-xs text-orf-text-3 mt-0.5">
                      Sync: {new Date(crm.lastSyncAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[crm.status]}`}>
                    {STATUS_LABELS[crm.status]}
                  </span>
                  <button className="text-xs text-orf-text-2 hover:text-orf-primary transition-colors">Editar</button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
