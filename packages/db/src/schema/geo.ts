import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  numeric,
  integer,
  date,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const geoEngineEnum = pgEnum('geo_engine', [
  'chatgpt',
  'gemini',
  'claude',
  'perplexity',
  'grok',
])

export const sentimentEnum = pgEnum('sentiment', ['positive', 'neutral', 'negative'])

export const monitorFrequencyEnum = pgEnum('monitor_frequency', ['hourly', 'daily', 'weekly'])

export const processingStatusEnum = pgEnum('processing_status', [
  'pending',
  'processing',
  'done',
  'error',
])

export const alertTypeEnum = pgEnum('alert_type', [
  'score_drop',
  'mention_lost',
  'competitor_surpassed',
  'new_citation',
])

// GEO MONITORS
export const geoMonitors = pgTable('geo_monitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  brandName: varchar('brand_name', { length: 255 }).notNull(),
  brandAliases: text('brand_aliases').array().notNull().default([]),
  competitors: text('competitors').array().notNull().default([]),
  keywords: text('keywords').array().notNull().default([]),
  engines: geoEngineEnum('engines')
    .array()
    .notNull()
    .default(['chatgpt', 'gemini', 'claude', 'perplexity', 'grok']),
  frequency: monitorFrequencyEnum('frequency').notNull().default('daily'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// GEO SNAPSHOTS (raw API responses)
export const geoSnapshots = pgTable('geo_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  monitorId: uuid('monitor_id')
    .notNull()
    .references(() => geoMonitors.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  engine: geoEngineEnum('engine').notNull(),
  query: text('query').notNull(),
  responseText: text('response_text'),
  collectedAt: timestamp('collected_at', { withTimezone: true }).notNull(),
  processingStatus: processingStatusEnum('processing_status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// GEO MENTIONS (parsed from snapshots)
export const geoMentions = pgTable('geo_mentions', {
  id: uuid('id').primaryKey().defaultRandom(),
  snapshotId: uuid('snapshot_id')
    .notNull()
    .references(() => geoSnapshots.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  brandMentioned: boolean('brand_mentioned').notNull().default(false),
  citationUrl: text('citation_url'),
  sentiment: sentimentEnum('sentiment'),
  competitorMentions: jsonb('competitor_mentions').notNull().default({}),
  sourcesCited: jsonb('sources_cited').notNull().default([]),
  positionInResponse: integer('position_in_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// GEO SCORES (daily aggregation)
export const geoScores = pgTable(
  'geo_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    monitorId: uuid('monitor_id')
      .notNull()
      .references(() => geoMonitors.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    calculatedDate: date('calculated_date').notNull(),
    visibilityRate: numeric('visibility_rate', { precision: 5, scale: 2 }),
    linkCitationRate: numeric('link_citation_rate', { precision: 5, scale: 2 }),
    avgSentiment: numeric('avg_sentiment', { precision: 5, scale: 2 }),
    shareOfVoice: numeric('share_of_voice', { precision: 5, scale: 2 }),
    totalScore: numeric('total_score', { precision: 5, scale: 2 }), // 0-100 weighted
    byEngine: jsonb('by_engine').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueMonitorDate: unique().on(table.monitorId, table.calculatedDate),
  })
)

// GEO ALERTS
export const geoAlerts = pgTable('geo_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  monitorId: uuid('monitor_id')
    .notNull()
    .references(() => geoMonitors.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  type: alertTypeEnum('type').notNull(),
  threshold: numeric('threshold', { precision: 5, scale: 2 }),
  isActive: boolean('is_active').notNull().default(true),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Relations
export const geoMonitorsRelations = relations(geoMonitors, ({ many }) => ({
  snapshots: many(geoSnapshots),
  scores: many(geoScores),
  alerts: many(geoAlerts),
}))

export const geoSnapshotsRelations = relations(geoSnapshots, ({ one, many }) => ({
  monitor: one(geoMonitors, {
    fields: [geoSnapshots.monitorId],
    references: [geoMonitors.id],
  }),
  mentions: many(geoMentions),
}))
