-- Migration 0003: Google OAuth for Sheets (replace service account with OAuth tokens)

ALTER TABLE google_sheets_integrations
  ADD COLUMN IF NOT EXISTS google_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS spreadsheet_title VARCHAR(255);

-- Clear stale service account credentials (safe — will re-auth via OAuth)
UPDATE google_sheets_integrations
SET credentials = '{}', status = 'inactive'
WHERE credentials::text LIKE '%serviceAccountJson%';
