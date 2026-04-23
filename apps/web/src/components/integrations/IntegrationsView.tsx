'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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

const STATUS_LABELS = { active: 'Ativo', inactive: 'Inativo', error: 'Erro', pending: 'Pendente' }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-orf-surface border border-orf-border rounded-orf w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-orf-border">
          <h2 className="text-sm font-semibold text-orf-text">{title}</h2>
          <button onClick={onClose} className="text-orf-text-2 hover:text-orf-text transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

export function IntegrationsView() {
  const queryClient = useQueryClient()
  const [showPlatformModal, setShowPlatformModal] = useState(false)
  const [showCrmModal, setShowCrmModal] = useState(false)
  const [platformForm, setPlatformForm] = useState({ platform: 'meta' as AdsPlatform, name: '', accountId: '' })
  const [crmForm, setCrmForm] = useState({ platform: 'rd_station' as CrmPlatform, name: '' })
  const [error, setError] = useState('')

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

  const addPlatform = useMutation({
    mutationFn: (body: typeof platformForm) =>
      api('/ads-integrations/platforms', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-platforms'] })
      setShowPlatformModal(false)
      setPlatformForm({ platform: 'meta', name: '', accountId: '' })
      setError('')
    },
    onError: (e: any) => setError(e.message ?? 'Erro ao salvar'),
  })

  const addCrm = useMutation({
    mutationFn: (body: typeof crmForm) =>
      api('/ads-integrations/crm', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] })
      setShowCrmModal(false)
      setCrmForm({ platform: 'rd_station', name: '' })
      setError('')
    },
    onError: (e: any) => setError(e.message ?? 'Erro ao salvar'),
  })

  const deletePlatform = useMutation({
    mutationFn: (id: string) => api(`/ads-integrations/platforms/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ads-platforms'] }),
  })

  const deleteCrm = useMutation({
    mutationFn: (id: string) => api(`/ads-integrations/crm/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-integrations'] }),
  })

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
          <button
            onClick={() => { setShowPlatformModal(true); setError('') }}
            className="px-3 py-1.5 bg-orf-primary text-white rounded-orf-sm text-xs font-medium hover:bg-orf-primary/90 transition-colors"
          >
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
                  <button
                    onClick={() => deletePlatform.mutate(p.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remover
                  </button>
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
          <button
            onClick={() => { setShowCrmModal(true); setError('') }}
            className="px-3 py-1.5 bg-orf-primary text-white rounded-orf-sm text-xs font-medium hover:bg-orf-primary/90 transition-colors"
          >
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
                  <button
                    onClick={() => deleteCrm.mutate(crm.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modal: Conectar Plataforma */}
      {showPlatformModal && (
        <Modal title="Conectar Plataforma de Anúncio" onClose={() => setShowPlatformModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Plataforma</label>
              <select
                value={platformForm.platform}
                onChange={(e) => setPlatformForm((f) => ({ ...f, platform: e.target.value as AdsPlatform }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text focus:outline-none focus:border-orf-primary"
              >
                {(Object.entries(ADS_PLATFORM_LABELS) as [AdsPlatform, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Nome da conta</label>
              <input
                type="text"
                placeholder="Ex: HubCount Meta #1"
                value={platformForm.name}
                onChange={(e) => setPlatformForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Account ID <span className="text-orf-text-3">(opcional)</span></label>
              <input
                type="text"
                placeholder="Ex: act_123456789"
                value={platformForm.accountId}
                onChange={(e) => setPlatformForm((f) => ({ ...f, accountId: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowPlatformModal(false)}
                className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => addPlatform.mutate(platformForm)}
                disabled={!platformForm.name || addPlatform.isPending}
                className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50 transition-colors"
              >
                {addPlatform.isPending ? 'Salvando...' : 'Conectar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Conectar CRM */}
      {showCrmModal && (
        <Modal title="Conectar CRM" onClose={() => setShowCrmModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">CRM</label>
              <select
                value={crmForm.platform}
                onChange={(e) => setCrmForm((f) => ({ ...f, platform: e.target.value as CrmPlatform }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text focus:outline-none focus:border-orf-primary"
              >
                {(Object.entries(CRM_PLATFORM_LABELS) as [CrmPlatform, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Nome</label>
              <input
                type="text"
                placeholder="Ex: CRM HubCount"
                value={crmForm.name}
                onChange={(e) => setCrmForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowCrmModal(false)}
                className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => addCrm.mutate(crmForm)}
                disabled={!crmForm.name || addCrm.isPending}
                className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50 transition-colors"
              >
                {addCrm.isPending ? 'Salvando...' : 'Conectar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
