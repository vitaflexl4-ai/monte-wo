-- Native (Capacitor) sign-in handoff codes. Operational table (like mw_rate_limits): short-lived,
-- single-use, deleted on redemption or expiry. Holds no achievement data; nothing here awards ranks.
-- Inert unless NATIVE_CLIENTS_ENABLED="true" (server/native.js). Apply after 0002.
CREATE TABLE mw_native_auth_codes(code_hash TEXT PRIMARY KEY, subject TEXT NOT NULL REFERENCES mw_principals(subject), challenge TEXT NOT NULL, token TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX mw_native_auth_codes_expiry ON mw_native_auth_codes(expires_at);
