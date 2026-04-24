'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
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

const OAUTH_PLATFORMS: Partial<Record<AdsPlatform, boolean>> = { meta: true }

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
      <div className="bg-orf-surface border border-orf-border rounded-orf w-full max-w-lg mx-4 shadow-xl">
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

function MetaIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.086 14.432c-1.576-.398-2.768-1.813-2.768-3.502 0-.437.08-.858.23-1.25L7.01 10.432a5.507 5.507 0 00-.344 1.928c0 2.525 1.71 4.647 4.047 5.258l.201-1.186zm2.172 0l.201 1.186c2.337-.611 4.047-2.733 4.047-5.258 0-.665-.129-1.3-.363-1.882l-1.357 1.197c.148.383.228.8.228 1.235 0 1.69-1.192 3.104-2.756 3.522zm-.62-6.682l-1.83 1.614a2.64 2.64 0 00-.157.9c0 1.28.914 2.352 2.121 2.6l.45-2.652-.584-2.462zm.62 0l-.584 2.462.45 2.652c1.207-.248 2.121-1.32 2.121-2.6 0-.313-.056-.613-.157-.9l-1.83-1.614z" />
    </svg>
  )
}

type GSheet = { id: string; name: string; spreadsheetId: string; sheetName: string; status: string; lastSyncAt?: string; clientId?: string }

const DEFAULT_FIELD_MAPPING = { name: 'A', email: 'B', phone: 'C', company: 'D', status: 'E', utmSource: 'F', utmMedium: 'G', utmCampaign: 'H', createdAt: 'I' }

