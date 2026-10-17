# MONTE WO native pilot — backend operations

**Status: source implemented; no remote configuration or migration executed.** The repository is static Cloudflare Pages + Pages Functions + D1, not a Next.js/PostgreSQL app. This work does not introduce another account system or rank engine. Web and native use the same `mw_principals`, profiles, performances, results, rules, reviews and private evidence.

## Existing infrastructure boundaries

- Preserve `vitaflex-monte-wo`, existing public assets and the `vitaflexl4-ai/monte-wo` repository.
- `DB` is the waitlist binding. Never put application tables in `monte-wo-waitlist`.
- `APP_DB` must point to the verified dedicated application database. Do not create an alternative copy of existing athlete data. First locate/verify the actual application DB and its schema. If none exists, its provisioning remains an owner decision.
- `flex-ai-db` is off-limits. No migrations or queries were executed against it.
- `RANKING_EVIDENCE` is private evidence storage. It must not be the public workout-media bucket. The intended public bucket `montewo-workouts` and existing `gifs/` media integration are unchanged/unverified.
- `SITE_ORIGIN` remains unset. No domain, DNS, active binding, database ID or production secret was added.

## Compatibility change — deliberate and fail-closed

`handleStrength` selects `APP_DB` rather than silently reusing `DB`. An explicit `RANKING_LEGACY_DB_ENABLED=true` can preserve an older **application-only** DB binding during a controlled migration; it is never permission to use the waitlist DB. Native services require a distinct APP_DB and never use the legacy fallback. Native readiness and private requests also inspect the schema: the mobile session table must exist and a `waitlist` table must not. This catches misbound aliases even when the two binding objects differ. The existing web API still requires the operator to verify the actual APP_DB resource identity.

This means an old ranking deployment that only has `DB` will need its existing application database bound as `APP_DB` before the API is enabled. The inspected public deployment already reported ranking unavailable; this source delivery does not activate it. Endpoint payloads, identity subjects, roles, immutable history and the rank engine remain unchanged.

Original hash-baseline files remain intact. `authorized-protected-changes.json` pins exactly three exceptions: API entry binding, mobile router dispatch, and correction of an unsafe historical config comment. Tests still compare every other protected file with its original hash.

## Schema prerequisite and controlled installation

1. Inventory the owner's actual D1 resources and active Pages bindings. Confirm the dedicated application DB identity and back it up securely.
2. Inspect its `sqlite_master`, migrations and row counts. Do not apply historical migrations blindly.
3. `migrations/0002_strength_index.sql` is the existing application schema. If that schema is already installed, **do not rerun it**. If the verified application DB is empty, review/apply only this explicit file there, not the waitlist migration directory. It seeds draft methodology, not approved ranks.
4. Apply **only** `migrations/mobile/0003_mobile_sessions_workouts.sql` to that same application DB after confirming the prerequisite tables. New tables: grants, sessions, workouts, account requests. Back up first; no automatic destructive down migration is supplied.
5. Bind the same DB as `APP_DB` for both web and native. Keep the waitlist DB separate.

No command in this package automatically selects a remote database or applies all migrations. The old root `db:local` script is historical and not an application-production migration procedure.

## Required deployment configuration

Set with the owner's authenticated Cloudflare account, using encrypted secret storage where applicable:

| Setting | Purpose |
|---|---|
| `MOBILE_ENABLED=true` | Native pilot gate; leave off until integration/security checks pass |
| `RANKING_ENABLED=true` | Existing shared pilot gate |
| `APP_DB` | Verified isolated application binding |
| `MOBILE_SESSION_KEY` | Secret: 32 cryptographically random bytes encoded as 64 hexadecimal characters; create/store privately, never in source or EXPO_PUBLIC |
| `RANKING_ACCESS_ISSUER` | Existing HTTPS `*.cloudflareaccess.com` issuer |
| `RANKING_ACCESS_AUD` | Existing Access application audience |
| `MOBILE_REDIRECT_URIS` | Default `montewo://auth`; fixed allowlist only |
| `RANKING_EVIDENCE` | Existing/private evidence bucket binding, if uploads are enabled |

