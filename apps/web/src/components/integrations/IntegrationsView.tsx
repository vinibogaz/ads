'use client'

import { useState, useEffect } from 'react'
import { apiRequest } from '@/lib/api'

interface Integration {
  id: string
  name: string
  description: string
  tooltip: string
  category: string
  status: 'available' | 'coming_soon'
  color: string
}

// Simple Icons slugs — https://cdn.simpleicons.org/[slug]/[hex-no-hash]
const SIMPLE_ICONS: Record<string, string> = {
  wordpress:   'wordpress',
  ghost:       'ghost',
  webflow:     'webflow',
  wix:         'wix',
  contentful:  'contentful',
  sanity:      'sanity',
  hubspot:     'hubspot',
  strapi:      'strapi',
  gsc:         'googlesearchconsole',
  semrush:     'semrush',
  ahrefs:      'ahrefs',
  bing:        'microsoftbing',
  ga4:         'googleanalytics',
  n8n:         'n8n',
  zapier:      'zapier',
  linkedin:    'linkedin',
  shopify:     'shopify',
  vtex:        'vtex',
}

function BrandLogo({ id, name, color }: { id: string; name: string; color: string }) {
  const [failed, setFailed] = useState(false)
  const slug = SIMPLE_ICONS[id]

  if (!slug || failed) {
    return (
      <span
        className="w-6 h-6 rounded text-white text-[11px] font-bold flex items-center justify-center select-none"
        style={{ background: color }}
      >
        {name[0]}
      </span>
    )
  }

  return (
    <img
      src={`https://cdn.simpleicons.org/${slug}/${color.replace('#', '')}`}
      alt={name}
      className="w-6 h-6 object-contain"
      onError={() => setFailed(true)}
    />
  )
}

