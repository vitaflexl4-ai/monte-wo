# MONTE WO Strength Index™ — implementation report

**Version:** 0.5.0 · **Date:** 12 October 2026
**Operator:** VitaFlex Business Group
**Message:** MEASURE. PROVE. EARN. CLIMB.
**Release decision:** implemented software with draft standards; **NOT ready to launch official rankings**.

## 1. Existing architecture found

The repository is the existing Monte Wo Cloudflare Pages project: static HTML/CSS/ES modules, Python page generators, a Pages Function API dispatcher, D1 waitlist storage and optional public R2 exercise media. It already contained a trilingual landing page, six working calculators, the exercise library, supplied rank artwork, legal/company pages and offline static caching. There was no athlete authentication, rank-record database, private evidence storage or reviewer system.

No replacement application/framework was introduced. The prior allometric 1–1000 demo was explicitly retired because it was unvalidated. Its inputs are not promoted into earned achievements; its historical source is clearly archived outside public assets.

## 2. Actual features implemented

- Exactly four launch disciplines: **Barbell Squat, Barbell Bench Press, Barbell Deadlift, Strict Biceps Curl**. No total, average or cross-discipline rank.
- Deterministic fixed-point/rational calculations, exact kg/lb conversion and exact threshold comparison without upward rounding into a tier.
- Configurable bodyweight-node threshold tables and age/sex-reference categories, with strict rank order and no extrapolation. These are a computational format, not approved athletic norms.
- Actual-single versus optional exercise-specific Epley handling; estimation requires an approved range/configuration. Every bundled estimator is disabled for ranking.
- Versioned draft MONTE Standard rules covering variation/equipment, execution, invalid attempts, review visibility and safety.
- Provisional and verified achievement separation; the highest tier whose complete criteria are met is selected. A reported higher review-gated tier cannot become verified automatically.
- MONTE Climb Scale derived from an approved performance interval, floored display, no percentage for drafts. A genuine 100% load criterion cannot bypass outstanding verification requirements.
- Immutable profile revisions, submissions, calculations, correction references, review decisions and rank-history events.
- Profile-change scenarios for the latest submission in each discipline, explicitly hypothetical and non-awarding. Earlier results remain unchanged; current cards require the current profile revision.
- Private authenticated MP4 evidence ingestion, generated object keys, SHA-256, owner/reviewer read restrictions and no-store delivery through a separate R2 binding.
- Pending/approved/rejected/flagged evidence decisions, exact rulebook references, optimistic concurrency and protection against stale calculations reviving an outdated verification. Re-uploading does not clear a rejection hold.
- Authorized review queue, draft model/rulebook editor, immutable version register, controlled publication and audit viewer. No rank-award dropdown or administrative rank override.
- Cryptographic Cloudflare Access JWT validation and active server-side principal roles; no local bypass for ranking. An operator provisioning CLI is included.
- Independent publisher and separately allowlisted exact document digest before release. Empty draft thresholds cannot publish. Public methodology catalog exposes version information, never athlete records.
- Mobile-friendly public discipline cards, methodology/rulebooks, nine original badge identities, athlete history/forms and administrative API clients. Real private forms remain gated until infrastructure is configured.
- Existing exercise library, calculators, waitlist, public media route, company pages and offline functionality preserved.

## 3. Files and database changes

### New core files
- `server/strength/engine.js` — eligibility, validation, model checks, exact arithmetic, per-discipline selection.
- `server/strength/auth.js` — verified Access identity and D1 roles.
- `server/strength/api.js` — actual scoped API/database/evidence/governance workflows.
- `migrations/0002_strength_index.sql` — additive D1 migration.
- `content/strength/disciplines.json` and eight per-discipline draft model/rulebook JSON files.
- `scripts/build_strength.py`, `scripts/calibration_diagnostics.py`, `scripts/strength-admin.mjs`.
- `public/strength.js`, `public/strength.css`, `public/strength-catalog.json`.
- Generated `/strength/`, `/strength/admin/`, `/methodology/` and revised `/strength-ranks/`.
- `tests/strength-engine.test.js`, `tests/strength-api.test.js`, `tests/strength-calibration.test.js`, synthetic fixtures/SQLite adapter, `tests/strength-browser.mjs`, `tests/strength-ui.mjs`.
- `docs/strength/AUDIT.md`, `METHODOLOGY.md`, `OPERATIONS.md`, this report and the clearly retired demo archive.

### Adapted existing files
API dispatcher; canonical rank metadata/helpers; homepage/practice calculator/translations; company/tools generators; privacy/about/FAQ/deletion explanations; navigation; manifest; SW v9; portable exporter; package scripts; configuration comments; README; legacy regression tests updated to assert **no** unapproved rank awards.

