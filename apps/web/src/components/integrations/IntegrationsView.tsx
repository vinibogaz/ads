'use client'

import { useState } from 'react'

interface Integration {
  id: string
  name: string
  description: string
  category: string
  status: 'available' | 'coming_soon' | 'connected'
  icon: React.ReactNode
  color: string
}

const integrations: Integration[] = [
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Publique artigos diretamente no seu site WordPress via API REST',
    category: 'CMS',
    status: 'available',
    color: '#21759b',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
        <path d="M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.54.82-2.771.82-3.864 0-.405-.026-.78-.07-1.11m-7.981.105c.647-.03 1.232-.105 1.232-.105.582-.075.514-.93-.067-.899 0 0-1.755.135-2.88.135-1.064 0-2.85-.15-2.85-.15-.585-.03-.661.855-.075.885 0 0 .54.075 1.125.105l1.68 4.605-2.37 7.08L5.354 6.9c.649-.03 1.234-.1 1.234-.1.585-.075.516-.93-.065-.896 0 0-1.746.138-2.874.138-.201 0-.438-.008-.691-.015C4.911 3.15 8.235 1.215 12 1.215c2.809 0 5.365 1.072 7.286 2.833-.046-.003-.091-.009-.141-.009-1.06 0-1.812.923-1.812 1.914 0 .89.513 1.643 1.06 2.531.411.72.89 1.643.89 2.977 0 .915-.354 1.994-.821 3.479l-1.075 3.585-3.9-11.61zM12 22.784c-1.059 0-2.08-.153-3.048-.437l3.237-9.406 3.315 9.087c.024.053.05.101.078.149A10.707 10.707 0 0112 22.784M1.211 12c0-1.564.336-3.05.935-4.39L7.29 21.709C3.694 19.96 1.212 16.271 1.212 12M12 0C5.385 0 0 5.385 0 12s5.385 12 12 12 12-5.385 12-12S18.615 0 12 0" />
      </svg>
    ),
  },
  {
    id: 'gsc',
    name: 'Google Search Console',
    description: 'Importe dados de performance, impressões e CTR das suas páginas',
    category: 'SEO',
    status: 'coming_soon',
    color: '#4285F4',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'Conecte métricas de tráfego e conversão ao seu dashboard',
    category: 'Analytics',
    status: 'coming_soon',
    color: '#E37400',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#E37400">
        <path d="M22.84 2.998C22.84 1.342 21.497 0 19.84 0c-1.656 0-2.999 1.342-2.999 2.998v18.004C16.841 22.658 18.184 24 19.84 24c1.657 0 3-1.342 3-2.998V2.998zM13.5 8.998C13.5 7.342 12.157 6 10.5 6 8.843 6 7.5 7.342 7.5 8.998v12.004C7.5 22.658 8.843 24 10.5 24c1.657 0 3-1.342 3-2.998V8.998zM4.16 17C2.503 17 1.16 18.342 1.16 20c0 1.657 1.343 3 3 3 1.656 0 3-1.343 3-3 0-1.658-1.344-3-3-3z"/>
      </svg>
    ),
  },
  {
    id: 'semrush',
    name: 'Semrush',
    description: 'Importe pesquisa de keywords, análise de concorrentes e backllinks',
    category: 'SEO',
    status: 'coming_soon',
    color: '#FF642D',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#FF642D]">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 7.428l-1.87 8.312-3.354-4.738-4.054 4.738-1.406-8.312h2.19l.686 4.364 3.116-3.828 2.866 3.828.758-4.364h2.068z"/>
      </svg>
    ),
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    description: 'Integre campanhas do Facebook e Instagram Ads com conteúdo gerado',
    category: 'Ads',
    status: 'coming_soon',
    color: '#0866FF',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#0866FF]">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Publique artigos e posts no LinkedIn diretamente da plataforma',
    category: 'Social',
    status: 'coming_soon',
    color: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#0A66C2]">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automatize fluxos com mais de 5.000 apps via Zapier webhooks',
    category: 'Automação',
    status: 'coming_soon',
    color: '#FF4A00',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#FF4A00]">
        <path d="M20.937 10.497h-7.38l5.16-5.16a9.007 9.007 0 011.677 4.137c.092.33.543.33.543 1.023zm-9.424-9.48v7.381L6.352 3.24A9.007 9.007 0 0110.49 1.56c.33-.09.33-.543 1.023-.543zM3.237 5.208l5.16 5.16H1.017c.09-.33.03-.99.543-1.677l1.677-3.483zM1.56 13.51h7.381l-5.16 5.16A9.007 9.007 0 011.56 14.533c-.09-.33-.543-.33-.543-1.023h.543zM13.51 22.44v-7.381l5.16 5.16A9.007 9.007 0 0114.533 22.44c-.33.09-.33.543-1.023.543V22.44zM20.763 18.792l-5.16-5.16h7.381c-.09.33-.03.99-.543 1.677l-1.678 3.483z"/>
      </svg>
    ),
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Gere descrições de produtos e SEO para sua loja Shopify',
    category: 'E-commerce',
    status: 'coming_soon',
    color: '#95BF47',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#95BF47]">
        <path d="M15.337.009c-.047-.003-.093-.006-.14-.006C14.155.003 13.12.635 12.5 1.639c-.099.16-.194.34-.284.532-.74.178-1.48.553-2.226 1.124-.13-.54-.347-1.044-.664-1.44C8.861 1.188 8.11.808 7.208.808c-.063 0-.126.003-.19.008C5.782 1.059 4.6 2.56 3.993 4.602c-.027.09-.05.18-.072.271L2 5.503v.023l2.122 9.714L22 12.67V11.65L15.337.009zM10.5 3.562c.637-.465 1.281-.77 1.93-.882a7.74 7.74 0 00-.12.45C11.89 4.31 11.5 6.015 11.5 7.886v.083c-.83.219-1.623.569-2.375 1.044L10.5 3.562zM9.16 1.638c.386 0 .685.167.916.497.318.454.512 1.123.56 1.961L7.37 5.317c.5-2.071 1.342-3.35 1.79-3.679zm5.6 7.52c-2.22 1.45-5.116 1.578-7.77.367L5.386 5.737l2.118-.62c.002-.07.004-.14.007-.21L9.79 4.27l5.46-1.6.152.272 1.034 6.07-1.677.125z"/>
      </svg>
    ),
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  CMS: 'text-sx-primary bg-sx-primary/10',
  SEO: 'text-sx-success bg-sx-success/10',
  Analytics: 'text-sx-warning bg-sx-warning/10',
  Ads: 'text-sx-secondary bg-sx-secondary/10',
  Social: 'text-blue-400 bg-blue-400/10',
  Automação: 'text-orange-400 bg-orange-400/10',
  'E-commerce': 'text-green-400 bg-green-400/10',
}

