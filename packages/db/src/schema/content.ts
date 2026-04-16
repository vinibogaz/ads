import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  smallint,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { users } from './core'

// Enums
export const articleFormatEnum = pgEnum('article_format', [
  'blog',
  'listicle',
  'how-to',
  'news',
  'comparison',
  'opinion',
  'product-review',
  'pillar',
])

export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'review',
  'approved',
  'published',
  'archived',
])

export const adPlatformEnum = pgEnum('ad_platform', [
  'meta',
  'google',
  'tiktok',
  'linkedin',
  'youtube',
  'twitter',
  'pinterest',
  'taboola',
  'amazon',
])

export const emailTypeEnum = pgEnum('email_type', [
  'cold',
  'nurture',
  'launch',
  'abandonment',
  'welcome',
  're-engagement',
  'post-purchase',
  'promo',
])

export const scheduleStatusEnum = pgEnum('schedule_status', [
  'pending',
  'processing',
  'published',
  'failed',
  'cancelled',
])

// CONTENT PROJECTS
export const contentProjects = pgTable('content_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  keywords: text('keywords').array().notNull().default([]),
  targetAudience: text('target_audience'),
  tone: varchar('tone', { length: 50 }),
  language: varchar('language', { length: 10 }).notNull().default('pt-BR'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ARTICLES
export const articles = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  projectId: uuid('project_id').references(() => contentProjects.id),
  title: varchar('title', { length: 500 }).notNull(),
  slug: varchar('slug', { length: 500 }),
  content: text('content'),
  format: articleFormatEnum('format').notNull(),
  status: contentStatusEnum('status').notNull().default('draft'),
  seoScore: smallint('seo_score'),
  geoScore: smallint('geo_score'),
  metaTitle: varchar('meta_title', { length: 160 }),
  metaDescription: varchar('meta_description', { length: 320 }),
  keywords: text('keywords').array().notNull().default([]),
  wordCount: integer('word_count'),
  generationParams: jsonb('generation_params'),
  // embedding vector(1536) added via raw migration (drizzle-orm pgvector support)
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// AD COPIES
export const adCopies = pgTable('ad_copies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  projectId: uuid('project_id').references(() => contentProjects.id),
  platform: adPlatformEnum('platform').notNull(),
  headline: varchar('headline', { length: 255 }),
  body: text('body'),
  cta: varchar('cta', { length: 100 }),
  variations: jsonb('variations').notNull().default([]),
  status: contentStatusEnum('status').notNull().default('draft'),
  generationParams: jsonb('generation_params'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// EMAIL COPIES
export const emailCopies = pgTable('email_copies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  projectId: uuid('project_id').references(() => contentProjects.id),
  type: emailTypeEnum('type').notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  previewText: varchar('preview_text', { length: 255 }),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  status: contentStatusEnum('status').notNull().default('draft'),
  generationParams: jsonb('generation_params'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// CAMPAIGNS
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  brief: text('brief'),
  targetAudience: text('target_audience'),
  objective: text('objective'),
  linkedContent: jsonb('linked_content').notNull().default([]),
  status: contentStatusEnum('status').notNull().default('draft'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// CMS INTEGRATIONS
export const cmsIntegrations = pgTable('cms_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'wordpress', 'shopify', 'webflow', etc
  name: varchar('name', { length: 255 }).notNull(),
  credentialsEnc: text('credentials_enc').notNull(), // AES-256 encrypted
  settings: jsonb('settings').notNull().default({}),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// CONTENT SCHEDULES
export const contentSchedules = pgTable('content_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  articleId: uuid('article_id')
    .notNull()
    .references(() => articles.id),
  integrationId: uuid('integration_id')
    .notNull()
    .references(() => cmsIntegrations.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  status: scheduleStatusEnum('status').notNull().default('pending'),
  publishedUrl: text('published_url'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// PROMPT TEMPLATES
export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'), // null = global/public template
  name: varchar('name', { length: 255 }).notNull(),
  niche: varchar('niche', { length: 100 }),
  contentType: varchar('content_type', { length: 50 }).notNull(),
  template: text('template').notNull(),
  variables: jsonb('variables').notNull().default([]),
  isPublic: boolean('is_public').notNull().default(false),
  usageCount: integer('usage_count').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// Relations
export const articlesRelations = relations(articles, ({ one }) => ({
  project: one(contentProjects, {
    fields: [articles.projectId],
    references: [contentProjects.id],
  }),
  createdByUser: one(users, {
    fields: [articles.createdBy],
    references: [users.id],
  }),
}))
