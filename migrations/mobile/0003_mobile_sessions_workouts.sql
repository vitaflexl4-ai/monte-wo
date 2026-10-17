-- Dedicated application DB ONLY, after existing 0002_strength_index.sql.
-- Never apply to monte-wo-waitlist or flex-ai-db. No production migration performed.
PRAGMA foreign_keys=ON;
CREATE TABLE mw_mobile_grants(code_hash TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES mw_principals(id), challenge TEXT NOT NULL, redirect_uri TEXT NOT NULL, ciphertext TEXT NOT NULL, expires_at INTEGER NOT NULL, token_expires_at INTEGER NOT NULL);
CREATE INDEX mw_mobile_grants_expiry ON mw_mobile_grants(expires_at);
CREATE TABLE mw_mobile_sessions(token_hash TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES mw_principals(id), ciphertext TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX mw_mobile_sessions_owner ON mw_mobile_sessions(actor_id,expires_at);
CREATE TABLE mw_workouts(id TEXT PRIMARY KEY, athlete_id TEXT NOT NULL REFERENCES mw_principals(id), performed_on TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX mw_workouts_owner_date ON mw_workouts(athlete_id,performed_on DESC,id);
CREATE TABLE mw_account_requests(id TEXT PRIMARY KEY, athlete_id TEXT NOT NULL REFERENCES mw_principals(id), kind TEXT NOT NULL CHECK(kind='deletion'), state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','completed','denied')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TEXT);
CREATE UNIQUE INDEX mw_one_pending_deletion ON mw_account_requests(athlete_id) WHERE state='pending';
