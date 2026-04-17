'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiRequest } from '@/lib/api'

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
  geoScore: number | null
  wordCount: number | null
  createdAt: string
  updatedAt: string
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

const STATUS_STYLES: Record<string, string> = {
  draft: 'orf-badge-warning',
  review: 'orf-badge-primary',
  approved: 'orf-badge-success',
  published: 'orf-badge-success',
  archived: 'bg-orf-border text-orf-text-3',
}

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
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

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [article, setArticle] = useState<ArticleFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    apiRequest<ArticleFull>(`/content/articles/${id}`)
      .then(res => setArticle(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-orf-surface-2 rounded w-1/2" />
        <div className="h-4 bg-orf-surface-2 rounded w-1/3" />
        <div className="orf-card space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-4 bg-orf-surface-2 rounded" />)}
        </div>
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="orf-card flex flex-col items-center justify-center py-20 text-center">
        <p className="text-orf-text font-medium text-lg">Artigo não encontrado</p>
        <p className="text-orf-text-3 text-sm mt-2">O artigo pode ter sido removido ou o ID é inválido.</p>
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
          <h1 className="text-2xl font-bold text-orf-text leading-tight">
            {article.title ?? 'Artigo sem título'}
          </h1>
          {article.keywords.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {article.keywords.map(kw => (
                <span key={kw} className="orf-badge bg-orf-primary/10 text-orf-primary">{kw}</span>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => router.back()} className="orf-btn-ghost shrink-0">
          ← Voltar
        </button>
      </div>

      {/* SEO Scores */}
      {(article.seoScore !== null || article.geoScore !== null) && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <ScoreBadge score={article.seoScore} label="SEO Score" />
          <ScoreBadge score={article.geoScore} label="GEO Score" />
        </div>
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
          <pre className="whitespace-pre-wrap font-sans text-sm text-orf-text leading-relaxed">
            {article.content}
          </pre>
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
