-- ROLLBACK for migrations/0008_agent_api.sql (Agent API). Kept outside migrations/ on purpose:
-- `wrangler d1 migrations apply` must never pick it up. Run it only by hand, against the AGENT_DB database,
-- after `AGENT_API_ENABLED` has been removed from the Pages project (so no request can write while you drop).
--
-- 0. Backup first (owner, from a machine with `npx wrangler login`):
--      npx wrangler d1 export <AGENT_DB_NAME> --remote --output backup-agent-$(date +%F).sql
--    D1 Time Travel (point-in-time restore, 30 days on paid / 7 days on free plans) is an additional safety net:
--      npx wrangler d1 time-travel info <AGENT_DB_NAME>
--      npx wrangler d1 time-travel restore <AGENT_DB_NAME> --timestamp <ISO-8601 before the change>
-- 1. Apply (idempotent — every statement tolerates the object being absent):
--      npx wrangler d1 execute <AGENT_DB_NAME> --remote --file docs/release/sql/0008_agent_api.rollback.sql
-- 2. Only if the migration was recorded by `wrangler d1 migrations apply` (a d1_migrations table exists — the
--    Intelligence deploy script applies files with `d1 execute --file` and keeps no such rows), also run by hand:
--      npx wrangler d1 execute <AGENT_DB_NAME> --remote --command "DELETE FROM d1_migrations WHERE name='0008_agent_api.sql'"
--    (not part of this file: SQLite rejects the statement when the table does not exist).
--
-- Scope: ONLY the four Agent API tables. mw_principals/mw_audit rows created by `scripts/agent-key.mjs --role`
-- live in the Strength database (APP_DB) and are NOT touched: the Strength Index audit trail is append-only by design;
-- deactivate such principals instead:  UPDATE mw_principals SET active=0 WHERE subject LIKE 'agent:%';

DROP TRIGGER IF EXISTS mw_agent_audit_no_update;
DROP TRIGGER IF EXISTS mw_agent_audit_no_delete;
DROP INDEX IF EXISTS mw_agent_audit_key;
DROP TABLE IF EXISTS mw_agent_kv;
DROP TABLE IF EXISTS mw_agent_rate;
DROP TABLE IF EXISTS mw_agent_audit;
DROP TABLE IF EXISTS mw_agent_keys;
