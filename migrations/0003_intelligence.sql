-- MONTE WO Intelligence Command Center — additive, no athlete data.
-- Apply only to a dedicated, configured D1 database after reviewing production bindings.
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS intel_checks (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL CHECK(agent IN ('ARGON','ULTRON','AU')),
  target TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ok','degraded','down','not_configured','error')),
  latency_ms INTEGER,
  http_status INTEGER,
  detail TEXT NOT NULL DEFAULT '',
  evidence_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(evidence_json)),
  checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS intel_checks_target_time ON intel_checks(target, checked_at);

CREATE TABLE IF NOT EXISTS intel_incidents (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  agent TEXT NOT NULL CHECK(agent IN ('ARGON','ULTRON','AU')),
  severity TEXT NOT NULL CHECK(severity IN ('info','low','medium','high','critical')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)),
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','investigating','resolved','dismissed')),
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS intel_incidents_status_severity ON intel_incidents(status,severity,last_seen);

CREATE TABLE IF NOT EXISTS intel_briefings (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('urgent','daily','weekly')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  delivery_status TEXT NOT NULL DEFAULT 'not_configured' CHECK(delivery_status IN ('sent','failed','not_configured'))
);

CREATE TABLE IF NOT EXISTS intel_agent_runs (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL CHECK(agent IN ('ARGON','ULTRON','AU')),
  run_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ok','partial','failed','not_configured')),
  summary TEXT NOT NULL,
  evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)),
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS intel_automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  action_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  explicitly_approved_by TEXT,
  approved_at TEXT,
  rollback_plan TEXT NOT NULL,
  last_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS intel_audit (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  outcome TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(detail_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
