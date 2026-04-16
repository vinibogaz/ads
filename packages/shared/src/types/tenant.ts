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
  articlesPerMonth: number
  adCopiesPerMonth: number
  emailCopiesPerMonth: number
  geoMonitors: number
  teamMembers: number
  cmsIntegrations: number
  storageGb: number
}

export const PLAN_LIMITS: Record<TenantPlan, PlanLimits> = {
  trial: {
    articlesPerMonth: 3,
    adCopiesPerMonth: 10,
    emailCopiesPerMonth: 5,
    geoMonitors: 1,
    teamMembers: 1,
    cmsIntegrations: 1,
    storageGb: 1,
  },
  starter: {
    articlesPerMonth: 30,
    adCopiesPerMonth: 100,
    emailCopiesPerMonth: 50,
    geoMonitors: 3,
    teamMembers: 3,
    cmsIntegrations: 3,
    storageGb: 10,
  },
  pro: {
    articlesPerMonth: 150,
    adCopiesPerMonth: 500,
    emailCopiesPerMonth: 250,
    geoMonitors: 10,
    teamMembers: 10,
    cmsIntegrations: 10,
    storageGb: 50,
  },
  agency: {
    articlesPerMonth: -1, // unlimited
    adCopiesPerMonth: -1,
    emailCopiesPerMonth: -1,
    geoMonitors: -1,
    teamMembers: -1,
    cmsIntegrations: -1,
    storageGb: 500,
  },
}