export function IntegrationsView() {
  const [connecting, setConnecting] = useState<string | null>(null)

  const handleConnect = (id: string, status: string) => {
    if (status !== 'available') return
    setConnecting(id)
    setTimeout(() => setConnecting(null), 2000)
  }

  const categories = [...new Set(integrations.map(i => i.category))]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-sx-text">Integrações</h1>
        <p className="text-sx-text-2 mt-1 text-sm">Conecte suas ferramentas e amplifique o poder do Synthex</p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 p-4 rounded-sx-xl bg-sx-surface border border-sx-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sx-success animate-pulse" />
          <span className="text-sm text-sx-text">{integrations.filter(i => i.status === 'connected').length} conectadas</span>
        </div>
        <div className="w-px h-4 bg-sx-border" />
        <span className="text-sm text-sx-text-2">{integrations.length} disponíveis</span>
        <div className="flex-1" />
        <span className="text-xs text-sx-text-3">Mais integrações em breve →</span>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <div className="flex items-center gap-2 mb-4">
            <span className={`sx-badge text-xs ${CATEGORY_COLORS[cat] ?? 'sx-badge-primary'}`}>{cat}</span>
            <div className="flex-1 h-px bg-sx-border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.filter(i => i.category === cat).map(integration => (
              <div
                key={integration.id}
                className={`sx-card group transition-all duration-200 ${
                  integration.status === 'available'
                    ? 'hover:border-sx-primary/40 hover:shadow-sx-glow cursor-pointer'
                    : 'opacity-60'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-sx-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${integration.color}15` }}
                  >
                    {integration.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sx-text text-sm">{integration.name}</h3>
                      {integration.status === 'connected' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-sx-success" />
                      )}
                    </div>
                    <p className="text-xs text-sx-text-3 leading-relaxed">{integration.description}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {integration.status === 'connected' ? (
                    <span className="sx-badge sx-badge-success">Conectado</span>
                  ) : integration.status === 'coming_soon' ? (
                    <span className="sx-badge bg-sx-surface-2 text-sx-text-3">Em breve</span>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration.id, integration.status)}
                      disabled={connecting === integration.id}
                      className="sx-btn-secondary text-xs py-1.5 px-3 group-hover:border-sx-primary/60 group-hover:text-sx-primary transition-colors"
                    >
                      {connecting === integration.id ? 'Conectando...' : 'Conectar'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
