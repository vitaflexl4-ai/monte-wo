# MONTE WO — next action for the signed test APK

**Status: no APK has been produced. No cloud build was queued.** Continue this project; do not create another app scaffold or deploy the website.

The assistant checked EAS CLI 24.14.0: **Not logged in**. Two official device-login attempts did not complete; the latest returned **`expired_token`**. The actual Android preview queue attempt exited 1 with **“An Expo user account is required to proceed.”** The existing Expo project and signing identity therefore could not be inspected remotely.

## 1. Sign in safely on your Mac

Use the updated source delivered with this guide, not the earlier dependency lock. In Terminal, change into its `monte-wo/apps/mobile` directory. Use Node 22.13+ (`node --version`).

If this is an extracted ZIP without Git metadata, use EAS's explicit no-VCS mode for this existing mobile source. It does not create another Expo project or change production. From `apps/mobile`:

```sh
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  export EAS_NO_VCS=1
  export EAS_PROJECT_ROOT="$PWD"
fi
npm ci
npx --yes eas-cli@24.14.0 login --browser
npx --yes eas-cli@24.14.0 whoami
```

The official CLI opens your local browser. Enter your password and any two-factor code **only on Expo's official site**. Do not paste them, a session cookie, an access token or a keystore into chat. Verify the browser hostname is `expo.dev` and approve only the request you initiated.

Signing in on the Mac authenticates **that Mac**, not the assistant workspace. It does not deploy production. No Google Play membership is required just to build an internally distributed APK.

Official reference: https://docs.expo.dev/eas/cli/#eas-accountlogin

## 2. Verify the existing project — do not guess its ID

On https://expo.dev, open the existing MONTE WO project under the correct owner/account. Copy its project UUID and owner slug from project settings. These identifiers are not passwords or access tokens.

Set them in this Terminal session without putting secrets in files:

```sh
printf 'Existing MONTE WO Expo owner/account slug: '
read -r EXPO_OWNER
export EXPO_OWNER
printf 'Existing MONTE WO EAS project UUID: '
read -r EAS_PROJECT_ID
export EAS_PROJECT_ID
npx --yes eas-cli@24.14.0 project:info
```

The dynamic `app.config.ts` already reads these values. **Stop if the project info does not match the intended MONTE WO project.** If no Expo project exists, confirm the intended owner before creating an EAS project record; do not invent an ID or link a different application. This is project linkage, not permission to restart the app.

Ensure these two nonsecret values are also available to the remote builder in the **preview environment only**. After verifying the correct project, use Expo's dashboard or:

```sh
npx --yes eas-cli@24.14.0 env:set --environment preview --visibility plaintext --name EAS_PROJECT_ID --value "$EAS_PROJECT_ID"
npx --yes eas-cli@24.14.0 env:set --environment preview --visibility plaintext --name EXPO_OWNER --value "$EXPO_OWNER"
```

Do not pull or share unrelated secrets. Do not enable backend flags or apply D1 migrations. The app still has honest unavailable states for account services that have not been rolled out.

## 3. Verify Android signing continuity

```sh
npx --yes eas-cli@24.14.0 credentials --platform android
```

Select the `preview` profile and confirm Android package **`com.vitaflexbusinessgroup.montewo`**. Reuse the existing remote keystore if this app already has one. Do not regenerate or rotate a known identity. If this is genuinely the first signing identity, the owner must confirm that before letting official EAS generate/manage it. Keep private signing material in the trusted owner/EAS credential store, not the repo, ZIP or chat. Record the public signing-certificate SHA-256 for subsequent verification.

The assistant has **not** verified that a keystore exists. If this step cannot be completed, stop rather than building with a debug or unrelated key.

## 4. Queue the APK — internal testing only

The user explicitly accepted the disclosed remaining build-tool risks for **internal Android APK testing only**. A build hook records this exception and blocks other profiles with unresolved findings. It does not suppress the audit.

```sh
npm run typecheck
npm run test:build-safety
npx --yes expo-doctor
npx --yes eas-cli@24.14.0 build \
  --platform android --profile preview \
  --non-interactive --freeze-credentials --no-wait
```

For a ZIP/no-VCS build, the EAS build page may not have a Git commit attached; retain the source revision and file hashes in the supplied handoff manifest. The mobile archive ignore rules exclude credentials, environment files and generated native/debug-signing material.

The configured profile requests **APK**, not AAB: `distribution: internal`, `android.buildType: apk`, `environment: preview`, Node 22.23.3, remote signing. The command deliberately has **no `--auto-submit`**. Freeze-credentials prevents silent credential replacement; missing credentials must be handled explicitly in step 3.

Use the build URL/ID actually returned by EAS. If the account reports a quota or plan limit, stop and review it; no paid upgrade is authorized automatically. Restrict internal build access to the intended testers in Expo settings; do not publish its artifact on the website or in a public release.

## 5. Return nonsecret build evidence

Send the **build ID/build-page URL**, or upload the resulting `.apk`. Do not send account credentials. The assistant can then verify the available build evidence and inspect the artifact; private links may require you to download/upload the APK yourself.

A queued job is not success. Wait for EAS **FINISHED**, then download the artifact from that specific build, not from a similarly named older release. Verification must record:
- Exact build ID/status, source revision, profile, artifact URL and retrieval time.
- Actual APK structure/file type, SHA-256 and size.
- Valid APK signature and matching trusted signing certificate.
- Actual package/versionCode/minSdk/targetSdk and supported ABIs from the APK.
- Installation/launch results **only if actually tested** on an authorized device/emulator.

The existing `scripts/verify_android_release.py` can check a real artifact using Android SDK tools; it has not run against an APK in this attempt. Keep Android security/Play Protect enabled. No installation testing, compatibility, signature or artifact URL is currently verified.

## What changed in this follow-up

- Narrow `xcode → uuid` override to **11.1.1**, with fresh-install and compatibility tests: mobile audit **23 → 15** (all eight moderate findings removed).
- Two high-severity roots remain unpatched upstream: `braces` stack exhaustion and `node-forge` RSA signature validation. Fifteen is the propagated package count, not fifteen independent vulnerabilities.
- No affected packages appeared in the 2,928-source Android JS bundle map; that does not prove the build environment or a future native binary vulnerability-free.
- Explicit preview/production security gates and tests; pinned EAS CLI/Node preview configuration.
- Website, backend source, migrations and production configuration were not changed by this follow-up.

Full evidence: `docs/mobile/APK-BUILD-REPORT.md` and `docs/mobile/apk-attempt/`.
