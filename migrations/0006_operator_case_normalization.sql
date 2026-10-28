-- 0006: operator subject case normalization (authorization correctness).
--
-- Defect (found in production 2026-10-26): Cloudflare Access issues the JWT `sub` for
-- email logins in normalized lowercase form, while operator grants stored whatever case
-- was typed on the command line ('Jmalexis@liberty.edu' vs 'jmalexis@liberty.edu').
-- The exact-match authorization lookup in server/intelligence/auth.js could therefore
-- refuse a fully authenticated admin with 403 operator-not-provisioned.
--
-- auth.js now compares the identity case-insensitively; this migration normalizes the
-- STORED subjects so revocation commands stay predictable. Idempotent — safe to re-run.

-- Collapse case-only duplicates first: subject is the PRIMARY KEY, so a plain
-- lower(subject) UPDATE could collide two rows that differ only by case.
DELETE FROM intel_operators
 WHERE subject <> lower(subject)
   AND EXISTS (SELECT 1 FROM intel_operators AS o2 WHERE o2.subject = lower(intel_operators.subject));

-- Normalize every remaining subject to lowercase.
UPDATE intel_operators SET subject = lower(subject) WHERE subject <> lower(subject);

-- Marker read by scripts/deploy-intelligence.mjs (apply once, skip later) and surfaced
-- by GET /api/intelligence/status so operators can verify it ran in production.
INSERT OR IGNORE INTO intel_settings(key,value)
  VALUES ('migration_0006','operator subjects normalized to lowercase; authorization matches case-insensitively');
