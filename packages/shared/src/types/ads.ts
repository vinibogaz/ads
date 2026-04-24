export type AdsPlatform = 'meta' | 'google' | 'linkedin' | 'tiktok' | 'twitter' | 'pinterest' | 'taboola' | 'other'
export type CrmPlatform = 'rd_station' | 'hubspot' | 'pipedrive' | 'nectar' | 'moskit' | 'salesforce' | 'zoho' | 'webhook' | 'other'
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending'
export type LeadStatus = 'new' | 'no_contact' | 'contacted' | 'qualified' | 'unqualified' | 'opportunity' | 'won' | 'lost'
export type ConversionEvent = 'lead' | 'qualified_lead' | 'opportunity' | 'sale' | 'custom'
export type WebhookMethod = 'GET' | 'POST' | 'PUT' | 'PATCH'

// ─── Platform Integrations ────────────────────────────────────────────────────

export interface AdsPlatformIntegration {
  id: string
  tenantId: string
  platform: AdsPlatform
  name: string
  accountId?: string
  status: IntegrationStatus
  lastSyncAt?: string
  meta: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CrmIntegration {
  id: string
  tenantId: string
  platform: CrmPlatform
  name: string
  status: IntegrationStatus
  funnelMapping: Record<string, string>
  lastSyncAt?: string
  meta: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface Budget {
  id: string
  tenantId: string
  integrationId?: string
  platform: AdsPlatform
  month: number
  year: number
  plannedAmount: string
  spentAmount: string
  currency: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface BudgetSummary {
  platform: AdsPlatform
  month: number
  year: number
  plannedAmount: number
  spentAmount: number
  remainingAmount: number
  percentUsed: number
  currency: string
}

export interface CreateBudgetInput {
  integrationId?: string
  platform: AdsPlatform
  month: number
  year: number
  plannedAmount: number
  currency?: string
  notes?: string
}

// ─── Funnel ───────────────────────────────────────────────────────────────────

export interface FunnelStage {
  id: string
  tenantId: string
  crmIntegrationId?: string
  name: string
  order: number
  color?: string
  isWon: boolean
  isLost: boolean
  conversionEvent?: ConversionEvent
  leadCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateFunnelStageInput {
  crmIntegrationId?: string
  name: string
  order: number
  color?: string
  isWon?: boolean
  isLost?: boolean
  conversionEvent?: ConversionEvent
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string
  tenantId: string
  crmIntegrationId?: string
  externalId?: string
  stageId?: string
  stage?: FunnelStage
  status: LeadStatus
  name?: string
  email?: string
  phone?: string
  company?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  gclid?: string
  fbclid?: string
  conversionSentAt?: string
  value?: string | null
  mrr?: string | null
  implantation?: string | null
  closedAt?: string | null
  meta: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateLeadInput {
  crmIntegrationId?: string
  externalId?: string
  stageId?: string
  status?: LeadStatus
  name?: string
  email?: string
  phone?: string
  company?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  gclid?: string
  fbclid?: string
  meta?: Record<string, unknown>
}

// ─── Offline Conversions ──────────────────────────────────────────────────────

export interface OfflineConversion {
  id: string
  tenantId: string
  leadId?: string
  integrationId?: string
  platform: AdsPlatform
  event: ConversionEvent
  value?: string
  currency: string
  sentAt?: string
  status: IntegrationStatus
  responsePayload?: Record<string, unknown>
  createdAt: string
}

export interface SendConversionInput {
  leadId: string
  integrationId: string
  event: ConversionEvent
  value?: number
  currency?: string
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export interface Webhook {
  id: string
  tenantId: string
  name: string
  url: string
  method: WebhookMethod
  fieldMapping: Record<string, string>
  isActive: boolean
  lastTriggeredAt?: string
  createdAt: string
  updatedAt: string
}

export interface WebhookEvent {
  id: string
  webhookId: string
  tenantId: string
  payload: Record<string, unknown>
  responseStatus?: number
  responseBody?: string
  processedAt?: string
  createdAt: string
}

export interface CreateWebhookInput {
  name: string
  url: string
  method?: WebhookMethod
  secret?: string
  fieldMapping?: Record<string, string>
}

// ─── UTMs ─────────────────────────────────────────────────────────────────────

export interface UtmEntry {
  id: string
  tenantId: string
  source: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
  landingPage?: string
  hasGclid: boolean
  hasFbclid: boolean
  isValidForOfflineConversion: boolean
  hitCount: number
  firstSeenAt: string
  lastSeenAt: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  period: { month: number; year: number }
  totalBudgetPlanned: number
  totalBudgetSpent: number
  totalLeads: number
  totalQualifiedLeads: number
  totalWon: number
  totalConversionsSent: number
  conversionsByPlatform: { platform: AdsPlatform; count: number }[]
  leadsByStage: { stageName: string; count: number }[]
  budgetByPlatform: BudgetSummary[]
}
