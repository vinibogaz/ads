-- Orffia Ads — Schema Migration v1
-- Run after core/auth tables (0000_init.sql)

-- Enums
CREATE TYPE IF NOT EXISTS ads_platform AS ENUM ('meta','google','linkedin','tiktok','twitter','pinterest','taboola','other');
CREATE TYPE IF NOT EXISTS crm_platform AS ENUM ('rd_station','hubspot','pipedrive','nectar','moskit','salesforce','zoho','webhook','other');
CREATE TYPE IF NOT EXISTS integration_status AS ENUM ('active','inactive','error','pending');
CREATE TYPE IF NOT EXISTS lead_status AS ENUM ('new','no_contact','contacted','qualified','unqualified','opportunity','won','lost');
CREATE TYPE IF NOT EXISTS conversion_event AS ENUM ('lead','qualified_lead','opportunity','sale','custom');
CREATE TYPE IF NOT EXISTS webhook_method AS ENUM ('GET','POST','PUT','PATCH');

-- Ads Platform Integrations
CREATE TABLE IF NOT EXISTS ads_platform_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform ads_platform NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_id VARCHAR(255),
  credentials JSONB NOT NULL DEFAULT '{}',
  status integration_status NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ads_platform_integrations_tenant_idx ON ads_platform_integrations(tenant_id);

-- CRM Integrations
CREATE TABLE IF NOT EXISTS crm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform crm_platform NOT NULL,
  name VARCHAR(255) NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}',
  status integration_status NOT NULL DEFAULT 'pending',
  funnel_mapping JSONB NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS crm_integrations_tenant_idx ON crm_integrations(tenant_id);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES ads_platform_integrations(id) ON DELETE SET NULL,
  platform ads_platform NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  planned_amount NUMERIC(12,2) NOT NULL,
  spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS budgets_tenant_idx ON budgets(tenant_id);
CREATE INDEX IF NOT EXISTS budgets_period_idx ON budgets(tenant_id, year, month);

-- Funnel Stages
CREATE TABLE IF NOT EXISTS funnel_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  crm_integration_id UUID REFERENCES crm_integrations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  "order" INTEGER NOT NULL,
  color VARCHAR(7),
  is_won BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost BOOLEAN NOT NULL DEFAULT FALSE,
  conversion_event conversion_event,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS funnel_stages_tenant_idx ON funnel_stages(tenant_id, "order");

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  crm_integration_id UUID REFERENCES crm_integrations(id) ON DELETE SET NULL,
  external_id VARCHAR(255),
  stage_id UUID REFERENCES funnel_stages(id) ON DELETE SET NULL,
  status lead_status NOT NULL DEFAULT 'new',
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  gclid VARCHAR(255),
  fbclid VARCHAR(255),
  conversion_sent_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS leads_tenant_idx ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS leads_external_idx ON leads(crm_integration_id, external_id);

-- Offline Conversions
CREATE TABLE IF NOT EXISTS offline_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES ads_platform_integrations(id) ON DELETE SET NULL,
  platform ads_platform NOT NULL,
  event conversion_event NOT NULL,
  value NUMERIC(12,2),
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  sent_at TIMESTAMPTZ,
  status integration_status NOT NULL DEFAULT 'pending',
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS offline_conversions_tenant_idx ON offline_conversions(tenant_id);
CREATE INDEX IF NOT EXISTS offline_conversions_lead_idx ON offline_conversions(lead_id);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  method webhook_method NOT NULL DEFAULT 'POST',
  secret TEXT,
  field_mapping JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS webhooks_tenant_idx ON webhooks(tenant_id);

-- Webhook Events
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS webhook_events_webhook_idx ON webhook_events(webhook_id);

-- UTM Entries
CREATE TABLE IF NOT EXISTS utm_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source VARCHAR(255) NOT NULL,
  medium VARCHAR(255),
  campaign VARCHAR(255),
  content VARCHAR(255),
  term VARCHAR(255),
  landing_page TEXT,
  has_gclid BOOLEAN NOT NULL DEFAULT FALSE,
  has_fbclid BOOLEAN NOT NULL DEFAULT FALSE,
  is_valid_for_offline_conversion BOOLEAN NOT NULL DEFAULT FALSE,
  hit_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS utm_entries_tenant_idx ON utm_entries(tenant_id);
CREATE INDEX IF NOT EXISTS utm_entries_source_idx ON utm_entries(tenant_id, source, medium, campaign);