### Database entities
`mw_principals`, `mw_profiles`, `mw_disciplines`, `mw_rank_definitions`, `mw_rulebooks`, `mw_models`, `mw_publications`, `mw_performances`, `mw_evidence`, `mw_reviews`, `mw_results`, `mw_rank_history`, `mw_audit`, `mw_rate_limits`.

Constraints/indexes cover identity, ownership, discipline references, versions, review revisions and allowed statuses. Append-only triggers reject updates/deletes of achievement and governance history. Additional guards reject self-approval, wrong-owner evidence/profiles, incorrect rulebooks, draft-rulebook approval, unofficial rank results and stale review calculations. D1 batch writes keep related events atomic. Existing waitlist tables remain intact.

The additive migration was applied successfully to the **local Wrangler D1 database** (66 commands). No remote migration was run. No production principals, performances, approved models or evidence were seeded.

## 4. Methodology and approval status

The implementation supports versioned `bodyweight-lookup-v1` tables with exact rational interpolation between approved bodyweight nodes, age/sex categories and optional explicitly approved Epley ranges. A diagnostic script compares exploratory normalization candidates on de-identified input with an athlete-level holdout. It does not choose thresholds or scientifically certify a model.

**All four launch models and rulebooks remain DRAFT — NOT OFFICIAL.** The nine old score intervals and universal demonstration exponent are no longer used to grant ranks. All four model files contain **empty category/threshold tables** and `estimate: null`.

The evidence review and original calibration protocol are documented in `METHODOLOGY.md`, with source links and limitations. No real calibration dataset was downloaded/fitted in this implementation; the diagnostics were tested only on synthetic software fixtures. No scientific-validation claim is made.

## 5. Source and validation status of official threshold tables

**There are no official threshold tables.**

| Discipline | Current version | Data source status | Approval |
|---|---|---|---|
| Barbell Squat | squat-model-draft-1 | Candidate competition and prospective training cohorts identified; not analyzed | Draft |
| Barbell Bench Press | bench-model-draft-1 | Candidate competition and prospective training cohorts identified; not analyzed | Draft |
| Barbell Deadlift | deadlift-model-draft-1 | Variation-filtered competition and prospective cohorts needed | Draft |
| Strict Biceps Curl | curl-model-draft-1 | Dedicated standardized cohort needed | Draft |

OpenPowerlifting is a possible powerlifting input source, not a universal gym population or a strict-curl calibration source. No competitor formula or threshold table was copied. Any definition of exceptional Titan/Lejand performance must be supported by the eventual evidence and independent approval, not quotas or engagement targets.

## 6. Tests executed and results

### Automated unit/integration suite
**54 tests passed; 0 failed.** `npm test` includes:
- Nine identities/order and retirement of automatic 488 → Fò demo awards.
- 108 synthetic boundary comparisons: below/exactly/above every rank threshold for every launch discipline.
- Invalid/missing/extreme inputs, date, form, variation, equipment, units and supported categories.
- Actual single versus approved-range estimate, no extrapolation and deterministic arithmetic.
- Verification criteria, 99% non-promotion, 100% numeric criterion without review bypass.
- Profile scenarios and immutable history, independent disciplines and methodology-version changes.
- Real RSA-signed token verification and forged/expired/incorrect issuer/audience rejection.
- Real SQLite schema/trigger/API workflow tests through a D1-compatible adapter in temporary databases.
- Private evidence ownership, pending/rejected/re-upload/review history, self-approval denial, role checks, CSRF, rate limiting, publication controls and stale-review defense.
- Synthetic calibration-harness diagnostics, no generated rank standards.
- Existing tool math, waitlist and public R2 tests.

### Browser/regression suites — all passed
| Suite | Coverage |
|---|---|
| Homepage | Three languages, 18 responsive combinations, estimates/units/persistence, dialogs, navigation, offline behavior |
| Phase 1 | Eight routes / 32 layouts, legal/deletion UI, real local-D1 signup and deduplication, offline signup block |
| Phase 2 | Six calculators / 48 layouts, conversion, validation, reset, stale results, offline calculation |
| Exercise library | Seven groups, 14 guides, 22 routes × four widths, aliases/filters/sort, no-JS fallback, offline navigation |
| Rank assets | Nine supplied identity mappings; no fabricated mockup/calculator award |
| Strength Index | Four draft cards, four rulebooks, no official rank/progress, nine badges, 20 responsive layouts, disabled private service behavior, offline public rulebooks |
| Authenticated UI simulation | Explicit synthetic API responses: higher provisional Fò remains separate from verified Solid; correct badges and restricted governance display |
| Portable preview | Nested network-free sandbox, four draft cards/rulebooks, blocked private services, nine embedded badges, working educational estimate/library/six tools; zero HTTP requests and JS errors |

