'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiRequest } from '@/lib/api'

interface Article {
  id: string
  title: string | null
  format: string
  status: string
  keywords: string[]
  wordCount: number | null
  seoScore: number | null
  createdAt: string
}

const FORMAT_LABELS: Record<string, string> = {
  blog: 'Blog Post',
  listicle: 'Listicle',
  'how-to': 'How-to',
  news: 'Notícia',
  comparison: 'Comparativo',
  opinion: 'Opinião',
  'product-review': 'Review',
  pillar: 'Pilar',
}

const TONE_LABELS: Record<string, string> = {
  authoritative: 'Autoritativo',
  conversational: 'Conversacional',
  professional: 'Profissional',
  friendly: 'Amigável',
  urgency: 'Urgência',
  educational: 'Educativo',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'orf-badge-warning',
  review: 'orf-badge-primary',
  approved: 'orf-badge-success',
  published: 'orf-badge-success',
  archived: 'bg-orf-border text-orf-text-3',
  generating: 'orf-badge-primary',
  error: 'orf-badge-error',
}

export function ContentEngineView() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    primaryKeyword: '',
    format: 'blog',
    tone: 'professional',
    language: 'pt-BR',
    wordCount: '800',
    targetAudience: '',
    secondaryKeywords: '',
    sitemapUrl: '',
  })

  const load = async () => {
    try {
      const res = await apiRequest<Article[]>('/content/articles')
      setArticles(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    setError('')

    try {
      await apiRequest('/content/generate/article', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          wordCount: parseInt(form.wordCount) || 800,
          secondaryKeywords: form.secondaryKeywords.split(',').map(s => s.trim()).filter(Boolean),
          sitemapUrl: form.sitemapUrl.trim() || undefined,
        }),
      })
      setShowForm(false)
      setForm({ primaryKeyword: '', format: 'blog', tone: 'professional', language: 'pt-BR', wordCount: '800', targetAudience: '', secondaryKeywords: '', sitemapUrl: '' })
      setTimeout(load, 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar geração'
      setError(msg.includes('worker') ? 'AI Worker não disponível. Configure OPENAI_API_KEY no .env.' : msg)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-orf-text">Content Engine</h1>
          <p className="text-orf-text-2 mt-1 text-sm">Gere artigos otimizados para SEO e GEO com IA</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="orf-btn-primary relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-orf-primary to-orf-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showForm ? 'Cancelar' : 'Gerar Artigo'}
          </span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Artigos', value: articles.length, icon: '📝' },
          { label: 'Publicados', value: articles.filter(a => a.status === 'published').length, icon: '✅' },
          { label: 'Rascunhos', value: articles.filter(a => a.status === 'draft').length, icon: '✏️' },
          { label: 'SEO Score Médio', value: articles.length > 0 ? Math.round(articles.filter(a => a.seoScore).reduce((s, a) => s + (a.seoScore ?? 0), 0) / (articles.filter(a => a.seoScore).length || 1)) + '%' : '—', icon: '📊' },
        ].map(stat => (
          <div key={stat.label} className="orf-card group hover:border-orf-border-2 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-orf-text">{stat.value}</p>
            <p className="text-xs text-orf-text-3 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Generation Form */}
      {showForm && (
        <div className="orf-card border-orf-primary/20 bg-gradient-to-br from-orf-surface to-orf-surface-2 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-orf-sm bg-orf-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-orf-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-orf-text">Novo Artigo com IA</h2>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-orf-text-2 mb-1.5">
                Palavra-chave principal <span className="text-orf-error">*</span>
              </label>
              <input
                className="orf-input text-base"
                placeholder="Ex: ferramentas de SEO para pequenas empresas"
                value={form.primaryKeyword}
                onChange={e => setForm(f => ({ ...f, primaryKeyword: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-orf-text-2 mb-1.5">Formato</label>
                <select className="orf-input" value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
                  {Object.entries(FORMAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-orf-text-2 mb-1.5">Tom de voz</label>
                <select className="orf-input" value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}>
                  {Object.entries(TONE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-orf-text-2 mb-1.5">Palavras (~)</label>
                <select className="orf-input" value={form.wordCount} onChange={e => setForm(f => ({ ...f, wordCount: e.target.value }))}>
                  {['400', '600', '800', '1200', '1800', '2500', '4000'].map(n => <option key={n} value={n}>{n} palavras</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-orf-text-2 mb-1.5">Público-alvo</label>
                <input className="orf-input" placeholder="Ex: gestores de marketing B2B" value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-orf-text-2 mb-1.5">Keywords secundárias <span className="text-orf-text-3">(vírgula)</span></label>
                <input className="orf-input" placeholder="SEO, conteúdo, posicionamento" value={form.secondaryKeywords} onChange={e => setForm(f => ({ ...f, secondaryKeywords: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-orf-text-2 mb-1.5">
                URL do Sitemap <span className="text-orf-text-3">(opcional — evita alucinações de links internos)</span>
              </label>
              <input
                className="orf-input"
                placeholder="https://seublog.com.br"
                value={form.sitemapUrl}
                onChange={e => setForm(f => ({ ...f, sitemapUrl: e.target.value }))}
              />
              <p className="text-xs text-orf-text-3 mt-1">A IA vai buscar o sitemap ou RSS e usar apenas URLs reais para cross-linking.</p>
            </div>

            {error && (
              <div className="text-orf-warning text-sm bg-orf-warning/10 border border-orf-warning/20 rounded-orf-sm px-4 py-3">
                ⚠️ {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-orf-text-3">Geração leva ~30–90 segundos via AI Worker</p>
              <button type="submit" disabled={generating} className="orf-btn-primary px-6">
                {generating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Gerando...
                  </span>
                ) : 'Gerar com IA →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Article List */}
      <div>
        <h2 className="text-sm font-semibold text-orf-text-2 uppercase tracking-wider mb-4">
          Artigos {articles.length > 0 && `(${articles.length})`}
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="orf-card animate-pulse">
                <div className="h-4 bg-orf-surface-2 rounded w-2/3 mb-2" />
                <div className="h-3 bg-orf-surface-2 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="orf-card flex flex-col items-center justify-center py-16 text-center border-dashed">
            <div className="w-14 h-14 rounded-2xl bg-orf-primary/10 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-orf-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <p className="text-orf-text font-medium">Nenhum artigo ainda</p>
            <p className="text-orf-text-3 text-sm mt-1 max-w-xs">Gere seu primeiro artigo otimizado para SEO e GEO com IA</p>
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map(article => (
              <Link key={article.id} href={`/content/articles/${article.id}`} className="block">
                <div className="orf-card hover:border-orf-border-2 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`orf-badge ${STATUS_STYLES[article.status] ?? 'orf-badge-primary'}`}>
                          {article.status}
                        </span>
                        <span className="orf-badge bg-orf-surface-2 text-orf-text-3">
                          {FORMAT_LABELS[article.format] ?? article.format}
                        </span>
                        {article.wordCount && (
                          <span className="text-xs text-orf-text-3">{article.wordCount.toLocaleString()} palavras</span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-orf-text group-hover:text-orf-primary transition-colors truncate">
                        {article.title ?? `Artigo: ${article.keywords?.[0]}`}
                      </h3>
                      <p className="text-xs text-orf-text-3 mt-0.5">
                        Keyword: <span className="text-orf-text-2">{article.keywords?.[0]}</span>
                      </p>
                    </div>
                    {article.seoScore !== null && (
                      <div className={`text-right shrink-0 ${article.seoScore >= 70 ? 'text-orf-success' : article.seoScore >= 40 ? 'text-orf-warning' : 'text-orf-error'}`}>
                        <p className="text-lg font-bold">{article.seoScore}</p>
                        <p className="text-xs opacity-70">SEO</p>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
