import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  integer,
  numeric,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { tenants } from './core.js'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const adsPlatformEnum = pgEnum('ads_platform', [
  'meta',
  'google',
  'linkedin',
  'tiktok',
  'twitter',
  'pinterest',
  'taboola',
  'other',
])

export const crmPlatformEnum = pgEnum('crm_platform', [
  'rd_station',
  'hubspot',
  'pipedrive',
  'nectar',
  'moskit',
  'salesforce',
  'zoho',
  'webhook',
  'other',
])

export const integrationStatusEnum = pgEnum('integration_status', [
  'active',
  'inactive',
  'error',
  'pending',
])

export const leadStatusEnum = pgEnum('lead_status', [
  'new',
  'no_contact',
  'contacted',
  'qualified',
  'unqualified',
  'opportunity',
  'won',
  'lost',
])

export const conversionEventEnum = pgEnum('conversion_event', [
  'lead',
  'qualified_lead',
  'opportunity',
  'sale',
  'custom',
])

export const webhookMethodEnum = pgEnum('webhook_method', ['GET', 'POST', 'PUT', 'PATCH'])

export const utmMediumEnum = pgEnum('utm_medium', [
  'cpc',
  'cpm',
  'social',
  'email',
  'organic',
  'referral',
  'other',
])

// ─── Clients ─────────────────────────────────────────────────────────────────

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 7 }).notNull().default('#6366f1'),
    logoUrl: text('logo_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('clients_tenant_idx').on(t.tenantId)]
)

// ─── Ads Platform Integrations ───────────────────────────────────────────────

export const adsPlatformIntegrations = pgTable(
  'ads_platform_integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    platform: adsPlatformEnum('platform').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    accountId: varchar('account_id', { length: 255 }),
    credentials: jsonb('credentials').notNull().default({}), // AES-256 encrypted
    status: integrationStatusEnum('status').notNull().default('pending'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    meta: jsonb('meta').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('ads_platform_integrations_tenant_idx').on(t.tenantId)]
)

// ─── CRM Integrations ─────────────────────────────────────────────────────────

export const crmIntegrations = pgTable(
  'crm_integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    platform: crmPlatformEnum('platform').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    credentials: jsonb('credentials').notNull().default({}), // AES-256 encrypted
    status: integrationStatusEnum('status').notNull().default('pending'),
    funnelMapping: jsonb('funnel_mapping').notNull().default({}), // { crm_stage_id: our_stage }
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    meta: jsonb('meta').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('crm_integrations_tenant_idx').on(t.tenantId)]
)

// ─── Budget ───────────────────────────────────────────────────────────────────

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    integrationId: uuid('integration_id').references(() => adsPlatformIntegrations.id, {
      onDelete: 'set null',
    }),
    platform: adsPlatformEnum('platform').notNull(),
    month: integer('month').notNull(), // 1-12
    year: integer('year').notNull(),
    plannedAmount: numeric('planned_amount', { precision: 12, scale: 2 }).notNull(),
    spentAmount: numeric('spent_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('budgets_tenant_idx').on(t.tenantId),
    index('budgets_period_idx').on(t.tenantId, t.year, t.month),
  ]
)

// ─── Funnel Stages ────────────────────────────────────────────────────────────

export const funnelStages = pgTable(
  'funnel_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    crmIntegrationId: uuid('crm_integration_id').references(() => crmIntegrations.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    order: integer('order').notNull(),
    color: varchar('color', { length: 7 }),
    isWon: boolean('is_won').notNull().default(false),
    isLost: boolean('is_lost').notNull().default(false),
    conversionEvent: conversionEventEnum('conversion_event'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('funnel_stages_tenant_idx').on(t.tenantId, t.order)]
)

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    crmIntegrationId: uuid('crm_integration_id').references(() => crmIntegrations.id, {
      onDelete: 'set null',
    }),
    externalId: varchar('external_id', { length: 255 }), // ID no CRM de origem
    stageId: uuid('stage_id').references(() => funnelStages.id, { onDelete: 'set null' }),
    status: leadStatusEnum('status').notNull().default('new'),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    company: varchar('company', { length: 255 }),
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    utmContent: varchar('utm_content', { length: 255 }),
    utmTerm: varchar('utm_term', { length: 255 }),
    gclid: varchar('gclid', { length: 255 }),
    fbclid: varchar('fbclid', { length: 255 }),
    conversionSentAt: timestamp('conversion_sent_at', { withTimezone: true }),
    meta: jsonb('meta').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('leads_tenant_idx').on(t.tenantId),
    index('leads_status_idx').on(t.tenantId, t.status),
    index('leads_external_idx').on(t.crmIntegrationId, t.externalId),
  ]
)

// ─── Offline Conversions ──────────────────────────────────────────────────────

