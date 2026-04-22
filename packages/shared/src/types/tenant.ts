export type TenantPlan = 'trial' | 'starter' | 'pro' | 'agency'
export type TenantStatus = 'active' | 'suspended' | 'cancelled'

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: TenantPlan
  status: TenantStatus
  settings: TenantSettings
  createdAt: string
}

export interface TenantSettings {
  locale: string
  timezone: string
  allowedDomains?: string[]
  whiteLabel?: WhiteLabelSettings
}

export interface WhiteLabelSettings {
  enabled: boolean
  logoUrl?: string
  primaryColor?: string
  companyName?: string
}

export interface PlanLimits {
  adsPlatformIntegrations: number
  crmIntegrations: number
  teamMembers: number
  webhooks: number
  agentConversationsPerMonth: number
}

export const PLAN_LIMITS: Record<TenantPlan, PlanLimits> = {
  trial: {
    adsPlatformIntegrations: 1,
    crmIntegrations: 1,
    teamMembers: 1,
    webhooks: 3,
    agentConversationsPerMonth: 0,
  },
  starter: {
    adsPlatformIntegrations: 3,
    crmIntegrations: 2,
    teamMembers: 3,
    webhooks: 10,
    agentConversationsPerMonth: 0,
  },
  pro: {
    adsPlatformIntegrations: 10,
    crmIntegrations: 5,
    teamMembers: 10,
    webhooks: 50,
    agentConversationsPerMonth: 500,
  },
  agency: {
    adsPlatformIntegrations: -1,
    crmIntegrations: -1,
    teamMembers: -1,
    webhooks: -1,
    agentConversationsPerMonth: -1,
  },
}
