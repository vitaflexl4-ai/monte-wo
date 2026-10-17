# Native builds, signing and release gates

## Toolchain / source

`apps/mobile`: Expo 57, React Native 0.86, React 19, TypeScript 6. It renders native views and native navigation, not a WebView wrapper. The `/mobile/` browser QA export is an additional rendering of that source, not an APK or replacement native build.

Chosen application IDs (availability/ownership not reserved):
- Android: `com.vitaflexbusinessgroup.montewo`
- iOS: `com.vitaflexbusinessgroup.montewo`
- Version 0.1.0; Android versionCode 1; iOS buildNumber 1.
- Existing brand icon reused; dark launch screen configured; original rank assets copied without redrawing clipped artwork.
- Current installed RN Android defaults: min SDK 24, compile/target SDK 36. Confirm final values from the signed APK/AAB. The public download page does not promise a minimum until then.

Use Node 22.13+ and Python 3. A Mac/Xcode is required for local iOS compilation; Android needs a compatible JDK (17+), Android SDK/build tools, NDK/CMake as required by this RN version and adequate memory. Those native tools were not provisioned here. No device or emulator was available.

```sh
# Repository root
npm ci
npm run build
python3 scripts/sync_mobile_assets.py
cd apps/mobile
npm ci
npm run typecheck
npx expo-doctor
npx expo prebuild --no-install
npm run export:native
```

`export:native` produces Hermes/JS bundles. It **does not** produce APK, AAB or IPA files. Generated native project directories can be reproduced from the configuration. Do not treat an Expo-generated debug keystore or Gradle debug-signed release as an official release key.

## EAS build flow — requires the owner's account

No Expo account was authenticated and no cloud project was created/linked here. On a trusted owner machine:

```sh
cd apps/mobile
npx eas-cli login
npx eas-cli init
# Link the correct owner/project. Set nonsecret EAS_PROJECT_ID / EXPO_OWNER as needed.
# Configure production API URL explicitly in the EAS project environment.
npx eas-cli credentials --platform android
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Profiles:
- `preview`: signed Android APK for internal/direct-install testing; iOS simulator build (not installable on an iPhone).
- `production`: Android AAB for Google Play, iOS device/store build for TestFlight/App Store.
- `ios-device`: ad-hoc/internal iOS device build; Apple membership/device registration required.

Use the existing application signing identity if one exists. Never regenerate it casually. EAS/owner-managed credentials stay out of Git, ZIPs, browser code and chat. Back up the original keystore and credentials securely in the owner's credential manager. `EXPO_TOKEN`, Apple secrets and Google service-account credentials belong only in trusted secret stores. Only the API URL and project linkage are public configuration.

Increment Android versionCode and iOS buildNumber on subsequent submissions. This project uses local version management; it does not silently increment versions. Do not run `npm audit fix --force`: the registry currently proposes an incompatible Expo downgrade, not a verified fix for this project.

## Android key continuity across Play and direct APK

Google Play App Signing can use a different **app-signing key** from the EAS **upload key**. A direct APK signed only with the upload key may not update a Play-installed app. Decide and verify the cross-channel identity before first publication. If a common owner-controlled app-signing identity is selected, configure Play and direct APK signing consistently using supported secure procedures. Do not publish until signing certificate fingerprints match the intended update path. AAB upload validation is not installation testing.

After a real APK exists, use Android SDK tools and a connected authorized device:

```sh
python3 scripts/verify_android_release.py \
  --apk /secure/path/to/monte-wo.apk \
  --expected-cert-sha256 "$TRUSTED_MONTEWO_CERT_SHA256" \
  --install-test --report /secure/path/to/apk-verification.json
```

The script verifies signature, trusted certificate, package, non-debuggable status, version, minimum SDK, size and SHA-256; optionally installs/launches with adb. It generates no key and performs no upload. It fails closed if any prerequisite is missing. Installation/launch alone is not functional acceptance: run every real-device scenario in `QA-CHECKLIST.md`.

For AAB, verify the signed bundle and validate it with the appropriate `bundletool`; then complete Play internal testing and pre-launch reports. For iOS, complete App Store Connect upload processing and TestFlight testing using the production device build. None of those steps happened in this session.

## Distribution gate

`content/mobile-release.json` deliberately contains null download/store URLs. `scripts/build_downloads.py` fails rather than publishing an unverified release automatically. `/downloads/` has disabled channels and no misleading store badges or placeholder APK URLs.

Before changing that gate: record the tested artifact, version/date/bytes/minimum Android, SHA-256, trusted signing certificate, complete QA evidence and owner release approval; upload to an owner-controlled HTTPS release location; download the hosted artifact and recheck its hash/signature. An authenticated GitHub Release in the existing repository is one option. Do not casually create a public bucket or repurpose the workout-media bucket. Cloudflare Pages' per-file limit may rule out a normal APK; verify the host's current limits before choosing it.

Store URLs must refer to actual published listings/invitations. The source build cannot manufacture them. Keep Play Protect/security enabled. The page explains limited “install from this source” permission only; never tell users to disable Android protections.
