export type GeoEngine = 'chatgpt' | 'gemini' | 'claude' | 'perplexity' | 'grok'

export type Sentiment = 'positive' | 'neutral' | 'negative'

export type MonitorFrequency = 'hourly' | 'daily' | 'weekly'

export interface GeoMonitor {
  id: string
  tenantId: string
  brandName: string
  brandAliases: string[]
  competitors: string[]
  keywords: string[]
  engines: GeoEngine[]
  frequency: MonitorFrequency
  isActive: boolean
  createdAt: string
}

export interface GeoScore {
  id: string
  monitorId: string
  tenantId: string
  calculatedDate: string
  visibilityRate: number
  linkCitationRate: number
  avgSentiment: number
  shareOfVoice: number
  totalScore: number // 0-100 weighted
  byEngine: Record<GeoEngine, number>
}

// GEO Score formula:
// visibility_rate (40%) + link_citation_rate (30%) + avg_sentiment (20%) + share_of_voice (10%)

export interface GeoScoreWeights {
  visibilityRate: 0.4
  linkCitationRate: 0.3
  avgSentiment: 0.2
  shareOfVoice: 0.1
}

export interface GeoMention {
  id: string
  snapshotId: string
  tenantId: string
  brandMentioned: boolean
  citationUrl?: string
  sentiment?: Sentiment
  competitorMentions: Record<string, number>
  sourcesCited: string[]
  positionInResponse?: number
  createdAt: string
}

export interface GeoSnapshot {
  id: string
  monitorId: string
  tenantId: string
  engine: GeoEngine
  query: string
  responseText?: string
  collectedAt: string
  processingStatus: 'pending' | 'processing' | 'done' | 'error'
}

export interface GeoAlert {
  id: string
  monitorId: string
  tenantId: string
  type: 'score_drop' | 'mention_lost' | 'competitor_surpassed' | 'new_citation'
  threshold?: number
  isActive: boolean
  lastTriggeredAt?: string
  createdAt: string
}

export interface CompetitorAnalysis {
  monitorId: string
  period: { from: string; to: string }
  competitors: Array<{
    name: string
    shareOfVoice: number
    mentionCount: number
    avgSentiment: number
    trend: 'up' | 'down' | 'stable'
  }>
}
