-- Migration: Add seo_breakdown + structured_data to articles; add target_urls to geo_monitors
-- Run: psql $DATABASE_URL -f this_file.sql

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS seo_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS structured_data jsonb;

ALTER TABLE geo_monitors
  ADD COLUMN IF NOT EXISTS target_urls text[] NOT NULL DEFAULT '{}';
