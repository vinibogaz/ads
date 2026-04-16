// Row-Level Security SQL setup
// Run these after migrations to enable RLS policies

export const RLS_SETUP_SQL = `
-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each tenant-scoped table
-- Policy: rows are visible only when tenant_id matches app.current_tenant setting

CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_content_projects ON content_projects
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_articles ON articles
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_ad_copies ON ad_copies
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_email_copies ON email_copies
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_campaigns ON campaigns
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_content_schedules ON content_schedules
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_cms_integrations ON cms_integrations
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_geo_monitors ON geo_monitors
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_geo_snapshots ON geo_snapshots
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_geo_mentions ON geo_mentions
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_geo_scores ON geo_scores
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_geo_alerts ON geo_alerts
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_consent_records ON consent_records
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_refresh_tokens ON refresh_tokens
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Public prompt templates (tenant_id IS NULL) visible to all
CREATE POLICY public_prompt_templates ON prompt_templates
  USING (
    is_public = true
    OR tenant_id = current_setting('app.current_tenant', true)::uuid
  );

-- Create app user with limited privileges (no superuser)
-- The app connects as this user, so RLS policies are enforced
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'synthex_app') THEN
    CREATE ROLE synthex_app LOGIN PASSWORD 'CHANGE_IN_PRODUCTION';
  END IF;
END $$;

GRANT CONNECT ON DATABASE synthex TO synthex_app;
GRANT USAGE ON SCHEMA public TO synthex_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO synthex_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO synthex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO synthex_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO synthex_app;
`
