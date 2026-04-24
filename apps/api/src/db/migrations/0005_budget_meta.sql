-- Migration 0005: add meta jsonb to budgets for per-month metrics

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}';
