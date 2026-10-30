-- MONTE WO Intelligence Command Center — operational layer (additive on 0003_intelligence.sql).
-- Apply to the dedicated intelligence D1 database only. No athlete or waitlist data.
PRAGMA foreign_keys=ON;

-- Server-side operator authorization. Cloudflare Access authenticates the identity;
-- this table authorizes it. An authenticated Access user without an active row is refused.
CREATE TABLE IF NOT EXISTS intel_operators (
  subject TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('admin','viewer')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Incident lifecycle columns: dedup counters, failure/recovery streaks, bounded autonomy.
ALTER TABLE intel_incidents ADD COLUMN occurrence_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE intel_incidents ADD COLUMN streak_fail INTEGER NOT NULL DEFAULT 0;
ALTER TABLE intel_incidents ADD COLUMN streak_ok INTEGER NOT NULL DEFAULT 0;
ALTER TABLE intel_incidents ADD COLUMN auto_resolve INTEGER NOT NULL DEFAULT 0 CHECK(auto_resolve IN (0,1));
ALTER TABLE intel_incidents ADD COLUMN correlation_group TEXT;
ALTER TABLE intel_incidents ADD COLUMN escalated_at TEXT;
ALTER TABLE intel_incidents ADD COLUMN updated_by TEXT;
CREATE INDEX IF NOT EXISTS intel_incidents_correlation ON intel_incidents(correlation_group);

-- ARGON intake. Untrusted client telemetry: no user identifiers, no free-form text,
-- no message contents, no location. Bounded enums and whitelisted detail keys only.
CREATE TABLE IF NOT EXISTS intel_telemetry_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK(event_type IN ('session_start','app_crash','js_error','http_error','login_failed','slow_interaction','feature_used')),
  app_version TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('android','ios')),
  fingerprint TEXT NOT NULL DEFAULT '',
  session_ref TEXT,
  duration_ms INTEGER,
  detail_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(detail_json)),
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS intel_telemetry_time ON intel_telemetry_events(occurred_at);
CREATE INDEX IF NOT EXISTS intel_telemetry_version ON intel_telemetry_events(app_version,event_type);
CREATE INDEX IF NOT EXISTS intel_telemetry_fingerprint ON intel_telemetry_events(fingerprint);

-- Daily aggregate metrics (visitor analytics, app usage). Aggregate only, never per-visitor.
CREATE TABLE IF NOT EXISTS intel_metric_rollups (
  metric_date TEXT NOT NULL,
  metric TEXT NOT NULL,
  dimension TEXT NOT NULL DEFAULT 'all',
  source TEXT NOT NULL,
  value REAL NOT NULL,
  PRIMARY KEY (metric_date, metric, dimension, source)
);

-- Delivery log for urgent alerts and briefing notifications.
CREATE TABLE IF NOT EXISTS intel_notifications (
  id TEXT PRIMARY KEY,
  briefing_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('sent','failed','blocked-rule-disabled','not_configured')),
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Keyed rate limits (hashed keys only; no raw IPs or identifiers stored).
CREATE TABLE IF NOT EXISTS intel_rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS intel_rate_expiry ON intel_rate_limits(window_start);

-- Operator-visible settings with defaults (retention, thresholds). Values are strings.
CREATE TABLE IF NOT EXISTS intel_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO intel_settings(key,value) VALUES
  ('retention_checks_days','30'),
  ('retention_telemetry_days','60'),
  ('retention_notifications_days','90');

-- Bounded autonomy: every automated action maps to a named rule that is DISABLED until an
-- administrator explicitly approves it. Approvals are recorded in intel_audit by the API layer.
-- No rule authorizes production deployments, destructive operations or account actions.
CREATE TABLE IF NOT EXISTS intel_automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK(action_type IN ('auto_resolve_recovered','retention_purge','urgent_notification')),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  explicitly_approved_by TEXT,
  approved_at TEXT,
  rollback_plan TEXT NOT NULL,
  last_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT OR REPLACE INTO intel_automation_rules(id,name,description,action_type,enabled,rollback_plan) VALUES
  ('auto-resolve-recovered-targets',
   'Auto-resolve recovered website incidents',
   'When ULTRON records two consecutive successful checks for a target with an open availability incident, mark that incident resolved with recovery evidence. Without this rule, recoveries are only suggested and a human confirms them.',
   'auto_resolve_recovered',0,
   'Reopen the incident from the Incidents view; the full check history and evidence are retained in intel_checks and intel_incidents.'),
  ('retention-purge',
   'Automatic retention purge',
   'Daily deletion of raw health checks, telemetry events and delivery logs older than the configured retention windows. Incidents, briefings, audit records and aggregate rollups are never deleted by this rule.',
   'retention_purge',0,
   'Purged raw rows cannot be restored; aggregate rollups and incident history are unaffected. Disable the rule to return to manual-only deletion.'),
  ('urgent-notification',
   'Urgent alert delivery',
   'Attempt webhook delivery of urgent briefings when a monitored target escalates to critical. The destination URL and signing secret are stored as Worker secrets, never as public variables.',
   'urgent_notification',0,
   'Disable the rule; already-delivered messages can be ignored. Delivery attempts are logged in intel_notifications.');