The authenticated UI simulation is **not** evidence of real Cloudflare Access deployment. API authorization tests use signed test identities and isolated databases; R2 operations there use an in-memory bucket adapter. The local migration and waitlist D1 regression were separately run in Wrangler.

### Eight mandatory earned-rank cases
| Requirement | Implemented/tested outcome |
|---|---|
| 100 workouts without new qualifying performance | No eligibility change; engagement fields cannot enter the submission schema |
| Meets next valid standard | Identifies the exact qualifying tier under synthetic approved-model fixtures and verification rules |
| Invalid/incomplete lift or form | Rejected; no qualifying result |
| Bodyweight/profile change | New profile and non-awarding scenario records; old result unchanged |
| 99% toward next rank | Keeps lower rank |
| Admin arbitrary rank award | HTTP 403; denial audit recorded |
| Squat and Deadlift standards | Independent calculation/storage, even for the same qualifying load |
| Self-approval | Rejected server-side; SQL also guards approval |

## 7. Security and authorization checks

Requests cannot supply role, athlete ownership, rank or verified status. JWT signatures/claims and active D1 role lookup are required; hiding buttons is not the security boundary. Evidence is owner/reviewer scoped, private/no-store and separate from public exercise assets. Same-origin POSTs, strict schemas, size bounds, parameterized SQL, rate limits, immutable history and auditable authorization failures are implemented and tested. Publication requires both application authorization and independent release configuration.

SQLite/D1 does not provide PostgreSQL-style RLS; server scoping and SQL guards provide the application boundary. Operators with full schema/database privileges remain trusted and must be restricted operationally. No penetration test, legal certification, complete media malware scanning or real production identity integration is claimed. The npm development toolchain still reports 6 advisories (1 low, 5 high).

## 8. Remaining blockers / incomplete production features

1. Real calibration data, defensible nine-tier thresholds and external validation for each discipline.
2. Qualified rulebook review, real licensed valid/invalid visual examples and judging reliability studies.
3. Independent domain/statistical signoff and explicit policy approval for verification/category scope.
4. Cloudflare Access application/domain policy, actual principal enrollment, remote D1 migration and separate private evidence bucket—none configured remotely here.
5. Public-athlete onboarding beyond the restricted Access pilot; real sign-in deployment tests.
6. Final retention period, appeal procedure, deletion/export maintenance workflow, backups and operational monitoring before collecting real participant evidence. Automatic evidence deletion is not implemented.
7. Production security review, compatible dependency updates, ingestion scanning/transcoding and larger/range-streamed video support as needed. Pilot evidence limit is 20 MiB.
8. Dedicated emergency model withdrawal endpoint is not implemented; current emergency procedure is to disable ranking and publish a corrected version with preserved history.
9. History display is bounded (latest 2,000 calculations / 1,000 decisions; 200-submission pilot cap). Stored history remains append-only; current-rank selection does not depend on the truncated display list.
10. Native app workout sync, public leaderboards and additional ranking disciplines remain out of scope. Ranking is optional; the public library/tools remain usable without participating.

## 9. Deployment status

**Not deployed to production.** Local website preview is running on port 8080. The local D1 migration and tests succeeded. Production database, Access identity, private R2 and publishing allowlist have not been activated or verified. The portable HTML intentionally cannot collect private performances/evidence or signups.

## 10. Exact next steps to approve a release

1. Confirm the four draft variations, evidence rules, safety guidance, target adult populations and rank meanings with qualified strength professionals.
2. Acquire permissioned/provenance-tracked data; build separate discipline cohorts and a dedicated strict-curl dataset. Publish inclusion/exclusion and deduplication policies.
3. Pre-register calibration/holdout/fairness analyses. Run diagnostics and full validation; investigate category/size bias, rank gaps, uncertainty and extreme-tail support. Do not tune thresholds for engagement.
4. Validate any proposed estimate independently by discipline and repetition range; otherwise keep estimated ranking disabled.
5. Produce the eight required methodology evidence references (data, license, calibration, holdout, bias, rank meanings, population, limitations) and real judging examples/agreement results.
6. Create new immutable draft rulebook/model versions through the admin API; populate actual justified thresholds. Do not modify historical versions or test fixtures.
7. Complete independent written approval. Have a release operator configure the exact approved digests, and a different administrator publish the rulebook then model. There are no approved digests to configure today.
8. Configure and test Access, D1 and private evidence R2 in a restricted staging environment; approve retention/deletion/security operations; provision only consented pilot identities.
9. Run all tests plus real deployed identity/evidence/end-to-end checks, review migration backups and the impact/version policy, then obtain explicit authorization to deploy.
10. Roll out approved disciplines only. Keep any unsupported category or insufficiently validated discipline **DRAFT — NOT OFFICIAL**. Preserve historical results and require explicit reassessment when methodologies change.

**NO SHORTCUTS. NO FREE RANKS. EVERY RANK IS EARNED.**
