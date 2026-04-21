'use client'

import { useState, useEffect } from 'react'
import { apiRequest } from '@/lib/api'

interface Integration {
  id: string
  name: string
  description: string
  tooltip: string
  category: string
  status: 'available' | 'coming_soon' | 'connected'
  icon: React.ReactNode
  color: string
}

const integrations: Integration[] = [
  // CMS
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Publique artigos diretamente no seu site WordPress via API REST',
    tooltip: 'Necessário: URL do site WordPress + Application Password. Crie em: Usuários → Perfil → Application Passwords.',
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
    id: 'ghost',
    name: 'Ghost CMS',
    description: 'Publique conteúdo diretamente no seu site Ghost via Content API',
    tooltip: 'Necessário: URL do Ghost + Staff API Key. Encontre em: Settings → Integrations → Add custom integration.',
    category: 'CMS',
    status: 'available',
    color: '#15171A',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.57c2.974 0 5.51 1.638 6.89 4.067H5.11C6.49 6.208 9.026 4.57 12 4.57zm0 14.86A7.432 7.432 0 016.048 16.5h11.904A7.432 7.432 0 0112 19.43zm8.447-5.357H3.553a8.452 8.452 0 010-4.147h16.894a8.452 8.452 0 010 4.147z"/>
      </svg>
    ),
  },
  {
    id: 'webflow',
    name: 'Webflow',
    description: 'Sincronize conteúdo com coleções CMS do Webflow via API',
    tooltip: 'Necessário: API Token do Webflow + Site ID + Collection ID. Acesse: Settings → Integrations → API Access.',
    category: 'CMS',
    status: 'available',
    color: '#4353FF',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#4353FF]">
        <path d="M17.83 7.17L13.1 19.8l-2.97-7.04-1.22 3.08L6.76 7.17H0l6.17 9.65 2.21-5.58 2.15 5.1L14.19 5.6l.85 2.13H24l-6.17 9.65V7.17z"/>
      </svg>
    ),
  },
  {
    id: 'wix',
    name: 'Wix',
    description: 'Publique e gerencie conteúdo no seu site Wix via Wix Headless API',
    tooltip: 'Necessário: API Key do Wix + Site ID. Acesse: Wix Dashboard → Settings → Advanced → API Keys → Generate API Key.',
    category: 'CMS',
    status: 'available',
    color: '#FAAD00',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FAAD00">
        <path d="M10.5 3.5L8 10 5.5 3.5H3L7 14h2l2.5-6.5L14 14h2l4-10.5h-2.5L15 10l-2.5-6.5z"/>
      </svg>
    ),
  },
  {
    id: 'contentful',
    name: 'Contentful',
    description: 'Publique e atualize entradas no seu space Contentful via Content Management API',
    tooltip: 'Necessário: Space ID + Content Management API Token. Acesse: Settings → API Keys → Content Management Tokens.',
    category: 'CMS',
    status: 'available',
    color: '#2478CC',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#2478CC">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.5 14.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11zm0-3a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm6-7a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
      </svg>
    ),
  },
  {
    id: 'sanity',
    name: 'Sanity',
    description: 'Crie e publique documentos no seu dataset Sanity via GROQ API',
    tooltip: 'Necessário: Project ID + Dataset + API Token (Editor ou superior). Acesse: sanity.io/manage → API → Tokens.',
    category: 'CMS',
    status: 'available',
    color: '#F03E2F',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#F03E2F">
        <path d="M5.5 6A3.5 3.5 0 019 2.5h6A3.5 3.5 0 0118.5 6v.5H20v3h-1.5V18A3.5 3.5 0 0115 21.5H9A3.5 3.5 0 015.5 18V9.5H4v-3h1.5V6zm3 0v.5h7V6A1.5 1.5 0 0015 4.5H9A1.5 1.5 0 007.5 6z"/>
      </svg>
    ),
  },
  {
    id: 'hubspot',
    name: 'HubSpot CMS',
    description: 'Crie e publique posts no blog HubSpot CMS via API',
    tooltip: 'Necessário: Private App Token com escopos content e cms. Acesse: Settings → Integrations → Private Apps → Create.',
    category: 'CMS',
    status: 'available',
    color: '#FF7A59',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#FF7A59">
        <path d="M18.164 7.93V5.084a2.198 2.198 0 10-2.196 0V7.93a6.242 6.242 0 00-2.99 1.616L5.764 4.9a2.438 2.438 0 10-.899 1.394l7.006 4.55a6.223 6.223 0 00-.845 3.122 6.26 6.26 0 001.328 3.845l-2.14 2.14a1.72 1.72 0 101.06 1.06l2.14-2.14A6.254 6.254 0 1018.164 7.93zm-5.1 8.585a3.56 3.56 0 110-7.121 3.56 3.56 0 010 7.121z"/>
      </svg>
    ),
  },
  {
    id: 'strapi',
    name: 'Strapi',
    description: 'Publique conteúdo no seu CMS Strapi self-hosted ou Cloud via REST API',
    tooltip: 'Necessário: URL do Strapi + API Token com permissão de criação. Acesse: Settings → API Tokens → Create new API Token.',
    category: 'CMS',
    status: 'available',
    color: '#4945FF',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#4945FF">
        <path d="M3 3h9v9H3zm9 9h9v9H12zM12 3h9v9h-4.5V7.5H12z"/>
      </svg>
    ),
  },
  // SEO
  {
    id: 'gsc',
    name: 'Google Search Console',
    description: 'Importe dados de performance, impressões e CTR das suas páginas',
    tooltip: 'Necessário: Property URL do GSC. Após salvar, autorize o acesso OAuth na próxima etapa.',
    category: 'SEO',
    status: 'available',
    color: '#4285F4',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'semrush',
    name: 'Semrush',
    description: 'Importe pesquisa de keywords, análise de concorrentes e backlinks',
    tooltip: 'Necessário: API Key do Semrush. Acesse: Account → API → Generate API Key. Plano Guru ou superior.',
    category: 'SEO',
    status: 'available',
    color: '#FF642D',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#FF642D]">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 7.428l-1.87 8.312-3.354-4.738-4.054 4.738-1.406-8.312h2.19l.686 4.364 3.116-3.828 2.866 3.828.758-4.364h2.068z"/>
      </svg>
    ),
  },
  {
    id: 'ahrefs',
    name: 'Ahrefs',
    description: 'Monitore backlinks, autoridade de domínio e oportunidades de keywords',
    tooltip: 'Necessário: API Token do Ahrefs. Acesse: Settings → API → Generate token. Plano Standard ou superior.',
    category: 'SEO',
    status: 'available',
    color: '#1E90FF',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#1E90FF]">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zM9.5 16.5L6 8h2.5l2 5.5 2-5.5H15l-3.5 8.5H9.5z"/>
      </svg>
    ),
  },
  {
    id: 'bing',
    name: 'Bing Search Console',
    description: 'Monitore visibilidade, indexação e palavras-chave no Bing e DuckDuckGo',
    tooltip: 'Necessário: Webmaster API Key do Bing. Acesse: bing.com/webmasters → Settings → API Access → Generate API Key.',
    category: 'SEO',
    status: 'available',
    color: '#008373',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#008373">
        <path d="M5 3v15.418L8.998 20.5l8.095-4.84-4.428-1.703 2.144-5.555L5 3zm0 0"/>
      </svg>
    ),
  },
  // Analytics
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'Conecte métricas de tráfego e conversão ao seu dashboard GEO',
    tooltip: 'Necessário: Property ID + Measurement ID + API Secret. Acesse: GA4 → Admin → Data Streams → seu stream → Measurement Protocol API secrets.',
    category: 'Analytics',
    status: 'available',
    color: '#E37400',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#E37400">
        <path d="M22.84 2.998C22.84 1.342 21.497 0 19.84 0c-1.656 0-2.999 1.342-2.999 2.998v18.004C16.841 22.658 18.184 24 19.84 24c1.657 0 3-1.342 3-2.998V2.998zM13.5 8.998C13.5 7.342 12.157 6 10.5 6 8.843 6 7.5 7.342 7.5 8.998v12.004C7.5 22.658 8.843 24 10.5 24c1.657 0 3-1.342 3-2.998V8.998zM4.16 17C2.503 17 1.16 18.342 1.16 20c0 1.657 1.343 3 3 3 1.656 0 3-1.343 3-3 0-1.658-1.344-3-3-3z"/>
      </svg>
    ),
  },
  // Automação
  {
    id: 'n8n',
    name: 'n8n',
    description: 'Automatize fluxos com o n8n self-hosted via webhooks e nós nativos',
    tooltip: 'Necessário: URL do webhook n8n (ex: https://seu-n8n.com/webhook/xxxxx). Crie um fluxo com nó Webhook e copie a URL de produção.',
    category: 'Automação',
    status: 'available',
    color: '#EA4B71',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#EA4B71]">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1 7h2v4h4v2h-4v4h-2v-4H7v-2h4V7z"/>
      </svg>
    ),
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automatize fluxos com mais de 5.000 apps via Zapier webhooks',
    tooltip: 'Necessário: URL do Webhooks by Zapier. Crie um Zap → Trigger "Webhooks by Zapier" → Catch Hook → copie a URL.',
    category: 'Automação',
    status: 'available',
    color: '#FF4A00',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#FF4A00]">
        <path d="M20.937 10.497h-7.38l5.16-5.16a9.007 9.007 0 011.677 4.137c.092.33.543.33.543 1.023zm-9.424-9.48v7.381L6.352 3.24A9.007 9.007 0 0110.49 1.56c.33-.09.33-.543 1.023-.543zM3.237 5.208l5.16 5.16H1.017c.09-.33.03-.99.543-1.677l1.677-3.483zM1.56 13.51h7.381l-5.16 5.16A9.007 9.007 0 011.56 14.533c-.09-.33-.543-.33-.543-1.023h.543zM13.51 22.44v-7.381l5.16 5.16A9.007 9.007 0 0114.533 22.44c-.33.09-.33.543-1.023.543V22.44zM20.763 18.792l-5.16-5.16h7.381c-.09.33-.03.99-.543 1.677l-1.678 3.483z"/>
      </svg>
    ),
  },
  // Social
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Publique artigos e posts no LinkedIn diretamente da plataforma',
    tooltip: 'Necessário: autorização OAuth com conta LinkedIn. Permissões: w_member_social, r_liteprofile.',
    category: 'Social',
    status: 'available',
    color: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#0A66C2]">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  // E-commerce
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Gere descrições de produtos e SEO para sua loja Shopify',
    tooltip: 'Necessário: Shopify Admin API Token + domínio da loja. Acesse: Apps → Develop apps → Create an app → Admin API.',
    category: 'E-commerce',
    status: 'available',
    color: '#95BF47',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#95BF47]">
        <path d="M15.337.009c-.047-.003-.093-.006-.14-.006C14.155.003 13.12.635 12.5 1.639c-.099.16-.194.34-.284.532-.74.178-1.48.553-2.226 1.124-.13-.54-.347-1.044-.664-1.44C8.861 1.188 8.11.808 7.208.808c-.063 0-.126.003-.19.008C5.782 1.059 4.6 2.56 3.993 4.602c-.027.09-.05.18-.072.271L2 5.503v.023l2.122 9.714L22 12.67V11.65L15.337.009z"/>
      </svg>
    ),
  },
  {
    id: 'vtex',
    name: 'VTEX',
    description: 'Otimize descrições de produtos e conteúdo da sua loja VTEX para IAs',
    tooltip: 'Necessário: Account Name + App Key + App Token. Acesse: Account Settings → Account → App Keys.',
    category: 'E-commerce',
    status: 'available',
    color: '#F71963',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#F71963">
        <path d="M2 5l4.5 14L12 8.5 17.5 19 22 5H2z"/>
      </svg>
    ),
  },
  {
    id: 'nuvemshop',
    name: 'Nuvemshop',
    description: 'Publique e otimize conteúdo na sua loja Nuvemshop para buscas em IAs',
    tooltip: 'Necessário: User ID + Access Token. Acesse: Aplicativos → Criar app → Instalar → copie o User ID e Access Token.',
    category: 'E-commerce',
    status: 'available',
    color: '#1C79C0',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#1C79C0">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
      </svg>
    ),
  },
  {
    id: 'tray',
    name: 'Tray Commerce',
    description: 'Gerencie descrições e SEO de produtos na sua loja Tray via API',
    tooltip: 'Necessário: URL da loja + Consumer Key + Consumer Secret. Acesse: Painel Tray → Configurações → API → Gerar credenciais.',
    category: 'E-commerce',
    status: 'available',
    color: '#E8430D',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#E8430D">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L20 8.5v7L12 19.5 4 15.5v-7l8-4z"/>
      </svg>
    ),
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  CMS: 'text-orf-primary bg-orf-primary/10',
  SEO: 'text-orf-success bg-orf-success/10',
  Analytics: 'text-orf-warning bg-orf-warning/10',
  Social: 'text-blue-400 bg-blue-400/10',
  Automação: 'text-orange-400 bg-orange-400/10',
  'E-commerce': 'text-green-400 bg-green-400/10',
}

