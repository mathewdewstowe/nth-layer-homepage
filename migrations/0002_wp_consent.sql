-- 2026-10-20: record consent to store details and email about the white paper
ALTER TABLE wp_requests ADD COLUMN consent_at TEXT;  -- ISO 8601 UTC, server time when consent was given
