-- Migration 0004: Revenue fields, UTM Dictionary, Client enhancements

-- 1. Revenue fields on leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS value        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS mrr          NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS implantation NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS closed_at    TIMESTAMPTZ;

-- 2. Enhanced client fields
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS website  TEXT,
  ADD COLUMN IF NOT EXISTS industry VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notes    TEXT;

-- 3. UTM Dictionary table
CREATE TABLE IF NOT EXISTS utm_dictionary (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  utm_parameter  VARCHAR(50)  NOT NULL,
  utm_value      VARCHAR(255) NOT NULL,
  label          VARCHAR(255) NOT NULL,
  segment        VARCHAR(255),
  color          VARCHAR(7),
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS utm_dictionary_tenant_idx    ON utm_dictionary(tenant_id);
CREATE INDEX IF NOT EXISTS utm_dictionary_lookup_idx   ON utm_dictionary(tenant_id, utm_parameter, utm_value);
CREATE UNIQUE INDEX IF NOT EXISTS utm_dictionary_unique ON utm_dictionary(tenant_id, utm_parameter, utm_value);
