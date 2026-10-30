# Workout persistence checkpoint — 2026-10-16

## Delivered source changes

- Native Train now offers **Finish & save on device** without requiring a pilot account. A successful acknowledgement occurs only after persistent storage is read back and verified. The draft clears only after successful save. Invalid input or a storage error leaves the session available to correct/retry.
- History has separate **On this device**, **Account workouts**, and **Performances** views. Device workouts are never silently uploaded, assigned to an account, or used for ranks. Explicit account saving retains the existing authenticated API path and remains disabled without an available backend and signed-in principal.
- Device history uses existing Expo FileSystem document storage on native devices and localStorage plus cross-tab Web Locks in the browser. No new dependency or server database was added. History is installation/browser-profile scoped, not account-private, and is not encrypted by MONTE WO. This is disclosed in the UI. Clearing storage or uninstalling can erase it.
- Shared workout validation now lives in `shared/workouts.js`, imported by both the existing mobile API and native app. Backend error codes remain mapped to the existing StrengthError response path. Duplicate exercise groups are now rejected; sets should be grouped under one exercise ID. The existing canonical 14-guide training catalog remains distinct from the larger browse-only animation library.
- Bounds remain 30 exercises, 20 sets per exercise, whole reps 1–1000, decimal string load 0–2204.622, and kg/lb. These are software limits, not training advice or approved standards. The device archive caps at 500 workouts and one million serialized characters without silently evicting records. Volume uses integer thousandths, keeping kg and lb totals separate.
- Alternating history copies protect the last acknowledged state from an interrupted write. Corrupt data is not silently reset. Recovery from a readable older copy shows a warning. Confirmed deletion updates both copies; incomplete deletion reports an error and can be retried. This is not secure forensic erasure or OS-backup erasure.
- Save operations have a synchronous duplicate-submit guard. Native draft fields are noneditable while saving. Metro is explicitly configured to include the shared source directory.
- `scripts/preview_workout_checkpoint.py` provides a lightweight development browser harness using the same persistence/validation engine. It is explicitly NOT the native app build or a new public website deployment. Preview records use their own storage namespace. It also provides a full current source ZIP generated in memory, avoiding another persistent 6 MB archive in the size-constrained workspace.

## Tests actually run

- **137 root Node tests passed**, including existing account authentication, ownership, retry deduplication, cross-user privacy, schema isolation, evidence authorization and ranking-boundary tests, plus 18 new archive/contract tests.
- **37 existing native source unit tests passed**.
- **Native TypeScript check passed** with TypeScript 6.0.3 and the lockfile dependencies.
- Metro config loaded and resolved the shared directory.
- Shared-engine browser harness passed at 390, 820 and 1440 px: save/reload, correct 1925 lb·reps, confirmed/cancelled delete, no horizontal overflow, no console errors. Also tested storage-quota failure retaining the draft, two-tab concurrent saves without loss, corrupt storage failing closed, and a complete browser-process restart preserving history.
- Native unit/type tooling was temporarily installed outside the workspace with install scripts disabled; the Node 20 sandbox emitted engine warnings. Owner native builds require Node 22.13+. Temporary dependencies, browser downloads and test logs were removed afterward.

## Not claimed

No Expo bundle export, Android/iOS compilation, APK install, physical-device persistence test, public account signup, production account sync or production deployment was performed for this checkpoint. The existing full native-UI browser suite was not rerun; its renamed account-save button assertion was updated. The demonstrated browser checkpoint does not substitute for device acceptance testing.

Unfinished workout drafts are still session-only; only completed, explicitly saved workouts persist. No automatic sync queue, routines, meals, health integrations, official ranking approval or account-erasure implementation was added.

## Live account blocker

The deployed `/api/mobile/config` was read during this task and returned `available:false`, `workoutSync:false`, and `registration:operator-enrolled pilot only`. Source already contains the Access/PKCE pilot and owner-scoped workout endpoints, but production configuration must be verified before enabling them. Public registration is a separate unfinished feature.

Follow `docs/mobile/OPERATIONS.md`: identify and back up the actual application database; verify its schema and Access policy; keep waitlist DB and flex-ai-db untouched. Do not apply 0002 or all migrations blindly. Any explicit 0003 migration requires verified prerequisites and owner authorization. No cloud configuration, SQL, R2 operations, Git push or secret handling occurred here. GitHub connector access is unsupported in this environment; the restored source must be reconciled with the owner's existing repository rather than overwriting main blindly.

## Source recovery and production safety

The checkpoint preview's **Download full source** button provides the full current development tree, not an incremental patch. It includes native app, website, backend, shared code and tests; no Git history, installed packages, databases or credentials. `SOURCE-FILES.sha256` verifies each file. Keep it outside the previous deployment-only folder.

Do not run the root `npm run deploy` against the placeholder local Wrangler configuration. A future release must again preserve the live project settings and include `shared/` with the Functions source. Today's deployed 6ade2e0 website remains unchanged by this work. The old standalone deployment ZIP is still valid for that older snapshot, not this new native milestone.

Next acceptance step: restore this development source on the owner's Mac, reconcile it with the existing dedicated branch, then build/test on an actual device and verify the existing backend bindings before enabling pilot sync. Public signup and account erasure remain release blockers.

## Preservation and storage

Six pre-existing unrelated edits were preserved. Git objects were losslessly repacked with unreachable objects retained; no source history was pruned. Only disposable Expo image caches/logs, an old compiled Function check and automated test logs were removed. User uploads, delivered archives, credentials, signing material, databases and runtime artwork were not removed. The source archive is streamed from memory rather than stored again on disk.
