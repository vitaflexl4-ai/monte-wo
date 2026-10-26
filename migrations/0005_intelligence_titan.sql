-- 0005_intelligence_titan.sql — TITAN continuous app-improvement agent (Phase 2).
-- Stores the prioritized improvement backlog. Human decisions are authoritative:
-- decisions are preserved across re-runs (items are keyed by evidence_key).
CREATE TABLE IF NOT EXISTS intel_improvement_items (
  id TEXT PRIMARY KEY,
  evidence_key TEXT NOT NULL,          -- stable dedupe key; re-runs update evidence, never reset decisions
  title TEXT NOT NULL,
  area TEXT NOT NULL,                  -- navigation|onboarding|login|recording|strength|ranking|errors|accessibility|performance|data|dependencies|screens
  problem TEXT NOT NULL,
  evidence_json TEXT NOT NULL,         -- machine evidence: file:line refs, counts, telemetry ids (never fabricated)
  evidence_type TEXT NOT NULL,         -- static-analysis | telemetry | manual-review
  confidence REAL NOT NULL,            -- 0..1 — confidence the problem is real, given evidence
  proposed_change TEXT NOT NULL,
  benefit TEXT NOT NULL,
  cost TEXT NOT NULL,                  -- effort to implement
  risk TEXT NOT NULL,                  -- low | medium | high
  approval_flags_json TEXT NOT NULL DEFAULT '[]',  -- e.g. ["ranking-affecting","major-redesign","migration","destructive","sensitive-data","production-release"]
  test_plan TEXT NOT NULL,
  rollback_plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed', -- proposed|approved|rejected|parked|in-progress|implemented|rechecked|failed
  priority REAL NOT NULL,             -- deterministic score; higher = do sooner
  decision_note TEXT,
  decided_by TEXT,
  decided_at TEXT,
  implemented_at TEXT,
  implement_note TEXT,
  rechecked_at TEXT,
  recheck_result_json TEXT,           -- {passed, checks_json, summary}
  agent_run_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_intel_improvements_status ON intel_improvement_items(status, priority DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_intel_improvements_evidence ON intel_improvement_items(evidence_key);

-- Register TITAN in the agent-run log. SQLite CHECK constraints cannot be altered,
-- so the table is rebuilt in place, preserving all existing rows.
DROP TABLE IF EXISTS intel_agent_runs_rebuild;
CREATE TABLE intel_agent_runs_rebuild (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL CHECK(agent IN ('ARGON','ULTRON','AU','TITAN')),
  run_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ok','partial','failed','not_configured')),
  summary TEXT NOT NULL,
  evidence_json TEXT NOT NULL CHECK(json_valid(evidence_json)),
  started_at TEXT NOT NULL,
  finished_at TEXT
);
INSERT INTO intel_agent_runs_rebuild SELECT id,agent,run_type,status,summary,evidence_json,started_at,finished_at FROM intel_agent_runs;
DROP TABLE intel_agent_runs;
ALTER TABLE intel_agent_runs_rebuild RENAME TO intel_agent_runs;