const integrations: Integration[] = [
  // CMS
  { id: 'wordpress',  name: 'WordPress',   color: '#21759B', category: 'CMS',       status: 'available',
    description: 'Publique artigos diretamente no seu site WordPress via API REST',
    tooltip: 'Necessário: URL do site + Application Password. Crie em: Usuários → Perfil → Application Passwords.' },
  { id: 'ghost',      name: 'Ghost CMS',   color: '#15171A', category: 'CMS',       status: 'available',
    description: 'Publique conteúdo diretamente no seu site Ghost via Content API',
    tooltip: 'Necessário: URL do Ghost + Staff API Key. Encontre em: Settings → Integrations → Add custom integration.' },
  { id: 'webflow',    name: 'Webflow',     color: '#4353FF', category: 'CMS',       status: 'available',
    description: 'Sincronize conteúdo com coleções CMS do Webflow via API',
    tooltip: 'Necessário: API Token + Site ID + Collection ID. Acesse: Settings → Integrations → API Access.' },
  { id: 'wix',        name: 'Wix',         color: '#FAAD00', category: 'CMS',       status: 'available',
    description: 'Publique e gerencie conteúdo no seu site Wix via Wix Headless API',
    tooltip: 'Necessário: API Key + Site ID. Acesse: Wix Dashboard → Settings → Advanced → API Keys.' },
  { id: 'contentful', name: 'Contentful',  color: '#2478CC', category: 'CMS',       status: 'available',
    description: 'Publique e atualize entradas no seu space Contentful via Content Management API',
    tooltip: 'Necessário: Space ID + Content Management Token. Acesse: Settings → API Keys → Content Management Tokens.' },
  { id: 'sanity',     name: 'Sanity',      color: '#F03E2F', category: 'CMS',       status: 'available',
    description: 'Crie e publique documentos no seu dataset Sanity via GROQ API',
    tooltip: 'Necessário: Project ID + Dataset + API Token (Editor ou superior). Acesse: sanity.io/manage → API → Tokens.' },
  { id: 'hubspot',    name: 'HubSpot CMS', color: '#FF7A59', category: 'CMS',       status: 'available',
    description: 'Crie e publique posts no blog HubSpot CMS via API',
    tooltip: 'Necessário: Private App Token com escopos content e cms. Acesse: Settings → Integrations → Private Apps.' },
  { id: 'strapi',     name: 'Strapi',      color: '#4945FF', category: 'CMS',       status: 'available',
    description: 'Publique conteúdo no seu CMS Strapi self-hosted ou Cloud via REST API',
    tooltip: 'Necessário: URL do Strapi + API Token com permissão de criação. Acesse: Settings → API Tokens.' },
  // SEO
  { id: 'gsc',        name: 'Google Search Console', color: '#4285F4', category: 'SEO', status: 'available',
    description: 'Importe dados de performance, impressões e CTR das suas páginas',
    tooltip: 'Necessário: Property URL do GSC. Após salvar, autorize o acesso OAuth na próxima etapa.' },
  { id: 'semrush',    name: 'Semrush',     color: '#FF642D', category: 'SEO',       status: 'available',
    description: 'Importe pesquisa de keywords, análise de concorrentes e backlinks',
    tooltip: 'Necessário: API Key do Semrush. Acesse: Account → API → Generate API Key. Plano Guru ou superior.' },
  { id: 'ahrefs',     name: 'Ahrefs',      color: '#1E90FF', category: 'SEO',       status: 'available',
    description: 'Monitore backlinks, autoridade de domínio e oportunidades de keywords',
    tooltip: 'Necessário: API Token do Ahrefs. Acesse: Settings → API → Generate token. Plano Standard ou superior.' },
  { id: 'bing',       name: 'Bing Search Console', color: '#008373', category: 'SEO', status: 'available',
    description: 'Monitore visibilidade, indexação e palavras-chave no Bing e DuckDuckGo',
    tooltip: 'Necessário: Webmaster API Key. Acesse: bing.com/webmasters → Settings → API Access.' },
  // Analytics
  { id: 'ga4',        name: 'Google Analytics 4', color: '#E37400', category: 'Analytics', status: 'available',
    description: 'Conecte métricas de tráfego e conversão ao seu dashboard GEO',
    tooltip: 'Necessário: Property ID + Measurement ID + API Secret. Acesse: GA4 → Admin → Data Streams → Measurement Protocol API secrets.' },
  // Automação
  { id: 'n8n',        name: 'n8n',         color: '#EA4B71', category: 'Automação', status: 'available',
    description: 'Automatize fluxos com o n8n self-hosted via webhooks e nós nativos',
    tooltip: 'Necessário: URL do webhook n8n. Crie um fluxo com nó Webhook e copie a URL de produção.' },
  { id: 'zapier',     name: 'Zapier',      color: '#FF4A00', category: 'Automação', status: 'available',
    description: 'Automatize fluxos com mais de 5.000 apps via Zapier webhooks',
    tooltip: 'Necessário: URL do Webhooks by Zapier. Crie um Zap → Trigger "Webhooks by Zapier" → Catch Hook.' },
  // Social
  { id: 'linkedin',   name: 'LinkedIn',    color: '#0A66C2', category: 'Social',    status: 'available',
    description: 'Publique artigos e posts no LinkedIn diretamente da plataforma',
    tooltip: 'Necessário: Access Token OAuth com permissões w_member_social e r_liteprofile.' },
  // E-commerce
  { id: 'shopify',    name: 'Shopify',     color: '#95BF47', category: 'E-commerce', status: 'available',
    description: 'Gere descrições de produtos e SEO para sua loja Shopify',
    tooltip: 'Necessário: Admin API Token + domínio da loja. Acesse: Apps → Develop apps → Create an app → Admin API.' },
  { id: 'vtex',       name: 'VTEX',        color: '#F71963', category: 'E-commerce', status: 'available',
    description: 'Otimize descrições de produtos e conteúdo da sua loja VTEX para IAs',
    tooltip: 'Necessário: Account Name + App Key + App Token. Acesse: Account Settings → Account → App Keys.' },
  { id: 'nuvemshop',  name: 'Nuvemshop',  color: '#1C79C0', category: 'E-commerce', status: 'available',
    description: 'Publique e otimize conteúdo na sua loja Nuvemshop para buscas em IAs',
    tooltip: 'Necessário: User ID + Access Token. Acesse: Aplicativos → Criar app → Instalar.' },
  { id: 'tray',       name: 'Tray Commerce', color: '#E8430D', category: 'E-commerce', status: 'available',
    description: 'Gerencie descrições e SEO de produtos na sua loja Tray via API',
    tooltip: 'Necessário: URL da loja + Consumer Key + Consumer Secret. Acesse: Painel Tray → Configurações → API.' },
]

