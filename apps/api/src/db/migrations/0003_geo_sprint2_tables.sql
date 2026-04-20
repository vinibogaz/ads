-- Migration: Sprint 2 — GEO extended tables
-- Run: psql $DATABASE_URL -f apps/api/src/db/migrations/0003_geo_sprint2_tables.sql

CREATE TABLE IF NOT EXISTS geo_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    monitor_id UUID REFERENCES geo_monitors(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    intent_cluster VARCHAR(50),
    group_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_prompt_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES geo_prompts(id) ON DELETE CASCADE,
    engine VARCHAR(20) NOT NULL,
    response_text TEXT,
    brand_mentioned BOOLEAN DEFAULT FALSE,
    mention_position INT DEFAULT -1,
    sentiment DECIMAL(4,2) DEFAULT 0,
    context VARCHAR(500),
    cited_sources TEXT[],
    collected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    monitor_id UUID REFERENCES geo_monitors(id) ON DELETE CASCADE,
    brand_name VARCHAR(200) NOT NULL,
    website_url VARCHAR(500),
    mention_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    prompt_id UUID REFERENCES geo_prompts(id) ON DELETE CASCADE,
    title VARCHAR(300),
    actions JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_cited_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    domain VARCHAR(500) NOT NULL,
    full_url TEXT NOT NULL,
    prompt_id UUID REFERENCES geo_prompts(id) ON DELETE SET NULL,
    engine VARCHAR(20),
    collected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_monitored_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    monitor_id UUID REFERENCES geo_monitors(id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    citation_count INT DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_site_diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    monitor_id UUID REFERENCES geo_monitors(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    geo_readiness_score INT DEFAULT 0,
    findings JSONB NOT NULL DEFAULT '[]',
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);
