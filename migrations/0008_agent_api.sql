-- 0008: Agent API (operator-issued keys for automation). Additive and operational only:
-- no achievement, standards, review or audit table of the Strength Index is touched.
-- Target database: the AGENT_DB binding (its own database, or the intelligence database) — never the waitlist database.
-- Numbered 0008 because 0003–0006 belong to the Intelligence Command Center and 0007 to native sign-in codes.
-- Keys are stored as SHA-256 hashes of the secret part; the plaintext key is displayed once by scripts/agent-key.mjs.
-- principal_id refers to mw_principals(id) in the Strength database (APP_DB); it may live in another database, so the
-- link is validated at request time by server/agent.js (active principal required) instead of a foreign key.
CREATE TABLE mw_agent_keys(
 id TEXT PRIMARY KEY CHECK(length(id)=16),
 name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 secret_hash TEXT NOT NULL UNIQUE CHECK(length(secret_hash)=64),
 scopes TEXT NOT NULL DEFAULT '[]',
 principal_id TEXT,
 allowed_ips TEXT,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
 note TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at TEXT,
 revoked_at TEXT
);
CREATE TABLE mw_agent_rate(key_id TEXT PRIMARY KEY REFERENCES mw_agent_keys(id), window INTEGER NOT NULL, attempts INTEGER NOT NULL);
CREATE TABLE mw_agent_audit(
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT NOT NULL UNIQUE,
 key_id TEXT,
 method TEXT NOT NULL,
 route TEXT NOT NULL,
 status INTEGER NOT NULL,
 outcome TEXT NOT NULL,
 detail TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX mw_agent_audit_key ON mw_agent_audit(key_id,seq);
CREATE TRIGGER mw_agent_audit_no_update BEFORE UPDATE ON mw_agent_audit BEGIN SELECT RAISE(ABORT,'append-only-record'); END;
CREATE TRIGGER mw_agent_audit_no_delete BEFORE DELETE ON mw_agent_audit BEGIN SELECT RAISE(ABORT,'append-only-record'); END;
-- Shared agent memory (coordination between agents: locks, checkpoints, incident notes). Values are JSON text.
CREATE TABLE mw_agent_kv(
 key TEXT PRIMARY KEY CHECK(length(key) BETWEEN 1 AND 128),
 value TEXT NOT NULL CHECK(length(value)<=65536),
 version INTEGER NOT NULL DEFAULT 1,
 updated_by TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
