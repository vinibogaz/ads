'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiRequest } from '@/lib/api'

interface SeoBreakdownFactor {
  pts: number
  max: number
  ok: boolean
  label: string
}

interface SeoBreakdown {
  h1Keyword?: SeoBreakdownFactor
  firstParagraph?: SeoBreakdownFactor
  assertiveStatements?: SeoBreakdownFactor
  concreteData?: SeoBreakdownFactor
  faqSchema?: SeoBreakdownFactor
  metaTags?: SeoBreakdownFactor
  headingsStructure?: SeoBreakdownFactor
  total?: number
}

interface ArticleFull {
  id: string
  title: string | null
  slug: string | null
  format: string
  status: string
  keywords: string[]
  content: string | null
  metaTitle: string | null
  metaDescription: string | null
  seoScore: number | null
  seoBreakdown: SeoBreakdown | null
  structuredData: object | null
  geoScore: number | null
  wordCount: number | null
  createdAt: string
  updatedAt: string
}

const FORMAT_LABELS: Record<string, string> = {
  blog: 'Blog Post', listicle: 'Listicle', 'how-to': 'How-to', news: 'Notícia',
  comparison: 'Comparativo', opinion: 'Opinião', 'product-review': 'Review', pillar: 'Pilar',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'orf-badge-warning', review: 'orf-badge-primary', approved: 'orf-badge-success',
  published: 'orf-badge-success', archived: 'bg-orf-border text-orf-text-3',
}

function ScoreChip({ score, label }: { score: number | null; label: string }) {
  if (score === null) return null
  const color = score >= 70 ? 'text-orf-success' : score >= 40 ? 'text-orf-warning' : 'text-orf-error'
  const bg = score >= 70 ? 'bg-orf-success/10 border-orf-success/20' : score >= 40 ? 'bg-orf-warning/10 border-orf-warning/20' : 'bg-orf-error/10 border-orf-error/20'
  return (
    <div className={`orf-card ${bg} text-center p-4`}>
      <p className={`text-3xl font-bold ${color}`}>{score}</p>
      <p className="text-xs text-orf-text-3 mt-1">{label}</p>
    </div>
  )
}