function GoogleSheetsSection() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', spreadsheetId: '', sheetName: 'Sheet1', serviceAccountJson: '' })
  const [error, setError] = useState('')
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['google-sheets'],
    queryFn: () => api<GSheet[]>('/google-sheets'),
  })
  const sheets: GSheet[] = data?.data ?? []

  const add = useMutation({
    mutationFn: () => api('/google-sheets', {
      method: 'POST',
      body: JSON.stringify({ ...form, fieldMapping: DEFAULT_FIELD_MAPPING }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets'] })
      setShowModal(false)
      setForm({ name: '', spreadsheetId: '', sheetName: 'Sheet1', serviceAccountJson: '' })
      setError('')
    },
    onError: (e: any) => setError(e.message ?? 'Erro ao conectar'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api(`/google-sheets/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['google-sheets'] }),
  })

  const sync = async (id: string) => {
    setSyncingId(id)
    setSyncMsg(null)
    try {
      const res = await api<{ synced: number }>(`/google-sheets/${id}/sync`, { method: 'POST' })
      setSyncMsg(`✓ ${res.data.synced} leads sincronizados`)
    } catch (e: any) {
      setSyncMsg(`Erro: ${e.message}`)
    } finally {
      setSyncingId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-orf-text">Google Sheets</h2>
          <p className="text-xs text-orf-text-3 mt-0.5">Exporte seus leads automaticamente para uma planilha</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError('') }}
          className="px-3 py-1.5 bg-orf-primary text-white rounded-orf-sm text-xs font-medium hover:bg-orf-primary/90 transition-colors"
        >
          + Conectar Planilha
        </button>
      </div>

      {syncMsg && (
        <div className={`text-xs px-3 py-2 rounded-orf-sm border ${syncMsg.startsWith('Erro') ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'}`}>
          {syncMsg}
        </div>
      )}

      {isLoading ? (
        <div className="py-4 text-center text-sm text-orf-text-2">Carregando...</div>
      ) : sheets.length === 0 ? (
        <div className="bg-orf-surface border border-orf-border rounded-orf p-6 text-center">
          <p className="text-sm text-orf-text-2">Nenhuma planilha conectada.</p>
          <p className="text-xs text-orf-text-3 mt-1">Você precisará de uma conta de serviço do Google Cloud. <button onClick={() => setShowModal(true)} className="text-orf-primary hover:underline">Conectar agora</button></p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {sheets.map((s) => (
            <div key={s.id} className="bg-orf-surface border border-orf-border rounded-orf p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-orf-text">{s.name}</p>
                  <p className="text-xs text-orf-text-3 mt-0.5">ID: {s.spreadsheetId.slice(0, 20)}...</p>
                  <p className="text-xs text-orf-text-3">Aba: {s.sheetName}</p>
                  {s.lastSyncAt && <p className="text-xs text-orf-text-3">Sync: {new Date(s.lastSyncAt).toLocaleString('pt-BR')}</p>}
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Ativo</span>
              </div>
              <div className="flex items-center gap-3 border-t border-orf-border pt-3">
                <button
                  onClick={() => sync(s.id)}
                  disabled={syncingId === s.id}
                  className="text-xs text-orf-primary hover:underline disabled:opacity-50"
                >
                  {syncingId === s.id ? 'Sincronizando...' : 'Sincronizar leads'}
                </button>
                <button onClick={() => remove.mutate(s.id)} className="text-xs text-red-400 hover:text-red-600">Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Conectar Google Sheets" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-orf-sm p-3 text-xs text-amber-700">
              <strong>Pré-requisito:</strong> Crie uma conta de serviço no Google Cloud Console, baixe o JSON de credenciais e compartilhe a planilha com o e-mail da conta de serviço.
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Nome da integração</label>
              <input type="text" placeholder="Ex: Leads Cliente XYZ" value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">ID da planilha</label>
              <input type="text" placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" value={form.spreadsheetId}
                onChange={(e) => setForm(f => ({ ...f, spreadsheetId: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary" />
              <p className="text-xs text-orf-text-3 mt-1">Encontre na URL: sheets.google.com/spreadsheets/d/<strong>ID_AQUI</strong>/edit</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Nome da aba</label>
              <input type="text" placeholder="Sheet1" value={form.sheetName}
                onChange={(e) => setForm(f => ({ ...f, sheetName: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">JSON da Conta de Serviço</label>
              <textarea rows={5} placeholder='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}' value={form.serviceAccountJson}
                onChange={(e) => setForm(f => ({ ...f, serviceAccountJson: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-xs text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary font-mono resize-none" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text">Cancelar</button>
              <button
                onClick={() => add.mutate()}
                disabled={!form.name || !form.spreadsheetId || !form.serviceAccountJson || add.isPending}
                className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50"
              >
                {add.isPending ? 'Conectando...' : 'Conectar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}

export function IntegrationsView() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [showPlatformModal, setShowPlatformModal] = useState(false)
  const [showCrmModal, setShowCrmModal] = useState(false)
  const [showSelectionModal, setShowSelectionModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [platformForm, setPlatformForm] = useState({ platform: 'google' as AdsPlatform, name: '', accountId: '' })
  const [crmForm, setCrmForm] = useState({ platform: 'rd_station' as CrmPlatform, name: '' })
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [connectingMeta, setConnectingMeta] = useState(false)
  const hasPreSelected = useRef(false)

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
  const pendingMeta = platforms.filter((p) => p.platform === 'meta' && p.status === 'pending')
  const activePlatforms = platforms.filter((p) => p.status !== 'pending')

  // Handle callback from Meta OAuth
  useEffect(() => {
    const metaSelect = searchParams.get('meta_select')
    const metaError = searchParams.get('error')

    if (metaSelect) {
      window.history.replaceState({}, '', '/integrations')
      // refetchQueries waits for the refetch to complete before opening the modal
      queryClient.refetchQueries({ queryKey: ['ads-platforms'] }).then(() => {
        setShowSelectionModal(true)
      })
    } else if (metaError === 'meta_denied') {
      setToast({ type: 'error', message: 'Autorização com Meta foi cancelada.' })
      window.history.replaceState({}, '', '/integrations')
    } else if (metaError === 'meta_token_failed') {
      setToast({ type: 'error', message: 'Falha ao obter token do Meta. Tente novamente.' })
      window.history.replaceState({}, '', '/integrations')
    }
  }, [searchParams, queryClient])

  // Pre-select all once when modal first opens — never again while modal is open
  useEffect(() => {
    if (showSelectionModal && pendingMeta.length > 0 && !hasPreSelected.current) {
      setSelectedIds(new Set(pendingMeta.map((p) => p.id)))
      hasPreSelected.current = true
    }
    if (!showSelectionModal) {
      hasPreSelected.current = false
    }
  }, [showSelectionModal, pendingMeta])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const handleConnectMeta = async () => {
    setConnectingMeta(true)
    try {
      const res = await api<{ url: string }>('/auth/meta/url')
      window.location.href = res.data.url
    } catch (e: any) {
      setToast({ type: 'error', message: e.message ?? 'Erro ao iniciar conexão com Meta' })
      setConnectingMeta(false)
    }
  }

  const confirmSelection = useMutation({
    mutationFn: (keep: string[]) =>
      api('/ads-integrations/platforms/confirm-selection', {
        method: 'POST',
        body: JSON.stringify({ keep }),
      }),
    onSuccess: (_, keep) => {
      queryClient.invalidateQueries({ queryKey: ['ads-platforms'] })
      setShowSelectionModal(false)
      setSelectedIds(new Set())
      setToast({
        type: 'success',
        message: keep.length > 0
          ? `${keep.length} conta${keep.length !== 1 ? 's' : ''} Meta ativada${keep.length !== 1 ? 's' : ''} com sucesso!`
          : 'Nenhuma conta selecionada.',
      })
    },
    onError: (e: any) => {
      setToast({ type: 'error', message: e.message ?? 'Erro ao confirmar seleção' })
      setShowSelectionModal(false)
    },
  })

  const addPlatform = useMutation({
    mutationFn: (body: typeof platformForm) =>
      api('/ads-integrations/platforms', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-platforms'] })
      setShowPlatformModal(false)
      setPlatformForm({ platform: 'google', name: '', accountId: '' })
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

  const syncPlatform = useMutation({
    mutationFn: (id: string) => api(`/auth/meta/sync/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-platforms'] })
      setToast({ type: 'success', message: 'Sincronização concluída.' })
    },
    onError: (e: any) => setToast({ type: 'error', message: e.message ?? 'Erro ao sincronizar' }),
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isOAuthPlatform = OAUTH_PLATFORMS[platformForm.platform]

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-orf shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-orf-text">Integrações</h1>
        <p className="text-sm text-orf-text-2 mt-0.5">
          Conecte plataformas de anúncio e CRMs para ativar conversão offline
        </p>
      </div>

      {/* Quick Connect: Meta */}
      <section className="bg-orf-surface border border-orf-border rounded-orf p-5">
        <h2 className="text-sm font-semibold text-orf-text mb-4">Conexão Rápida</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-orf-sm bg-blue-600 flex items-center justify-center text-white shrink-0">
              <MetaIcon />
            </div>
            <div>
              <p className="text-sm font-medium text-orf-text">Meta Ads</p>
              <p className="text-xs text-orf-text-2">Facebook & Instagram Ads — OAuth seguro, você escolhe quais contas monitorar</p>
            </div>
          </div>
          <button
            onClick={handleConnectMeta}
            disabled={connectingMeta}
            className="px-4 py-2 bg-blue-600 text-white rounded-orf-sm text-xs font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            {connectingMeta ? 'Redirecionando...' : 'Conectar com Meta'}
          </button>
        </div>
      </section>

      {/* Ads Platforms */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-orf-text">Plataformas de Anúncio</h2>
          <button
            onClick={() => { setShowPlatformModal(true); setError('') }}
            className="px-3 py-1.5 bg-orf-primary text-white rounded-orf-sm text-xs font-medium hover:bg-orf-primary/90 transition-colors"
          >
            + Adicionar Manualmente
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {loadingPlatforms ? (
            <div className="col-span-2 py-8 text-center text-orf-text-2 text-sm">Carregando...</div>
          ) : activePlatforms.length === 0 ? (
            <div className="col-span-2 bg-orf-surface border border-orf-border rounded-orf p-6 text-center text-sm text-orf-text-2">
              Nenhuma plataforma conectada. Use a conexão rápida acima ou adicione manualmente.
            </div>
          ) : (
            activePlatforms.map((p) => (
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
                  {p.platform === 'meta' && (
                    <button
                      onClick={() => syncPlatform.mutate(p.id)}
                      disabled={syncPlatform.isPending}
                      className="text-xs text-orf-primary hover:text-orf-primary/80 transition-colors"
                    >
                      Sync
                    </button>
                  )}
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

      {/* Google Sheets */}
      <GoogleSheetsSection />

      {/* Modal: Seleção de contas Meta */}
      {showSelectionModal && (
        <Modal
          title="Selecionar Contas Meta"
          onClose={() => {
            // Fechar sem selecionar deleta todas as pendentes
            confirmSelection.mutate([])
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-orf-text-2">
              Encontramos <strong className="text-orf-text">{pendingMeta.length} conta{pendingMeta.length !== 1 ? 's' : ''}</strong> vinculada{pendingMeta.length !== 1 ? 's' : ''} ao seu Meta Business. Selecione quais deseja monitorar:
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingMeta.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-orf-sm border cursor-pointer transition-colors ${
                    selectedIds.has(p.id)
                      ? 'border-orf-primary bg-orf-primary/5'
                      : 'border-orf-border hover:border-orf-primary/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="w-4 h-4 accent-orf-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-orf-text truncate">{p.name}</p>
                    {p.accountId && <p className="text-xs text-orf-text-3">ID: {p.accountId}</p>}
                    {(p.meta as any)?.currency && (
                      <p className="text-xs text-orf-text-3">Moeda: {(p.meta as any).currency}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setSelectedIds(new Set(pendingMeta.map((p) => p.id)))}
                className="text-xs text-orf-primary hover:underline"
              >
                Selecionar todas
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-orf-text-3 hover:text-orf-text-2"
              >
                Limpar seleção
              </button>
            </div>

            <div className="flex gap-3 pt-1 border-t border-orf-border">
              <button
                onClick={() => confirmSelection.mutate([])}
                className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmSelection.mutate([...selectedIds])}
                disabled={selectedIds.size === 0 || confirmSelection.isPending}
                className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50 transition-colors"
              >
                {confirmSelection.isPending
                  ? 'Ativando...'
                  : `Ativar ${selectedIds.size} conta${selectedIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Adicionar Plataforma Manualmente */}
      {showPlatformModal && (
        <Modal title="Adicionar Plataforma Manualmente" onClose={() => setShowPlatformModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Plataforma</label>
              <select
                value={platformForm.platform}
                onChange={(e) => setPlatformForm((f) => ({ ...f, platform: e.target.value as AdsPlatform }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text focus:outline-none focus:border-orf-primary"
              >
                {(Object.entries(ADS_PLATFORM_LABELS) as [AdsPlatform, string][])
                  .filter(([v]) => !OAUTH_PLATFORMS[v])
                  .map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
              </select>
            </div>

            {isOAuthPlatform ? (
              <div className="bg-blue-50 border border-blue-200 rounded-orf-sm p-4 text-sm text-blue-700">
                Esta plataforma usa OAuth. Use o botão <strong>"Conectar com Meta"</strong> acima.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Nome da conta</label>
                  <input
                    type="text"
                    placeholder="Ex: HubCount Google Ads"
                    value={platformForm.name}
                    onChange={(e) => setPlatformForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Account ID <span className="text-orf-text-3">(opcional)</span></label>
                  <input
                    type="text"
                    placeholder="Ex: 123-456-7890"
                    value={platformForm.accountId}
                    onChange={(e) => setPlatformForm((f) => ({ ...f, accountId: e.target.value }))}
                    className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
                  />
                </div>
              </>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowPlatformModal(false)}
                className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text transition-colors"
              >
                Cancelar
              </button>
              {!isOAuthPlatform && (
                <button
                  onClick={() => addPlatform.mutate(platformForm)}
                  disabled={!platformForm.name || addPlatform.isPending}
                  className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50 transition-colors"
                >
                  {addPlatform.isPending ? 'Salvando...' : 'Adicionar'}
                </button>
              )}
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
