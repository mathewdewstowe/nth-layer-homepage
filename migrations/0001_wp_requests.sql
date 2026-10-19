-- White paper demand test: one row per request (2026-10-19)
CREATE TABLE IF NOT EXISTS wp_requests (
  id           TEXT PRIMARY KEY,          -- random UUID, used in the confirmation link
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  company      TEXT NOT NULL,
  job_title    TEXT NOT NULL,
  source       TEXT NOT NULL,             -- e.g. 'home-hero', 'home-cta', 'v9-preview'
  created_at   TEXT NOT NULL,             -- ISO 8601 UTC
  confirmed_at TEXT                       -- ISO 8601 UTC, NULL until the link is used
);
CREATE INDEX IF NOT EXISTS idx_wp_email ON wp_requests(email);
CREATE INDEX IF NOT EXISTS idx_wp_confirmed ON wp_requests(confirmed_at);
