# Account workout bridge — development checkpoint

Date: 2026-10-17. Branch: `feature/mobile-foundation`.

**Implemented and locally tested; not deployed, not activated, and not verified between physical devices.** The owner restored production deployment `76edff20` before this work. That deployment has the 62-entry cockpit and mobile API v1, but reports `available: false` and `workoutSync: false`. It does not include this checkpoint or the newer phone widget.

## What changed

### Website

- `/exercises/#account-workouts`: an optional account panel below the real logger/camera, with public readiness checks, enrolled-pilot sign-in, signed-in account ID, API origin, explicit workout review/confirmation, private history refresh and pagination, and page-session sign-out.
- Uses the same existing `/api/mobile` endpoints and the canonical workout contract as the native app. No second database, account system, ranking engine, or shadow workout API.
- Browser sign-in uses the existing S256 PKCE grant/token flow in a separate window. The parent checks both the message origin and popup identity, plus a random one-use state. Verifier, opaque session token, prepared save, and private history remain in memory only.
- Callback: `/account/callback/`. Authorization code/state are removed from the visible URL; no bearer token is sent in a redirect. The callback has no-store/no-referrer/CSP headers in the Pages `_headers` source and is excluded from service-worker navigation caching. The callback cannot independently establish a signed-in session.
- Nothing uploads on page load, readiness check, sign-in, or history refresh. Review prepares an immutable logical copy; only the separate confirmation action posts it.
- Local logger is paused while a copy is prepared. A lost response retains the same workout ID and contents for explicit retry. Local sets are cleared only after a matching server acknowledgment. Canceling an attempted retry warns that an account copy may already exist.
- A reload/navigation loses the in-memory retry ID and session. The UI warns to check account history before creating another copy. There is no offline upload queue or background sync.
- Sign-out clears private views immediately, including when server revocation fails. Failure is reported honestly. This is not a Cloudflare Access/identity-provider logout. Use the identity provider's account-switch/sign-out controls on shared computers.
- Expired/rejected sessions and changed-session responses cannot restore private records. History request errors clear the displayed records rather than presenting them as fresh.
- Module failure does not disable the session logger, muscle map, nutrition controls or camera.

### Native source

- Device history now offers **Save a copy to account**, one workout at a time, behind a confirmation naming the account and API origin. The local record stays intact. No bulk or automatic upload.
- The original stable workout ID is retained. A retry against the same account uses the server's existing idempotent acknowledgment; a conflicting ID is not overwritten or silently reassigned.
- The confirmation captures the session revision. A session change before sending prevents the write; a change during the write prevents treating the response as confirmation for the new session. Check the original account history after an ambiguous response.
- Train's existing account save now uses the same acknowledgment guard, so an unrelated/malformed receipt cannot clear its local draft as successfully saved.
- Account history displays account ID, API origin, workout IDs and an explicit refresh button, allowing comparison with the website after actual activation.
- SecureStore remains the native token store. Browser website tokens are never placed there or in browser storage. Device archives are unchanged and remain device-local and unencrypted by MONTE WO.

### Shared code / publication

- `shared/workout-transfer.js` adds explicit session-to-workout validation, acknowledgment matching and a session-bound copy helper; `.d.ts` supplies the native types.
- Existing shared `workouts.js` is unchanged. Website copies of both modules are byte-identical to their shared sources and published by the scoped cockpit generator.
- Cache: `montewo-core-v18-account-workouts`. Four new account/contract JS modules are precached; authenticated APIs and the authorization callback are not.
- App connection panel links directly to the new account section.

## Important limits

- The backend currently registers **14 canonical exercises**, not all 62 browse entries or all 57 animation IDs. Unsupported movements block the entire account save. Nothing is silently omitted, renamed or substituted. This change does not import new exercises into the backend.
- Account contract: at most 30 exercises and 20 sets per exercise; load strings and valid dates follow the shared validator. Local website logger bounds stay unchanged. A local load above the account limit of 2,204.622 lb is rejected for account export, not clamped.
- Public athlete signup and completed self-service erasure remain unfinished. Pilot enrollment is not a consumer signup launch.
- Account copying is not continuous synchronization, conflict merging, a device backup service, or a rank award. Deleting a device copy does not delete its account copy, and vice versa.
- Nothing here proves that a real Cloudflare Access login, production callback, native deep link, Android/iOS installation, or cross-device read has succeeded.

## Verification performed

- Root Node suite: **167 passed**, 0 failed.
- Final focused account/mobile API suite: **31 passed**, 0 failed.
- Native source/build-safety suite: **37 passed**, 0 failed (run from `apps/mobile`).
- Native TypeScript 6.0.3: passed. Sandbox Node 20.20.2 emitted the existing engine warning; official native builds still require Node >=22.13.0.
- Real local handler + isolated temporary SQLite fixture + synthetic signed Access identities: web PKCE save -> native bearer read; explicit native copy/retry -> web history; cross-account isolation; no rank result from workout saves. Temporary test databases are not production migrations.
- Browser account journeys at 390, 820 and 1440 px: public disabled state, popup callback, review, ambiguous-write retry with identical ID/body, history pagination, unsupported movement rejection, error/sign-out cleanup, state/source checks, cancellation, expiry, no token storage, no overflow/page errors. Authenticated browser responses are synthetic fixtures, not cloud login proof.
- Existing navigation journey: 390/820/1440 px, 50 local HTTP routes, no overflow/page errors.
- Existing phone regression: 320/390/768/1024/1440 px, EN/HT/FR switching, keyboard, reduced motion and offline tab switching.
- Real local service worker installed v18; new account modules were cached; callback query was stripped; callback and mobile API requests were absent from Cache Storage.
- Scoped cockpit/phone publishers are idempotent. No heavy website/native compilation, APK build, deployment or push was run.

See `checks.json` and `browser-checks.json` for machine-readable results.

## Required before a live sync claim

1. Reconcile this feature-branch source with the actual production branch and build command/output/root settings. The later `18a823b` deployment previously served the older public implementation; adding a root-level `preview_app.js` alone did not publish the integrated app UI. Do not re-run an older ZIP or force-reset production source.
2. Review existing private configuration **without exporting secrets**: isolated `APP_DB` versus waitlist `DB`, actual application schema, enrolled Access identities and protected authorization route, existing flags/key, API origin, and redirect allowlist. A readiness response does not identify which prerequisite is absent.
3. After owner review/authorization, the website needs the exact production callback `https://vitaflex-monte-wo.pages.dev/account/callback/` allowed in `MOBILE_REDIRECT_URIS`, while preserving `montewo://auth` and any other verified existing redirects. Do not wildcard preview hosts or automatically replace the list. This checkpoint does not change that variable. Backend readiness alone does not prove the callback is allowed.
4. Resolve deployment/activation prerequisites deliberately. **No database creation, SQL/migration, R2, DNS, or binding change is authorized by this report.** Preserve the waitlist and existing application data. Do not blindly apply migration 0002 or all migrations.
5. Deploy the reviewed website source and use a verified native development/internal build of the corresponding source. No installable artifact is supplied here.
6. Sign into the same enrolled account and API origin on both clients. Save one small web workout; refresh native Account workouts and compare its ID, exercise, units and sets. Then explicitly copy one device workout; refresh web account history and compare the same fields. Verify duplicate retry, isolation, logout/expiry and local-copy retention. Only then report live cross-device sync as verified.

No authenticated production inspection, database changes, migrations, R2 operations, domain changes, remote Git writes, real user enrollment, physical-device installation or live cloud synchronization were performed in this checkpoint.
