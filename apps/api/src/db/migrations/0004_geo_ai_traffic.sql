-- Migration: Sprint 7 — AI Traffic table
-- Run: psql $DATABASE_URL -f apps/api/src/db/migrations/0004_geo_ai_traffic.sql

CREATE TABLE IF NOT EXISTS geo_ai_traffic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    source VARCHAR(50) NOT NULL,
    page_url TEXT,
    visited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_ai_traffic_tenant ON geo_ai_traffic(tenant_id);
CREATE INDEX IF NOT EXISTS idx_geo_ai_traffic_visited_at ON geo_ai_traffic(visited_at);