export const offlineConversions = pgTable(
  'offline_conversions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
    integrationId: uuid('integration_id').references(() => adsPlatformIntegrations.id, {
      onDelete: 'set null',
    }),
    platform: adsPlatformEnum('platform').notNull(),
    event: conversionEventEnum('event').notNull(),
    value: numeric('value', { precision: 12, scale: 2 }),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    status: integrationStatusEnum('status').notNull().default('pending'),
    responsePayload: jsonb('response_payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('offline_conversions_tenant_idx').on(t.tenantId),
    index('offline_conversions_lead_idx').on(t.leadId),
  ]
)

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    url: text('url').notNull(),
    method: webhookMethodEnum('method').notNull().default('POST'),
    secret: text('secret'), // HMAC signing secret
    fieldMapping: jsonb('field_mapping').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('webhooks_tenant_idx').on(t.tenantId)]
)

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    webhookId: uuid('webhook_id')
      .notNull()
      .references(() => webhooks.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    payload: jsonb('payload').notNull(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('webhook_events_webhook_idx').on(t.webhookId)]
)

// ─── UTM Tracking ─────────────────────────────────────────────────────────────

export const utmEntries = pgTable(
  'utm_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    source: varchar('source', { length: 255 }).notNull(),
    medium: varchar('medium', { length: 255 }),
    campaign: varchar('campaign', { length: 255 }),
    content: varchar('content', { length: 255 }),
    term: varchar('term', { length: 255 }),
    landingPage: text('landing_page'),
    hasGclid: boolean('has_gclid').notNull().default(false),
    hasFbclid: boolean('has_fbclid').notNull().default(false),
    isValidForOfflineConversion: boolean('is_valid_for_offline_conversion')
      .notNull()
      .default(false),
    hitCount: integer('hit_count').notNull().default(1),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('utm_entries_tenant_idx').on(t.tenantId),
    index('utm_entries_source_idx').on(t.tenantId, t.source, t.medium, t.campaign),
  ]
)

// ─── Google Sheets Integrations ──────────────────────────────────────────────

export const googleSheetsIntegrations = pgTable(
  'google_sheets_integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    spreadsheetId: varchar('spreadsheet_id', { length: 255 }).notNull(),
    sheetName: varchar('sheet_name', { length: 255 }).notNull().default('Sheet1'),
    fieldMapping: jsonb('field_mapping').notNull().default({}), // { lead_field: column_letter }
    credentials: jsonb('credentials').notNull().default({}), // OAuth tokens
    googleEmail: varchar('google_email', { length: 255 }), // connected Google account email
    spreadsheetTitle: varchar('spreadsheet_title', { length: 255 }), // friendly title of the sheet
    status: integrationStatusEnum('status').notNull().default('active'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('google_sheets_tenant_idx').on(t.tenantId)]
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, { fields: [clients.tenantId], references: [tenants.id] }),
  integrations: many(adsPlatformIntegrations),
  budgets: many(budgets),
  leads: many(leads),
  googleSheets: many(googleSheetsIntegrations),
}))

export const adsPlatformIntegrationsRelations = relations(
  adsPlatformIntegrations,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [adsPlatformIntegrations.tenantId],
      references: [tenants.id],
    }),
    client: one(clients, {
      fields: [adsPlatformIntegrations.clientId],
      references: [clients.id],
    }),
    budgets: many(budgets),
    offlineConversions: many(offlineConversions),
  })
)

export const crmIntegrationsRelations = relations(crmIntegrations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [crmIntegrations.tenantId], references: [tenants.id] }),
  leads: many(leads),
  funnelStages: many(funnelStages),
}))

export const budgetsRelations = relations(budgets, ({ one }) => ({
  tenant: one(tenants, { fields: [budgets.tenantId], references: [tenants.id] }),
  client: one(clients, { fields: [budgets.clientId], references: [clients.id] }),
  integration: one(adsPlatformIntegrations, {
    fields: [budgets.integrationId],
    references: [adsPlatformIntegrations.id],
  }),
}))

export const funnelStagesRelations = relations(funnelStages, ({ one, many }) => ({
  tenant: one(tenants, { fields: [funnelStages.tenantId], references: [tenants.id] }),
  crmIntegration: one(crmIntegrations, {
    fields: [funnelStages.crmIntegrationId],
    references: [crmIntegrations.id],
  }),
  leads: many(leads),
}))

export const leadsRelations = relations(leads, ({ one, many }) => ({
  tenant: one(tenants, { fields: [leads.tenantId], references: [tenants.id] }),
  client: one(clients, { fields: [leads.clientId], references: [clients.id] }),
  crmIntegration: one(crmIntegrations, {
    fields: [leads.crmIntegrationId],
    references: [crmIntegrations.id],
  }),
  stage: one(funnelStages, { fields: [leads.stageId], references: [funnelStages.id] }),
  offlineConversions: many(offlineConversions),
}))

export const googleSheetsIntegrationsRelations = relations(googleSheetsIntegrations, ({ one }) => ({
  tenant: one(tenants, { fields: [googleSheetsIntegrations.tenantId], references: [tenants.id] }),
  client: one(clients, { fields: [googleSheetsIntegrations.clientId], references: [clients.id] }),
}))

export const offlineConversionsRelations = relations(offlineConversions, ({ one }) => ({
  lead: one(leads, { fields: [offlineConversions.leadId], references: [leads.id] }),
  integration: one(adsPlatformIntegrations, {
    fields: [offlineConversions.integrationId],
    references: [adsPlatformIntegrations.id],
  }),
}))

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  tenant: one(tenants, { fields: [webhooks.tenantId], references: [tenants.id] }),
  events: many(webhookEvents),
}))

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  webhook: one(webhooks, { fields: [webhookEvents.webhookId], references: [webhooks.id] }),
}))
