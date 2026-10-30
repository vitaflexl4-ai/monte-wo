> Follow-up (2026-10-17): the missing authenticated website workout flow and explicit native device-to-account copy are now implemented and locally tested in the [account-workouts checkpoint](../account-workouts/REVIEW.md). They remain undeployed; live sync is still unverified. The findings below describe the earlier connection-review checkpoint.

# Website ↔ app connection review — 2026-10-17

## Result and boundary

Website navigation and preview access have been repaired in the development source. Production account synchronization is **not established**. Public deployment responses differ from the earlier successfully deployed snapshot, and account services remain disabled. No production write, deployment, rollback, SQL, migration, R2 operation or authenticated Git push was performed.

## Public observations (read-only)

Fetched the following public endpoints during this review. These observations do not identify which deployment is active or prove the cause; the owner's authenticated deployment list is needed.

| Target | Observed response |
| --- | --- |
| Main site `/app/` | Older static phone illustrations, not the new interactive widget |
| Main site `/exercises/` | Older 14-guide page with animations-coming wording, not the previously verified 62-entry cockpit |
| Main site `/api/mobile/config` | `{"error":"Not implemented in this build"}` |
| Main site `/api/strength/config` | `available:false` |
| Main site `/api/waitlist/config` | `available:false`, no site key, not a local test |
| Main site `/api/status` | `r2Configured:false`, `syncAvailable:false` — this is not a bucket inventory |
| Main site `/downloads/` | Page-not-found content |
| Main site `/tools/` | Educational calculators directory available |
| Earlier deployment `/api/mobile/config` | Supported API version 1, `available:false`, `workoutSync:false`, enrolled-pilot registration |

Main origin: https://vitaflex-monte-wo.pages.dev
Earlier deployment: https://76edff20.vitaflex-monte-wo.pages.dev

A later deployment, rollback, alias difference or caching issue could explain the version mismatch. The cause has NOT been determined. Do not redeploy or change a database blindly to diagnose it.

## Preview launch bug fixed

The preview server accepted `PREVIEW_ENTRY=/app/` but redirected the root to `/mobile/`, whose export is not built. It now recognizes `/app/` explicitly. The current review server runs in website mode (`PREVIEW_ENTRY=/`), preserving Home navigation, and `/app/#app-preview` directly opens the interactive phone. This fixes a real launch issue, not just instructions about where to find a viewer.

## Website navigation repaired

- Added visible **Try the phone preview**, **Open training tools**, and **Connection status** links to home/app landing sections.
- Strength Index phone view links to the real `/strength/` page without transferring example ranks.
- Simulated history links to the actual session-only logger at `/exercises/#training-tools`; demo rows are never copied into real records.
- Muscle selection links to `/exercises/?group=<allowed-group>#library`. The full exercise cockpit validates the group against its shared catalog, selects the correct front/back view, and applies the filter. Reset removes the filter query so reload behaves consistently. Invalid values fall back to all exercises; URL/history policy failures do not break local filtering.
- App connection hub links to the logger, library, release status, waitlist and account/data support.
- Existing five primary navigation destinations remain unchanged. All 50 current local routes returned HTTP 200; existing internal-link/fragment tests passed.

## Shared connection contract and honest readiness

`shared/service-readiness.js` defines the version-1 mobile configuration contract used by the native API client and the byte-identical published web module. It is not a new account system or database.

`public/site-connections.js` checks only public readiness endpoints on its own origin, with credential-free GET requests, no redirect following, no cached availability and an 8-second timeout. It distinguishes missing routes, disabled services, unsupported responses, unreachable services and readiness. A ready result explicitly means **sign-in required**, not an authenticated account or proven cross-device sync. Waitlist readiness never means athlete enrollment. The UI displays the checked origin and the native app's default production API URL to avoid confusing preview and production results.

The native client now rejects missing/incompatible `/api/mobile/config` responses instead of treating unrecognized JSON as valid configuration. Its sign-in screen links to website connection status and shows its configured API base. Unavailable configuration or absent sessions clear stale account views while leaving device-only history separate. Public signup remains unimplemented; current authentication is the existing Access/PKCE enrolled pilot.

The public website session logger still does not authenticate or save account workouts. A supported backend configuration alone will NOT turn it into a synced history view: that authenticated web save/history flow and cross-device acceptance testing remain unfinished.

No fake connected indicator, token forwarding, cross-origin credential workaround, automatic upload, account merge or duplicate database was introduced. The live site's missing route must be resolved before the existing production application binding/schema/authentication can be verified safely.

## Checks actually run

- 151 root Node tests passed, including nine new service/connection contract tests.
- 37 native source unit tests passed and native TypeScript checking passed using the locked dependencies. Temporary tooling used the Node 20 sandbox with engine warnings; native/owner builds still require Node 22.13+.
- Browser journeys at 390, 820 and 1440 px: Home → phone preview → App → connection status → selected muscle → filtered exercise library → reset → real session logger (185 × 5 = 925 lb·reps) → Strength Index → Downloads → Home. No page overflow or uncaught script errors.
- Browser readiness cases: missing route, mocked supported-ready response, unsupported version and aborted network. Ready never claims sign-in. Invalid group parameters fail closed; Back selects the back-facing avatar.
- Existing phone regression checks passed at 320, 390, 768, 1024 and 1440 px, including locale switching, keyboard navigation, reduced motion, offline screen switching and Exercises boot.
- No native install, physical-device cross-platform login/sync or production account mutation was tested.

## Safe next owner action

`MONTE-WO-CHECK-CONNECTIONS.sh` is a standalone read-only helper: it checks public page/API markers and lists existing Cloudflare Pages deployments with pinned Wrangler. It does not download configuration, query SQL, provision resources, deploy, roll back or push Git. Shell syntax was checked; authenticated production execution remains with the owner.

For the immediate next step, the owner can simply run this read-only command without downloading another helper:

```bash
npx --yes wrangler@4.86.0 pages deployment list --project-name vitaflex-monte-wo
```

Share only the public-check summary or deployment table (IDs can be redacted). Never share tokens, OAuth callback links, private configuration files or database contents.

After identifying the actual production version/source, reconcile the dedicated source branch and preserve the current project's settings before an authorized deployment. Then verify the existing isolated APP_DB, schema and Access configuration using the procedure in `docs/mobile/OPERATIONS.md`. Do not use the waitlist DB, query flex-ai-db, apply all migrations, change approval flags or create another application database. Account erasure and public signup remain release blockers.
