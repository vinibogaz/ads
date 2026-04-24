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

const OAUTH_PLATFORMS: Partial<Record<AdsPlatform, boolean>> = { meta: true, google: true }

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

type GSheet = {
  id: string; name: string; spreadsheetId: string; sheetName: string
  spreadsheetTitle?: string; googleEmail?: string; status: string; lastSyncAt?: string; clientId?: string
}

function GoogleAdsIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#4285F4"/>
    </svg>
  )
}

function GoogleAdsSection({ onGoogleAdsSetup }: { onGoogleAdsSetup?: string | null }) {
  const queryClient = useQueryClient()
  const [setupId, setSetupId] = useState<string | null>(null)
  useEffect(() => { if (onGoogleAdsSetup) setSetupId(onGoogleAdsSetup) }, [onGoogleAdsSetup])
  const [setupForm, setSetupForm] = useState({ name: '', customerId: '' })
  const [setupError, setSetupError] = useState('')

  const { data: platformsData } = useQuery({
    queryKey: ['ads-platforms'],
    queryFn: () => api<AdsPlatformIntegration[]>('/ads-integrations/platforms'),
  })
  const platforms: AdsPlatformIntegration[] = platformsData?.data ?? []

  // Pre-fill name from pending record
  useEffect(() => {
    if (setupId) {
      const pending = platforms.find((p) => p.id === setupId)
      if (pending) setSetupForm(f => ({ ...f, name: (pending.meta as any)?.googleEmail ? `Google Ads (${(pending.meta as any).googleEmail.split('@')[0]})` : 'Google Ads' }))
    }
  }, [setupId, platforms])

  const completeSetup = useMutation({
    mutationFn: () =>
      api(`/auth/google-ads/setup/${setupId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: setupForm.name,
          customerId: setupForm.customerId.trim(),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-platforms'] })
      setSetupId(null)
      setSetupForm({ name: '', customerId: '' })
      setSetupError('')
      window.history.replaceState({}, '', '/integrations')
    },
    onError: (e: any) => setSetupError(e.message ?? 'Erro ao salvar'),
  })

  if (!setupId) return null

  return (
    <>
      {/* Setup modal — shown after OAuth callback */}
      {setupId && (
        <Modal title="Configurar Google Ads" onClose={() => {
          // Delete pending row if user cancels
          api(`/ads-integrations/platforms/${setupId}`, { method: 'DELETE' }).catch(() => {})
          setSetupId(null)
          window.history.replaceState({}, '', '/integrations')
        }}>
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-orf-sm p-3 text-xs text-emerald-700">
              ✓ Conta Google conectada. Informe o Customer ID da sua conta Google Ads para ativar.
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Customer ID <span className="text-orf-text-3">(ex: 123-456-7890)</span></label>
              <input
                type="text"
                placeholder="123-456-7890"
                value={setupForm.customerId}
                onChange={(e) => setSetupForm(f => ({ ...f, customerId: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
              <p className="text-xs text-orf-text-3 mt-1">Encontre em: Google Ads → clique no ícone de ajuda → "ID do cliente"</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Nome da integração</label>
              <input
                type="text"
                placeholder="Ex: Google Ads — Cliente XYZ"
                value={setupForm.name}
                onChange={(e) => setSetupForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
            </div>
            {setupError && <p className="text-xs text-red-500">{setupError}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  api(`/ads-integrations/platforms/${setupId}`, { method: 'DELETE' }).catch(() => {})
                  setSetupId(null)
                  window.history.replaceState({}, '', '/integrations')
                }}
                className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text"
              >
                Cancelar
              </button>
              <button
                onClick={() => completeSetup.mutate()}
                disabled={!setupForm.name || !setupForm.customerId || completeSetup.isPending}
                className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50"
              >
                {completeSetup.isPending ? 'Salvando...' : 'Ativar integração'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

function GoogleSheetsIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" fill="#34A853"/>
    </svg>
  )
}

const LEAD_FIELD_LABELS: Record<string, string> = {
  name: 'Nome', email: 'E-mail', phone: 'Telefone', company: 'Empresa',
  status: 'Status', utmSource: 'UTM Source', utmMedium: 'UTM Medium',
  utmCampaign: 'UTM Campaign', utmContent: 'UTM Content', utmTerm: 'UTM Term',
  createdAt: 'Data de criação',
}

const DEFAULT_FIELD_MAPPING: Record<string, string> = {
  name: 'A', email: 'B', phone: 'C', company: 'D',
  status: 'E', utmSource: 'F', utmMedium: 'G', utmCampaign: 'H',
  utmContent: '', utmTerm: '', createdAt: 'I',
}

function GoogleSheetsSection({ onGoogleSetup }: { onGoogleSetup?: string | null }) {
  const queryClient = useQueryClient()
  const [setupId, setSetupId] = useState<string | null>(null)
  useEffect(() => { if (onGoogleSetup) setSetupId(onGoogleSetup) }, [onGoogleSetup])
  const [setupForm, setSetupForm] = useState({ name: '', spreadsheetUrl: '', sheetName: '' })
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(DEFAULT_FIELD_MAPPING)
  const [showMapping, setShowMapping] = useState(false)
  const [sheetTabs, setSheetTabs] = useState<{ id: number; title: string }[]>([])
  const [loadingTabs, setLoadingTabs] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [connectingGoogle, setConnectingGoogle] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['google-sheets'],
    queryFn: () => api<GSheet[]>('/google-sheets'),
  })
  const sheets: GSheet[] = data?.data ?? []
  const activeSheets = sheets.filter((s) => s.status === 'active')

  // When setup modal opens, pre-fill name from pending record
  useEffect(() => {
    if (setupId) {
      const pending = sheets.find((s) => s.id === setupId)
      if (pending) setSetupForm(f => ({ ...f, name: pending.googleEmail ? `Leads — ${pending.googleEmail.split('@')[0]}` : '' }))
    }
  }, [setupId, sheets])

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true)
    try {
      const res = await api<{ url: string }>('/auth/google/url')
      window.location.href = res.data.url
    } catch (e: any) {
      setConnectingGoogle(false)
    }
  }

  // Extract spreadsheet ID from URL or raw ID
  function extractSpreadsheetId(input: string): string {
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1]! : input.trim()
  }

  const handleUrlBlur = async () => {
    if (!setupId || !setupForm.spreadsheetUrl) return
    const spreadsheetId = extractSpreadsheetId(setupForm.spreadsheetUrl)
    setLoadingTabs(true)
    setSetupError('')
    try {
      const res = await api<{ title: string; sheets: { id: number; title: string }[] }>(
        `/auth/google/spreadsheet-meta?spreadsheetId=${spreadsheetId}&integrationId=${setupId}`
      )
      setSheetTabs(res.data.sheets)
      setSetupForm(f => ({
        ...f,
        sheetName: res.data.sheets[0]?.title ?? 'Sheet1',
        name: f.name || res.data.title,
      }))
    } catch (e: any) {
      setSetupError(e.message ?? 'Não foi possível acessar a planilha')
      setSheetTabs([])
    } finally {
      setLoadingTabs(false)
    }
  }

  const completeSetup = useMutation({
    mutationFn: () => {
      const spreadsheetId = extractSpreadsheetId(setupForm.spreadsheetUrl)
      // Only include fields that have a column assigned
      const activeMapping = Object.fromEntries(
        Object.entries(fieldMapping).filter(([, col]) => col.trim() !== '')
      )
      return api(`/google-sheets/${setupId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: setupForm.name,
          spreadsheetId,
          sheetName: setupForm.sheetName,
          spreadsheetTitle: setupForm.name,
          fieldMapping: activeMapping,
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sheets'] })
      setSetupId(null)
      setSetupForm({ name: '', spreadsheetUrl: '', sheetName: '' })
      setFieldMapping(DEFAULT_FIELD_MAPPING)
      setShowMapping(false)
      setSheetTabs([])
      setSetupError('')
      window.history.replaceState({}, '', '/integrations')
    },
    onError: (e: any) => setSetupError(e.message ?? 'Erro ao salvar'),
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
          <p className="text-xs text-orf-text-3 mt-0.5">Exporte leads para uma planilha automaticamente</p>
        </div>
      </div>

      {/* Connect card */}
      <div className="bg-orf-surface border border-orf-border rounded-orf p-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-orf-sm bg-white border border-orf-border flex items-center justify-center shrink-0">
            <GoogleSheetsIcon />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-orf-text">Google Sheets</p>
            <p className="text-xs text-orf-text-2">Conecte sua conta Google e escolha qual planilha receber os leads</p>
          </div>
          <button
            onClick={handleConnectGoogle}
            disabled={connectingGoogle}
            className="px-4 py-2 bg-white border border-orf-border text-orf-text rounded-orf-sm text-xs font-medium hover:bg-orf-surface-2 disabled:opacity-60 transition-colors whitespace-nowrap flex items-center gap-2"
          >
            {connectingGoogle ? 'Redirecionando...' : '+ Conectar Google'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`text-xs px-3 py-2 rounded-orf-sm border ${syncMsg.startsWith('Erro') ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'}`}>
          {syncMsg}
        </div>
      )}

      {isLoading ? (
        <div className="py-4 text-center text-sm text-orf-text-2">Carregando...</div>
      ) : activeSheets.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {activeSheets.map((s) => (
            <div key={s.id} className="bg-orf-surface border border-orf-border rounded-orf p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-orf-text truncate">{s.spreadsheetTitle || s.name}</p>
                  {s.googleEmail && <p className="text-xs text-orf-text-3 mt-0.5">{s.googleEmail}</p>}
                  <p className="text-xs text-orf-text-3">Aba: {s.sheetName}</p>
                  {s.lastSyncAt && <p className="text-xs text-orf-text-3">Sync: {new Date(s.lastSyncAt).toLocaleString('pt-BR')}</p>}
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 shrink-0 ml-2">Ativo</span>
              </div>
              <div className="flex items-center gap-3 border-t border-orf-border pt-3">
                <button onClick={() => sync(s.id)} disabled={syncingId === s.id} className="text-xs text-orf-primary hover:underline disabled:opacity-50">
                  {syncingId === s.id ? 'Sincronizando...' : 'Sincronizar leads'}
                </button>
                <button onClick={() => remove.mutate(s.id)} className="text-xs text-red-400 hover:text-red-600">Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Setup modal — shown after OAuth callback */}
      {setupId && (
        <Modal title="Configurar Google Sheets" onClose={() => {
          remove.mutate(setupId)
          setSetupId(null)
          window.history.replaceState({}, '', '/integrations')
        }}>
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-orf-sm p-3 text-xs text-emerald-700">
              ✓ Conta Google conectada. Agora selecione a planilha que receberá os leads.
            </div>
            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">URL ou ID da planilha</label>
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/... ou só o ID"
                value={setupForm.spreadsheetUrl}
                onChange={(e) => setSetupForm(f => ({ ...f, spreadsheetUrl: e.target.value }))}
                onBlur={handleUrlBlur}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
              {loadingTabs && <p className="text-xs text-orf-text-3 mt-1">Carregando abas...</p>}
            </div>
            {sheetTabs.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Aba de destino</label>
                <select
                  value={setupForm.sheetName}
                  onChange={(e) => setSetupForm(f => ({ ...f, sheetName: e.target.value }))}
                  className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text focus:outline-none focus:border-orf-primary"
                >
                  {sheetTabs.map((t) => <option key={t.id} value={t.title}>{t.title}</option>)}
                </select>
              </div>
            )}

            {/* Field mapping */}
            <div className="border border-orf-border rounded-orf-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMapping(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-orf-surface-2 text-xs font-medium text-orf-text-2 hover:text-orf-text transition-colors"
              >
                <span>Mapeamento de colunas</span>
                <span className="text-orf-text-3">{showMapping ? '▲' : '▼'} {Object.values(fieldMapping).filter(Boolean).length} campos ativos</span>
              </button>
              {showMapping && (
                <div className="p-3 space-y-1">
                  <p className="text-xs text-orf-text-3 mb-2">Defina qual coluna da planilha receberá cada campo. Deixe em branco para não exportar.</p>
                  <div className="grid grid-cols-[1fr_56px] gap-x-2 gap-y-1.5">
                    <span className="text-xs font-medium text-orf-text-3 uppercase tracking-wide">Campo</span>
                    <span className="text-xs font-medium text-orf-text-3 uppercase tracking-wide text-center">Col.</span>
                    {Object.entries(LEAD_FIELD_LABELS).map(([field, label]) => (
                      <>
                        <span key={`${field}-label`} className="text-xs text-orf-text py-1">{label}</span>
                        <input
                          key={`${field}-input`}
                          type="text"
                          maxLength={2}
                          placeholder="—"
                          value={fieldMapping[field] ?? ''}
                          onChange={(e) => setFieldMapping(m => ({ ...m, [field]: e.target.value.toUpperCase() }))}
                          className="w-full px-2 py-1 bg-orf-surface border border-orf-border rounded text-xs text-center text-orf-text font-mono uppercase focus:outline-none focus:border-orf-primary"
                        />
                      </>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-orf-text-2 mb-1.5">Nome da integração</label>
              <input
                type="text"
                placeholder="Ex: Leads Cliente XYZ"
                value={setupForm.name}
                onChange={(e) => setSetupForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 bg-orf-surface-2 border border-orf-border rounded-orf-sm text-sm text-orf-text placeholder:text-orf-text-3 focus:outline-none focus:border-orf-primary"
              />
            </div>
            {setupError && <p className="text-xs text-red-500">{setupError}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { remove.mutate(setupId); setSetupId(null); window.history.replaceState({}, '', '/integrations') }}
                className="flex-1 px-4 py-2 border border-orf-border rounded-orf-sm text-sm text-orf-text-2 hover:text-orf-text"
              >
                Cancelar
              </button>
              <button
                onClick={() => completeSetup.mutate()}
                disabled={!setupForm.name || !setupForm.spreadsheetUrl || completeSetup.isPending}
                className="flex-1 px-4 py-2 bg-orf-primary text-white rounded-orf-sm text-sm font-medium hover:bg-orf-primary/90 disabled:opacity-50"
              >
                {completeSetup.isPending ? 'Salvando...' : 'Salvar integração'}
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
  const googleSetup = searchParams.get('google_setup')
  const googleAdsSetup = searchParams.get('google_ads_setup')
  const [showPlatformModal, setShowPlatformModal] = useState(false)
  const [showCrmModal, setShowCrmModal] = useState(false)
  const [showSelectionModal, setShowSelectionModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [platformForm, setPlatformForm] = useState({ platform: 'google' as AdsPlatform, name: '', accountId: '' })
  const [crmForm, setCrmForm] = useState({ platform: 'rd_station' as CrmPlatform, name: '' })
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [connectingMeta, setConnectingMeta] = useState(false)
  const [connectingGoogleAds, setConnectingGoogleAds] = useState(false)
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
    } else if (metaError === 'google_denied') {
      setToast({ type: 'error', message: 'Autorização com Google foi cancelada.' })
      window.history.replaceState({}, '', '/integrations')
    } else if (metaError === 'google_token_failed') {
      setToast({ type: 'error', message: 'Falha ao conectar com Google. Tente novamente.' })
      window.history.replaceState({}, '', '/integrations')
    } else if (metaError === 'google_ads_denied') {
      setToast({ type: 'error', message: 'Autorização com Google Ads foi cancelada.' })
      window.history.replaceState({}, '', '/integrations')
    } else if (metaError === 'google_ads_token_failed') {
      setToast({ type: 'error', message: 'Falha ao conectar com Google Ads. Tente novamente.' })
      window.history.replaceState({}, '', '/integrations')
    } else if (metaError === 'google_ads_state_invalid') {
      setToast({ type: 'error', message: 'Estado OAuth inválido. Tente conectar novamente.' })
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

  const handleConnectGoogleAds = async () => {
    setConnectingGoogleAds(true)
    try {
      const res = await api<{ url: string }>('/auth/google-ads/url')
      window.location.href = res.data.url
    } catch (e: any) {
      setToast({ type: 'error', message: e.message ?? 'Erro ao iniciar conexão com Google Ads' })
      setConnectingGoogleAds(false)
    }
  }

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
      setToast({ type: 'success', message: 'Sincronização Meta concluída.' })
    },
    onError: (e: any) => setToast({ type: 'error', message: e.message ?? 'Erro ao sincronizar' }),
  })

  const syncGoogleAds = useMutation({
    mutationFn: (id: string) => api(`/auth/google-ads/sync/${id}`, { method: 'POST' }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['ads-platforms'] })
      const d = res?.data ?? {}
      setToast({ type: 'success', message: `Google Ads: ${(d.impressions ?? 0).toLocaleString('pt-BR')} impr. · ${(d.clicks ?? 0).toLocaleString('pt-BR')} cliques · R$ ${(d.spend ?? 0).toFixed(2)}` })
    },
    onError: (e: any) => setToast({ type: 'error', message: e.message ?? 'Erro ao sincronizar Google Ads' }),
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

      {/* Quick Connect */}
      <section className="bg-orf-surface border border-orf-border rounded-orf p-5">
        <h2 className="text-sm font-semibold text-orf-text mb-4">Conexão Rápida</h2>
        <div className="space-y-4">
          {/* Meta */}
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

          <div className="border-t border-orf-border" />

          {/* Google Ads */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-orf-sm bg-white border border-orf-border flex items-center justify-center shrink-0">
                <GoogleAdsIcon />
              </div>
              <div>
                <p className="text-sm font-medium text-orf-text">Google Ads</p>
                <p className="text-xs text-orf-text-2">Visualize métricas de campanhas — impressões, cliques, gasto, CTR, CPC e CPM</p>
              </div>
            </div>
            <button
              onClick={handleConnectGoogleAds}
              disabled={connectingGoogleAds}
              className="px-4 py-2 bg-white border border-orf-border text-orf-text rounded-orf-sm text-xs font-medium hover:bg-orf-surface-2 disabled:opacity-60 transition-colors whitespace-nowrap flex items-center gap-2"
            >
              {connectingGoogleAds ? 'Redirecionando...' : '+ Conectar Google Ads'}
            </button>
          </div>
        </div>
      </section>

      <GoogleAdsSection onGoogleAdsSetup={googleAdsSetup} />

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
                      {syncPlatform.isPending ? 'Sync...' : 'Sync'}
                    </button>
                  )}
                  {p.platform === 'google' && (
                    <button
                      onClick={() => syncGoogleAds.mutate(p.id)}
                      disabled={syncGoogleAds.isPending}
                      className="text-xs text-orf-primary hover:text-orf-primary/80 transition-colors"
                    >
                      {syncGoogleAds.isPending ? 'Sync...' : 'Sync'}
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
      <GoogleSheetsSection onGoogleSetup={googleSetup} />

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
