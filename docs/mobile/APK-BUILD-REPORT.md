> **Continuity update — 2026-10-16:** The owner subsequently submitted Android build `347b15cb-e1c5-4568-8b67-7a302eb54f00` from the authenticated Mac. Its last observed status was In progress; it was not rechecked during the design refresh. No APK artifact, signature or installation was verified. The preparation evidence below is historical, not a statement that no build was ever submitted. See `android-build-tracking.json` and `DESIGN-REFRESH.md`. The redesigned source is not part of that already-uploaded build.

# Android APK attempt — verified status, not a successful build report

**2026-10-15 · feature/mobile-foundation · continues source commit 4ec7aee**

## Outcome

**No APK, artifact URL, cloud build ID or verified signature exists for this attempt. No installation testing was performed.** EAS authentication did not complete. The cloud queue command was attempted and rejected before a build was queued.

The user explicitly accepted remaining build-tool risk for **internal APK testing only** after disclosure. This is not public-release approval and does not resolve those vulnerabilities.

## Authentication evidence / blocker

- CLI: `eas-cli@24.14.0`; `whoami` → `Not logged in`.
- Official device authorization was attempted twice; the user reported failure and the second resume returned `expired_token`. No password/token was requested, printed or received.
- Actual queue attempt: `build --platform android --profile preview --non-interactive --freeze-credentials --no-wait` → exit 1, “An Expo user account is required to proceed.”
- No owner identity, project UUID, remote keystore or cloud billing/quota state could be verified without authentication. Local project metadata is not proof of remote linkage.
- Next action is the official **browser login on the owner's Mac**, described precisely in `ANDROID-APK-NEXT-STEPS.md`. Local login does not transfer authentication to the assistant.

Authentication request state was kept outside the repository under a cache-only private directory; no account/signing credentials are in this delivery. Expired request URLs are not useful and are not reused in the guide.

## Configuration checked

| Item | Verified locally |
|---|---|
| Framework | Expo 57.0.30 / React Native 0.86.3 / React 19.2.3 |
| Package | `com.vitaflexbusinessgroup.montewo` (unchanged) |
| App version/code | 0.1.0 / 1 (unchanged) |
| Preview | internal distribution; `android.buildType: apk`; remote credentials |
| Build environment | explicitly `preview`; Node 22.23.3; EAS CLI 24.14.0 |
| Project linkage | dynamic `EAS_PROJECT_ID` / `EXPO_OWNER`; unset in this workspace, not remotely verified |
| Publishing | no submit/auto-submit/deploy command executed |

The production build profile remains AAB; it was not queued. The new mobile security hook blocks profiles other than the accepted Android preview while these vulnerabilities remain. It is a build-process guard, not an unbypassable security boundary or store authorization.

## Dependency remediation — partial, not a clean audit

Fresh `npm ci` reproduced 23 findings: 15 high + 8 moderate. A narrowly scoped `overrides.xcode.uuid = 11.1.1` removed the UUID advisory and its propagated findings. `xcode` uses the preserved CommonJS `uuid.v4()` API; 100 valid unique project IDs and Expo prebuild/typecheck were tested after the override. Fresh-install audit now reports **15 high, 0 moderate, 0 critical**.

Remaining roots, with registry versions and upstream advisories checked:

| Root | Problem | Status |
|---|---|---|
| `braces@3.0.3` | Deeply nested brace patterns can exhaust recursive AST walkers and crash a build process | Advisory lists all releases through 3.0.3 affected and no patched version |
| `node-forge@1.4.0` | Malformed nested DigestAlgorithm data can incorrectly pass RSA PKCS#1 v1.5 verification | Advisory lists all releases through 1.4.0 affected and no patched version |

Sources: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm and https://github.com/advisories/GHSA-86w9-cpqp-85rv . UUID: https://github.com/advisories/GHSA-w5hq-g745-h8pq . These are not fixes that can truthfully be completed with an ordinary compatible registry upgrade today. No home-grown cryptographic patch, audit omission, version-label trick or forced Expo 44 downgrade was used.

### Limited internal exception and remaining exposure

Dependency paths locate the remaining roots in Expo CLI/code-signing tooling and Metro's file-map/micromatch tools. A fresh Android JS export with source maps contains 2,928 sources and no `braces`, `node-forge` or `uuid` package sources. This narrows app-JavaScript exposure; it does **not** certify a native APK, remote EAS tooling, signing service or the whole supply chain.

For the accepted internal build: use the reviewed source/lock, only trusted build inputs, no untrusted glob patterns or certificates, no newly enabled OTA/code-signing workflow, and the established Android signing identity. Keep evidence/advisories in the build report. Treat public release as blocked pending upstream remediation or a separate qualified security review and approval.

`eas-build-pre-install` runs a fresh lock-based audit before installation/prebuild. Only the exact reviewed roots/versions/ranges may use the Android preview exception. New advisory roots, additional severities, version drift, incomplete audit data or an audit service failure stop the build. `eas-build-post-install` runs typecheck and build-safety tests. The policy logs all remaining counts and `publicReleaseAuthorized: false`; it does not turn npm audit green. This cannot remediate vulnerabilities in EAS's own pre-existing service infrastructure.

## Verification executed in this follow-up

- Fresh mobile `npm ci`: passed; patched UUID retained in the lock.
- `expo install --check`: dependencies up to date for the SDK.
- Expo Doctor: **21/21 passed**.
- TypeScript: passed.
- Expo prebuild: Android/iOS project generation passed, **not native compilation**.
- Android JavaScript export with source map: passed; affected-package absence checked.
- Official EAS JSON schema validation: passed.
- Build-safety tests: **9 passed**, including UUID interoperability and production/iOS/new-advisory rejection.
- Real preview security gate: passed only with the explicit internal exception, while still reporting 15 high findings.
- Real production security gate: rejected as expected (exit 1).
- Existing project regression tests: **107 passed**. No website regeneration or deployment was needed.

Evidence is in `docs/mobile/apk-attempt/`. The earlier `BUILD-REPORT.md` and older audit logs are historical foundation-stage evidence; they are not the current dependency count.

## Unchanged boundaries

No website, backend handler, database schema, migration application, feature flag, DNS/resource setting or production deployment was changed by this follow-up. Six pre-existing unrelated README/report/license edits remain preserved. Local changes are limited to the mobile package/lock, mobile archive-ignore rules, EAS profile, build-policy scripts/tests and documentation. The ZIP guide explicitly handles absence of Git metadata without restarting the project. No remote Expo project or signing key was created. Prior ZIPs were not deleted.

## Artifact checks still unavailable

| Check | Current result |
|---|---|
| EAS FINISHED status | No queued build |
| Artifact URL / retrieval | None |
| Actual APK file type / size / SHA-256 | Not verified — no artifact |
| Signature / trusted certificate | Not verified — no artifact or authenticated signing inventory |
| Actual minimum SDK / ABIs / update compatibility | Not verified — no artifact; source defaults are not installation proof |
| Device install / launch | Not performed |

Once the owner provides the resulting build ID/page or APK, continue verification rather than publishing. Private internal artifacts must not be posted to the website or public releases. Nothing is published by this handoff.