function SeoBreakdownPanel({ breakdown }: { breakdown: SeoBreakdown }) {
  const factors = Object.entries(breakdown).filter(([k]) => k !== 'total') as [string, SeoBreakdownFactor][]
  if (!factors.length) return null

  return (
    <div className="orf-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-orf-text-2 uppercase tracking-wider">Análise SEO Detalhada</h2>
        <span className="text-xs text-orf-text-3">Pontuação por fator</span>
      </div>
      <div className="space-y-2">
        {factors.map(([key, factor]) => {
          const pct = (factor.pts / factor.max) * 100
          const barColor = factor.ok ? 'bg-orf-success' : 'bg-orf-error/40'
          return (
            <div key={key} className="flex items-center gap-3">
              <span className={`text-xs shrink-0 ${factor.ok ? 'text-orf-success' : 'text-orf-error'}`}>
                {factor.ok ? '✓' : '✗'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-orf-text-2 truncate">{factor.label}</span>
                  <span className="text-xs font-medium text-orf-text shrink-0 ml-2">{factor.pts}/{factor.max}</span>
                </div>
                <div className="h-1.5 bg-orf-surface-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-orf-text-3 pt-1 border-t border-orf-border">
        Score calculado automaticamente pela IA com base em 7 fatores de qualidade SEO/GEO.
      </p>
    </div>
  )
}

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [article, setArticle] = useState<ArticleFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    apiRequest<ArticleFull>(`/content/articles/${id}`)
      .then(res => setArticle(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  // Inject JSON-LD structured data into document head
  useEffect(() => {
    if (!article?.structuredData) return
    const existing = document.getElementById('orf-ld-json')
    if (existing) existing.remove()
    const script = document.createElement('script')
    script.id = 'orf-ld-json'
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(article.structuredData)
    document.head.appendChild(script)
    return () => {
      document.getElementById('orf-ld-json')?.remove()
    }
  }, [article?.structuredData])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-orf-surface-2 rounded w-1/2" />
        <div className="orf-card space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-4 bg-orf-surface-2 rounded" />)}</div>
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="orf-card flex flex-col items-center justify-center py-20 text-center">
        <p className="text-orf-text font-medium text-lg">Artigo não encontrado</p>
        <Link href="/content" className="orf-btn-primary mt-6">← Voltar para Content Engine</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-orf-text-3">
        <Link href="/content" className="hover:text-orf-primary transition-colors">Content Engine</Link>
        <span>/</span>
        <span className="text-orf-text truncate max-w-xs">{article.title ?? 'Artigo'}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`orf-badge ${STATUS_STYLES[article.status] ?? 'orf-badge-primary'}`}>{article.status}</span>
            <span className="orf-badge bg-orf-surface-2 text-orf-text-3">{FORMAT_LABELS[article.format] ?? article.format}</span>
            {article.wordCount && <span className="text-xs text-orf-text-3">{article.wordCount.toLocaleString()} palavras</span>}
            {article.structuredData && (
              <span className="orf-badge bg-orf-success/10 text-orf-success text-[10px]" title="Schema.org JSON-LD injetado no head da página">
                JSON-LD ✓
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-orf-text leading-tight">{article.title ?? 'Artigo sem título'}</h1>
          {article.keywords.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {article.keywords.map(kw => (
                <span key={kw} className="orf-badge bg-orf-primary/10 text-orf-primary">{kw}</span>
              ))}
            </div>
          )}
        </div>
        <Link href="/content" className="orf-btn-ghost shrink-0">← Voltar</Link>
      </div>

      {/* SEO/GEO Scores */}
      {(article.seoScore !== null || article.geoScore !== null) && (
        <div className="grid grid-cols-2 gap-4">
          <ScoreChip score={article.seoScore} label="SEO Score" />
          <ScoreChip score={article.geoScore} label="GEO Score" />
        </div>
      )}

      {/* SEO Breakdown */}
      {article.seoBreakdown && Object.keys(article.seoBreakdown).length > 1 && (
        <SeoBreakdownPanel breakdown={article.seoBreakdown} />
      )}

      {/* Meta SEO */}
      {(article.metaTitle || article.metaDescription) && (
        <div className="orf-card space-y-3">
          <h2 className="text-sm font-semibold text-orf-text-2 uppercase tracking-wider">Meta SEO</h2>
          {article.metaTitle && (
            <div>
              <p className="text-xs text-orf-text-3 mb-1">Meta Title ({article.metaTitle.length}/60 chars)</p>
              <p className="text-sm text-orf-text font-medium">{article.metaTitle}</p>
            </div>
          )}
          {article.metaDescription && (
            <div>
              <p className="text-xs text-orf-text-3 mb-1">Meta Description ({article.metaDescription.length}/160 chars)</p>
              <p className="text-sm text-orf-text-2">{article.metaDescription}</p>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="orf-card">
        <h2 className="text-sm font-semibold text-orf-text-2 uppercase tracking-wider mb-4">Conteúdo</h2>
        {article.content ? (
          <pre className="whitespace-pre-wrap font-sans text-sm text-orf-text leading-relaxed">{article.content}</pre>
        ) : (
          <p className="text-orf-text-3 text-sm">Conteúdo não disponível.</p>
        )}
      </div>

      {/* Timestamps */}
      <p className="text-xs text-orf-text-3">
        Criado em {new Date(article.createdAt).toLocaleString('pt-BR')}
        {article.updatedAt !== article.createdAt && ` · Atualizado em ${new Date(article.updatedAt).toLocaleString('pt-BR')}`}
      </p>
    </div>
  )
}