const WEBHOOK_INTEGRATIONS = new Set(['zapier', 'n8n'])

type ConfigField = { key: string; label: string; placeholder: string; type?: string }

const API_CONFIG_FIELDS: Record<string, ConfigField[]> = {
  webflow: [
    { key: 'apiToken', label: 'API Token', placeholder: 'Token do Webflow' },
    { key: 'siteId', label: 'Site ID', placeholder: 'ID do site Webflow' },
    { key: 'collectionId', label: 'Collection ID', placeholder: 'ID da coleção CMS' },
  ],
  wix: [
    { key: 'apiKey', label: 'API Key', placeholder: 'API Key do Wix' },
    { key: 'siteId', label: 'Site ID', placeholder: 'ID do site Wix' },
  ],
  shopify: [
    { key: 'adminToken', label: 'Admin API Token', placeholder: 'shpat_xxxxxxxxxxxxxx' },
    { key: 'shopDomain', label: 'Domínio da loja', placeholder: 'minhaloja.myshopify.com' },
  ],
  gsc: [
    { key: 'propertyUrl', label: 'Property URL', placeholder: 'https://seusite.com.br' },
  ],
  semrush: [
    { key: 'apiKey', label: 'API Key', placeholder: 'API Key do Semrush' },
  ],
  ahrefs: [
    { key: 'apiToken', label: 'API Token', placeholder: 'Token do Ahrefs' },
  ],
  bing: [
    { key: 'apiKey', label: 'Webmaster API Key', placeholder: 'API Key do Bing Webmaster' },
    { key: 'siteUrl', label: 'URL do site', placeholder: 'https://seusite.com.br' },
  ],
  wordpress: [
    { key: 'siteUrl', label: 'URL do site', placeholder: 'https://meusite.com.br' },
    { key: 'username', label: 'Usuário', placeholder: 'seu-usuario-wp' },
    { key: 'appPassword', label: 'Application Password', placeholder: 'xxxx xxxx xxxx xxxx xxxx xxxx' },
  ],
  ghost: [
    { key: 'siteUrl', label: 'URL do Ghost', placeholder: 'https://meusite.ghost.io' },
    { key: 'staffApiKey', label: 'Staff API Key', placeholder: 'Chave de integração Staff' },
  ],
  linkedin: [
    { key: 'accessToken', label: 'Access Token', placeholder: 'Token OAuth do LinkedIn' },
  ],
  contentful: [
    { key: 'spaceId', label: 'Space ID', placeholder: 'ID do Space Contentful' },
    { key: 'environment', label: 'Environment', placeholder: 'master' },
    { key: 'accessToken', label: 'Content Management Token', placeholder: 'Token com permissão de escrita' },
  ],
  sanity: [
    { key: 'projectId', label: 'Project ID', placeholder: 'ID do projeto Sanity' },
    { key: 'dataset', label: 'Dataset', placeholder: 'production' },
    { key: 'apiToken', label: 'API Token', placeholder: 'Token Editor ou superior' },
  ],
  hubspot: [
    { key: 'privateAppToken', label: 'Private App Token', placeholder: 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
  ],
  strapi: [
    { key: 'baseUrl', label: 'URL do Strapi', placeholder: 'https://meu-strapi.com' },
    { key: 'apiToken', label: 'API Token', placeholder: 'Token com permissão de criação' },
  ],
  vtex: [
    { key: 'accountName', label: 'Account Name', placeholder: 'minhaloja' },
    { key: 'appKey', label: 'App Key', placeholder: 'vtexappkey-minhaloja-XXXXXX' },
    { key: 'appToken', label: 'App Token', placeholder: 'Token de acesso VTEX', type: 'password' },
  ],
  nuvemshop: [
    { key: 'userId', label: 'User ID', placeholder: 'ID numérico da loja' },
    { key: 'accessToken', label: 'Access Token', placeholder: 'Token de acesso Nuvemshop' },
  ],
  tray: [
    { key: 'storeUrl', label: 'URL da loja', placeholder: 'minhaloja.commercesuite.com.br' },
    { key: 'consumerKey', label: 'Consumer Key', placeholder: 'Consumer Key da API' },
    { key: 'consumerSecret', label: 'Consumer Secret', placeholder: 'Consumer Secret da API', type: 'password' },
  ],
  ga4: [
    { key: 'propertyId', label: 'Property ID', placeholder: '123456789' },
    { key: 'measurementId', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX' },
    { key: 'apiSecret', label: 'API Secret', placeholder: 'Secret do Measurement Protocol', type: 'password' },
  ],
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
    if (WEBHOOK_INTEGRATIONS.has(id)) {
      setWebhookOpen(o => o === id ? null : id)
      return
    }
    if (API_CONFIG_FIELDS[id]) {
      setApiConfigOpen(o => o === id ? null : id)
      setApiConfigError(e => ({ ...e, [id]: '' }))
      return
    }
    setConnecting(id)
    setTimeout(() => setConnecting(null), 2000)
  }

  const handleSaveWebhook = async (id: string) => {
    const url = webhookConfig[id]?.trim()
    if (!url) return
    try {
      await apiRequest(`/integrations/${id}/connect`, {
        method: 'POST',
        body: JSON.stringify({ webhookUrl: url }),
      })
      setConnected(s => new Set([...s, id]))
      setWebhookOpen(null)
    } catch {
      // silently fail — user can retry
    }
  }

  const handleSaveApiConfig = async (id: string) => {
    const values = apiConfigValues[id] ?? {}
    const fields = API_CONFIG_FIELDS[id] ?? []
    const missing = fields.find(f => !values[f.key]?.trim())
    if (missing) {
      setApiConfigError(e => ({ ...e, [id]: `Preencha o campo: ${missing.label}` }))
      return
    }
    try {
      await apiRequest(`/integrations/${id}/connect`, {
        method: 'POST',
        body: JSON.stringify(values),
      })
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

      {/* Stats bar */}
      <div className="flex items-center gap-6 p-4 rounded-orf-xl bg-orf-surface border border-orf-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orf-success animate-pulse" />
          <span className="text-sm text-orf-text">{connected.size} conectadas</span>
        </div>
        <div className="w-px h-4 bg-orf-border" />
        <span className="text-sm text-orf-text-2">
          {integrations.filter(i => i.status === 'available').length} disponíveis
        </span>
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
                      style={{ backgroundColor: `${integration.color}15` }}
                    >
                      {integration.icon}
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

                  {/* Webhook config inline form */}
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

                  {/* API key config inline form */}
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
                        <button onClick={() => handleDisconnect(integration.id)} className="text-xs text-orf-text-3 hover:text-orf-error transition-colors">
                          Desconectar
                        </button>
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
