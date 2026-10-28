-- 0006_intelligence_v2.sql — MONTE WO Intelligence Command Center v2 (Coordinated Intelligence).
-- Adds:
--   1. intel_incident_notes: append-only investigation ledger (hypotheses, AU challenges, evidence, decisions).
--   2. Web platform ('web') support in intel_telemetry_events so /mobile/ web sessions feed ARGON alongside Android/iOS.
--   3. Fourth bounded, reversible automation rule: quarantine-anomalous-ingest-burst (disabled by default).
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS intel_incident_notes (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  author TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK(entry_type IN ('note','hypothesis','challenge','evidence','decision','verification')),
  body TEXT NOT NULL,
  confidence REAL CHECK(confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_intel_incident_notes_incident ON intel_incident_notes(incident_id, created_at DESC);

-- Rebuild intel_telemetry_events to allow platform IN ('android','ios','web') while preserving all existing rows.
DROP TABLE IF EXISTS intel_telemetry_events_rebuild;
CREATE TABLE intel_telemetry_events_rebuild (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK(event_type IN ('session_start','app_crash','js_error','http_error','login_failed','slow_interaction','feature_used')),
  app_version TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('android','ios','web')),
  fingerprint TEXT NOT NULL DEFAULT '',
  session_ref TEXT,
  duration_ms INTEGER,
  detail_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(detail_json)),
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO intel_telemetry_events_rebuild
  SELECT id, event_type, app_version, platform, fingerprint, session_ref, duration_ms, detail_json, occurred_at, received_at
  FROM intel_telemetry_events;
DROP TABLE intel_telemetry_events;
ALTER TABLE intel_telemetry_events_rebuild RENAME TO intel_telemetry_events;
CREATE INDEX IF NOT EXISTS intel_telemetry_time ON intel_telemetry_events(occurred_at);
CREATE INDEX IF NOT EXISTS intel_telemetry_version ON intel_telemetry_events(app_version,event_type);
CREATE INDEX IF NOT EXISTS intel_telemetry_fingerprint ON intel_telemetry_events(fingerprint);

-- Rebuild intel_automation_rules if an earlier CHECK constraint restricts action_type, preserving operator approvals.
DROP TABLE IF EXISTS intel_automation_rules_rebuild;
CREATE TABLE intel_automation_rules_rebuild (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK(action_type IN ('auto_resolve_recovered','retention_purge','urgent_notification','quarantine_ingest_burst')),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  explicitly_approved_by TEXT,
  approved_at TEXT,
  rollback_plan TEXT NOT NULL,
  last_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO intel_automation_rules_rebuild
  SELECT id, name, description, action_type, enabled, explicitly_approved_by, approved_at, rollback_plan, last_run_at, created_at
  FROM intel_automation_rules;
DROP TABLE intel_automation_rules;
ALTER TABLE intel_automation_rules_rebuild RENAME TO intel_automation_rules;

INSERT OR IGNORE INTO intel_automation_rules(id,name,description,action_type,enabled,rollback_plan) VALUES
  ('quarantine-anomalous-ingest-burst',
   'Auto-throttle anomalous telemetry bursts (15m)',
   'When ARGON or ULTRON detects a runaway client loop or spoofed telemetry flood (>25 events per session ref or sustained rate-limit spikes), temporarily tighten per-client intake limits by 75% for 15 minutes. Never blocks normal website or app traffic.',
   'quarantine_ingest_burst',0,
   'Expires automatically after 15 minutes, or revoke the rule in Automation Governance to immediately clear ingest_quarantine_until in intel_settings.');

INSERT OR IGNORE INTO intel_settings(key,value) VALUES
  ('retention_pulse_rollup_days','365'),
  ('slow_interaction_threshold_ms','1200'),
  ('ingest_quarantine_until','');