const CATEGORY_COLORS: Record<string, string> = {
  CMS:         'text-orf-primary bg-orf-primary/10',
  SEO:         'text-orf-success bg-orf-success/10',
  Analytics:   'text-orf-warning bg-orf-warning/10',
  Social:      'text-blue-400 bg-blue-400/10',
  Automação:   'text-orange-400 bg-orange-400/10',
  'E-commerce':'text-green-400 bg-green-400/10',
}

const WEBHOOK_INTEGRATIONS = new Set(['zapier', 'n8n'])

type ConfigField = { key: string; label: string; placeholder: string; type?: string }

const API_CONFIG_FIELDS: Record<string, ConfigField[]> = {
  webflow:    [{ key: 'apiToken', label: 'API Token', placeholder: 'Token do Webflow' }, { key: 'siteId', label: 'Site ID', placeholder: 'ID do site Webflow' }, { key: 'collectionId', label: 'Collection ID', placeholder: 'ID da coleção CMS' }],
  wix:        [{ key: 'apiKey', label: 'API Key', placeholder: 'API Key do Wix' }, { key: 'siteId', label: 'Site ID', placeholder: 'ID do site Wix' }],
  shopify:    [{ key: 'adminToken', label: 'Admin API Token', placeholder: 'shpat_xxxxxxxxxxxxxx' }, { key: 'shopDomain', label: 'Domínio da loja', placeholder: 'minhaloja.myshopify.com' }],
  gsc:        [{ key: 'propertyUrl', label: 'Property URL', placeholder: 'https://seusite.com.br' }],
  semrush:    [{ key: 'apiKey', label: 'API Key', placeholder: 'API Key do Semrush' }],
  ahrefs:     [{ key: 'apiToken', label: 'API Token', placeholder: 'Token do Ahrefs' }],
  bing:       [{ key: 'apiKey', label: 'Webmaster API Key', placeholder: 'API Key do Bing Webmaster' }, { key: 'siteUrl', label: 'URL do site', placeholder: 'https://seusite.com.br' }],
  wordpress:  [{ key: 'siteUrl', label: 'URL do site', placeholder: 'https://meusite.com.br' }, { key: 'username', label: 'Usuário', placeholder: 'seu-usuario-wp' }, { key: 'appPassword', label: 'Application Password', placeholder: 'xxxx xxxx xxxx xxxx xxxx xxxx' }],
  ghost:      [{ key: 'siteUrl', label: 'URL do Ghost', placeholder: 'https://meusite.ghost.io' }, { key: 'staffApiKey', label: 'Staff API Key', placeholder: 'Chave de integração Staff' }],
  linkedin:   [{ key: 'accessToken', label: 'Access Token', placeholder: 'Token OAuth do LinkedIn' }],
  contentful: [{ key: 'spaceId', label: 'Space ID', placeholder: 'ID do Space Contentful' }, { key: 'environment', label: 'Environment', placeholder: 'master' }, { key: 'accessToken', label: 'Content Management Token', placeholder: 'Token com permissão de escrita' }],
  sanity:     [{ key: 'projectId', label: 'Project ID', placeholder: 'ID do projeto Sanity' }, { key: 'dataset', label: 'Dataset', placeholder: 'production' }, { key: 'apiToken', label: 'API Token', placeholder: 'Token Editor ou superior' }],
  hubspot:    [{ key: 'privateAppToken', label: 'Private App Token', placeholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }],
  strapi:     [{ key: 'baseUrl', label: 'URL do Strapi', placeholder: 'https://meu-strapi.com' }, { key: 'apiToken', label: 'API Token', placeholder: 'Token com permissão de criação' }],
  vtex:       [{ key: 'accountName', label: 'Account Name', placeholder: 'minhaloja' }, { key: 'appKey', label: 'App Key', placeholder: 'vtexappkey-minhaloja-XXXXXX' }, { key: 'appToken', label: 'App Token', placeholder: 'Token de acesso VTEX', type: 'password' }],
  nuvemshop:  [{ key: 'userId', label: 'User ID', placeholder: 'ID numérico da loja' }, { key: 'accessToken', label: 'Access Token', placeholder: 'Token de acesso Nuvemshop' }],
  tray:       [{ key: 'storeUrl', label: 'URL da loja', placeholder: 'minhaloja.commercesuite.com.br' }, { key: 'consumerKey', label: 'Consumer Key', placeholder: 'Consumer Key da API' }, { key: 'consumerSecret', label: 'Consumer Secret', placeholder: 'Consumer Secret da API', type: 'password' }],
  ga4:        [{ key: 'propertyId', label: 'Property ID', placeholder: '123456789' }, { key: 'measurementId', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX' }, { key: 'apiSecret', label: 'API Secret', placeholder: 'Secret do Measurement Protocol', type: 'password' }],
}

export function IntegrationsView() {
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [connecting, setConnecting] = useState<string | null>(null)
  const [webhookConfig, setWebhookConfig] = useState<Record<string, string>>({})
  const [webhookOpen, setWebhookOpen] = useState<string | null>(null)
  const [apiConfigOpen, setApiConfigOpen] = useState<string | null>(null)
  const [apiConfigValues, setApiConfigValues] = useState<Record<string, Record<string, string>>>({})
  const [apiConfigError, setApiConfigError] = useState<Record<string, string>>({})

  useEffect(() => {
    apiRequest<Array<{ type: string }>>('/integrations')
      .then(({ data }) => setConnected(new Set((data ?? []).map(i => i.type))))
      .catch(() => {})
  }, [])

  const handleConnect = (id: string, status: string) => {
    if (status !== 'available') return
    if (WEBHOOK_INTEGRATIONS.has(id)) { setWebhookOpen(o => o === id ? null : id); return }
    if (API_CONFIG_FIELDS[id]) { setApiConfigOpen(o => o === id ? null : id); setApiConfigError(e => ({ ...e, [id]: '' })); return }
    setConnecting(id)
    setTimeout(() => setConnecting(null), 2000)
  }

  const handleSaveWebhook = async (id: string) => {
    const url = webhookConfig[id]?.trim()
    if (!url) return
    try {
      await apiRequest(`/integrations/${id}/connect`, { method: 'POST', body: JSON.stringify({ webhookUrl: url }) })
      setConnected(s => new Set([...s, id]))
      setWebhookOpen(null)
    } catch { /* user can retry */ }
  }

  const handleSaveApiConfig = async (id: string) => {
    const values = apiConfigValues[id] ?? {}
    const fields = API_CONFIG_FIELDS[id] ?? []
    const missing = fields.find(f => !values[f.key]?.trim())
    if (missing) { setApiConfigError(e => ({ ...e, [id]: `Preencha o campo: ${missing.label}` })); return }
    try {
      await apiRequest(`/integrations/${id}/connect`, { method: 'POST', body: JSON.stringify(values) })
      setConnected(s => new Set([...s, id]))
      setApiConfigOpen(null)
      setApiConfigError(e => ({ ...e, [id]: '' }))
    } catch {
      setApiConfigError(e => ({ ...e, [id]: 'Erro ao salvar. Verifique as credenciais e tente novamente.' }))
    }
  }

  const handleDisconnect = async (id: string) => {
    await apiRequest(`/integrations/${id}`, { method: 'DELETE' }).catch(() => {})
    setConnected(s => { const n = new Set(s); n.delete(id); return n })
    setWebhookOpen(null)
    setApiConfigOpen(null)
  }

  const categories = [...new Set(integrations.map(i => i.category))]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-orf-text">Integrações</h1>
        <p className="text-orf-text-2 mt-1 text-sm">Conecte suas ferramentas e amplifique o poder do ORFFIA</p>
      </div>

      <div className="flex items-center gap-6 p-4 rounded-orf-xl bg-orf-surface border border-orf-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orf-success animate-pulse" />
          <span className="text-sm text-orf-text">{connected.size} conectadas</span>
        </div>
        <div className="w-px h-4 bg-orf-border" />
        <span className="text-sm text-orf-text-2">{integrations.filter(i => i.status === 'available').length} disponíveis</span>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`orf-badge text-xs ${CATEGORY_COLORS[cat] ?? 'orf-badge-primary'}`}>{cat}</span>
            <div className="flex-1 h-px bg-orf-border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.filter(i => i.category === cat).map(integration => {
              const isSaved = connected.has(integration.id)
              const isWebhookOpen = webhookOpen === integration.id
              const isApiConfigOpen = apiConfigOpen === integration.id
              const configFields = API_CONFIG_FIELDS[integration.id] ?? []

              return (
                <div
                  key={integration.id}
                  className={`orf-card group transition-all duration-200 ${
                    integration.status === 'available'
                      ? 'hover:border-orf-primary/40 hover:shadow-orf-glow'
                      : 'opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-orf-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${integration.color}18` }}
                    >
                      <BrandLogo id={integration.id} name={integration.name} color={integration.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-orf-text text-sm">{integration.name}</h3>
                        {isSaved && <span className="w-1.5 h-1.5 rounded-full bg-orf-success" />}
                        <div className="relative ml-auto group/tip shrink-0">
                          <button
                            className="w-4 h-4 rounded-full bg-orf-surface-2 border border-orf-border text-orf-text-3 text-[10px] font-bold flex items-center justify-center hover:border-orf-primary/60 hover:text-orf-primary transition-colors"
                            aria-label={`Como usar: ${integration.name}`}
                          >?</button>
                          <div className="absolute right-0 top-5 z-20 hidden group-hover/tip:block w-60 p-2.5 bg-orf-surface border border-orf-border rounded-orf-sm shadow-orf text-xs text-orf-text-2 leading-relaxed pointer-events-none">
                            {integration.tooltip}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-orf-text-3 leading-relaxed">{integration.description}</p>
                    </div>
                  </div>

                  {isWebhookOpen && (
                    <div className="mt-3 pt-3 border-t border-orf-border space-y-2">
                      <label className="text-xs text-orf-text-2 font-medium">URL do Webhook</label>
                      <input
                        className="orf-input text-xs"
                        placeholder="https://hooks.zapier.com/..."
                        value={webhookConfig[integration.id] ?? ''}
                        onChange={e => setWebhookConfig(c => ({ ...c, [integration.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveWebhook(integration.id)} className="orf-btn-primary text-xs py-1.5 px-3 flex-1">Salvar</button>
                        <button onClick={() => setWebhookOpen(null)} className="orf-btn-ghost text-xs py-1.5 px-3">Cancelar</button>
                      </div>
                    </div>
                  )}

                  {isApiConfigOpen && configFields.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-orf-border space-y-2.5">
                      {configFields.map(field => (
                        <div key={field.key}>
                          <label className="text-xs text-orf-text-2 font-medium block mb-1">{field.label}</label>
                          <input
                            className="orf-input text-xs"
                            placeholder={field.placeholder}
                            type={field.type ?? 'text'}
                            value={apiConfigValues[integration.id]?.[field.key] ?? ''}
                            onChange={e => setApiConfigValues(c => ({
                              ...c,
                              [integration.id]: { ...(c[integration.id] ?? {}), [field.key]: e.target.value },
                            }))}
                          />
                        </div>
                      ))}
                      {apiConfigError[integration.id] && (
                        <p className="text-xs text-orf-error">{apiConfigError[integration.id]}</p>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveApiConfig(integration.id)} className="orf-btn-primary text-xs py-1.5 px-3 flex-1">Salvar</button>
                        <button onClick={() => setApiConfigOpen(null)} className="orf-btn-ghost text-xs py-1.5 px-3">Cancelar</button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    {isSaved ? (
                      <div className="flex items-center gap-2">
                        <span className="orf-badge orf-badge-success">Conectado</span>
                        <button onClick={() => handleDisconnect(integration.id)} className="text-xs text-orf-text-3 hover:text-orf-error transition-colors">Desconectar</button>
                      </div>
                    ) : integration.status === 'coming_soon' ? (
                      <span className="orf-badge bg-orf-surface-2 text-orf-text-3">Em breve</span>
                    ) : (
                      <button
                        onClick={() => handleConnect(integration.id, integration.status)}
                        disabled={connecting === integration.id}
                        className="orf-btn-secondary text-xs py-1.5 px-3 group-hover:border-orf-primary/60 group-hover:text-orf-primary transition-colors"
                      >
                        {connecting === integration.id ? 'Conectando...' : (isWebhookOpen || isApiConfigOpen) ? 'Configurando...' : 'Conectar'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