Do not change publication flags/digests. Draft standards stay draft.

### Access boundary

Protect **`/api/mobile/auth/authorize`** with the existing Access identity policy. It validates the signed provider assertion and existing active principal; neither mobile nor a role header can provision itself. Do not place all `/api/mobile/*` behind an interactive Access redirect: native token exchange/API routes authenticate using their opaque Bearer session in the Function. Keep existing web `/api/strength/*` Access protections and readiness/catalog exceptions.

Native sign-in uses browser-based S256 PKCE, random state, a 120-second single-use code, an exact redirect allowlist and an expiring opaque session. Provider assertions are AES-GCM encrypted at rest; native token hashes, not raw tokens, are stored. SecureStore keeps native sessions on-device. Sessions expire no later than the provider assertion or eight hours; no silent refresh is implemented. Re-authenticate when expired. Disabling a principal invalidates its access. Rotating the encryption key invalidates existing sessions: coordinate this operation.

The browser QA export is not the production web account client. It holds a session in memory only and defaults to disabled sign-in. Enabling its optional browser callback would require separately allowing the exact HTTPS `/mobile/` URI and testing popup behavior. Production native sign-in requires a build with the custom URI scheme; Expo Go is not the acceptance environment.

## API contract

| Route under `/api/mobile` | Behavior |
|---|---|
| GET `/config`, `/exercises` | Public readiness; canonical 14-guide catalog |
| GET `/auth/authorize` | Access-protected PKCE browser bridge |
| POST `/auth/token` | Single-use code exchange |
| POST `/auth/logout` | Revoke the current bearer session |
| `/strength/*` | Existing API, owner/reviewer rules and rank engine, unchanged |
| GET `/workouts?before=…` | Owner-only history, 50 records/page, opaque returned cursor |
| POST `/workouts` | Validated UUID/date/catalog sets; same ID/body retry deduplication |
| DELETE `/workouts/:id` | Owner-only workout deletion; performance records unaffected |
| POST `/account/deletion-request` | Explicit confirmation; idempotent **pending** request |

Workout inputs are bounded (30 exercises, 20 sets per exercise, whole reps, decimal load, kg/lb, body ≤64 KiB). Those are software limits, not approved training standards. Training logs never create results or ranks. Native requests revalidate the provider assertion and principal; existing review and self-approval defenses remain authoritative. Same-origin browser checks are retained. Every authenticated operation is rate-limited, except session revocation. Before public launch add operational abuse monitoring and authentication endpoint rate policies at the edge.

Evidence: user-selected MP4, maximum 20 MiB, private storage. The existing MP4 header check is not a complete malware/content safety pipeline. Native playback, interrupted upload behavior, device file cleanup and slow networks still require real-device QA. Existing upload endpoint does not implement resumable uploads.

## Account deletion is NOT finished erasure

The endpoint creates a tracked request and returns `pending`. It does not delete principals, evidence, immutable histories or backups. Before public release the operator must implement/test an auditable erasure/anonymization workflow consistent with immutable records, define lawful retention, handle provider backups, verify identity and respond to the requester. Do not mark requests completed until that work has actually happened. The public `/delete-account/` support path remains available without signing in. No completion deadline is invented.

## Production rollout / rollback

- Complete staging integration with the actual Access policy, D1 binding and private R2 bucket before enabling mobile services. Local SQLite tests do not prove cloud configuration.
- Deploy only from the verified ZIP/repository root after authenticating on the owner's machine:
  `npx wrangler pages deploy public --project-name vitaflex-monte-wo --branch main --commit-dirty=true`
- Pages deploy does **not** accept `--config`. Preserve the current project and bindings; inspect the deployment and `/api/mobile/config` afterward. Deployment was not performed in this session.
- Rollback: disable `MOBILE_ENABLED`, revert the Pages deployment if needed; retain DB records and signing identity. Do not drop tables or alter unrelated resources to roll back.
