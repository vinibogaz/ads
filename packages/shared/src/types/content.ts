export type ArticleFormat =
  | 'blog'
  | 'listicle'
  | 'how-to'
  | 'news'
  | 'comparison'
  | 'opinion'
  | 'product-review'
  | 'pillar'

export type AdPlatform =
  | 'meta'
  | 'google'
  | 'tiktok'
  | 'linkedin'
  | 'youtube'
  | 'twitter'
  | 'pinterest'
  | 'taboola'
  | 'amazon'

export type EmailType =
  | 'cold'
  | 'nurture'
  | 'launch'
  | 'abandonment'
  | 'welcome'
  | 're-engagement'
  | 'post-purchase'
  | 'promo'

export type ContentTone =
  | 'authoritative'
  | 'conversational'
  | 'professional'
  | 'friendly'
  | 'urgency'
  | 'educational'

export type ContentStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived'

export interface GenerateArticleRequest {
  format: ArticleFormat
  language: string
  tone: ContentTone
  primaryKeyword: string
  secondaryKeywords?: string[]
  targetAudience?: string
  wordCount?: number
  promptTemplateId?: string
  projectId?: string
}

export interface GenerateAdCopyRequest {
  platform: AdPlatform
  objective: string
  product: string
  targetAudience: string
  tone: ContentTone
  variationsCount?: number
  projectId?: string
}

export interface GenerateEmailRequest {
  type: EmailType
  subject?: string
  product: string
  targetAudience: string
  tone: ContentTone
  projectId?: string
}

export interface Article {
  id: string
  tenantId: string
  projectId?: string
  title: string
  slug?: string
  content?: string
  format: ArticleFormat
  status: ContentStatus
  seoScore?: number
  geoScore?: number
  metaTitle?: string
  metaDescription?: string
  keywords: string[]
  wordCount?: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface SeoCheckResult {
  keywordInH1: boolean
  keywordInFirstParagraph: boolean
  assertiveStatementsRate: number
  maxParagraphLines: boolean
  hasConcreteData: boolean
  hasFaqSchema: boolean
  hasMetaTitle: boolean
  hasMetaDescription: boolean
  score: number
}

export interface GenerationJob {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  result?: Article
  error?: string
  createdAt: string
}
