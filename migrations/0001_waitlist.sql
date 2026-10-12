-- Phase 1: waitlist only. No fitness profiles or app accounts are stored here.
CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  locale TEXT NOT NULL CHECK(locale IN ('en','ht','fr')),
  consent_version TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'website',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS waitlist_rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS waitlist_rate_expiry ON waitlist_rate_limits(window_start);
