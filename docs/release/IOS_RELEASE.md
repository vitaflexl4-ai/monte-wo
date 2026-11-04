# MONTE WO — iOS release (App Store)

**State (2026-11-04):** two iOS projects exist in this repository and only one should reach the App Store
(`RELEASE_STATUS.md` §4 item 13, recommendation: the Expo app). **§0 is the current path** — the app in `apps/mobile`
(Expo / React Native; the same code as the web app at `/app/web/` and the Android build) generates its Xcode project
with `expo prebuild` and compiles on a GitHub macOS runner (Release configuration, iOS Simulator, unsigned). §1–§7
describe the earlier Capacitor shell of `/dashboard/` (`com.vitaflex.montewo`), kept intact. There is still no
macOS/Xcode in the Arena sandbox; **device, TestFlight and App Store builds require the account holder's Apple
Developer membership** and are owner actions (EAS Build or Xcode). Nothing in this repository submits anything to
App Store Connect.

## 0. The app (`apps/mobile`, Expo) — iOS project and builds

### 0.1 Identity and versioning

| Item | Value | Where |
|---|---|---|
| Bundle identifier | `com.vitaflex.montewovitaflex` (mirrors the Android application id of the same app; **not registered with Apple yet — the owner may still change it until the first App Store Connect record exists**) | `apps/mobile/app.config.ts` → `ios.bundleIdentifier` |
| Display name / scheme | MONTE WO · Xcode project and scheme `MONTEWO` (generated from the name) | `expo prebuild` → `ios/MONTEWO.xcodeproj`, `ios/MONTEWO/Info.plist` |
| Version / build | `MONTEWO_APP_VERSION` (default `1.0.0`) → `CFBundleShortVersionString`; `MONTEWO_IOS_BUILD_NUMBER` (default `1`; CI uses the run number) → `CFBundleVersion` | `app.config.ts` (`version`, `ios.buildNumber`) |
| Devices / orientation / appearance | iPhone only (`supportsTablet: false` — no iPad screenshots required), portrait, dark UI style | `app.config.ts` |
| Deployment target | iOS 16.4 (Expo SDK 57 default) | generated `Podfile` / `project.pbxproj` |
| Icon / splash | approved brand emblem (`assets/brand-icon.png`, 512 px — Apple's 1024 px App Store icon is upscaled from it; supply a 1024 px master if the owner has one) on `#090C13` | `app.config.ts` |
| URL scheme | `montewo://` (`montewo://auth` sign-in redirect) | `Info.plist` → `CFBundleURLTypes` (generated) |
| Privacy / compliance keys | `ITSAppUsesNonExemptEncryption = NO` (HTTPS only); no camera/photo/location usage descriptions — the app requests none (evidence files come through the system document picker) | `app.config.ts` → `ios.infoPlist` |
| Signing | none committed (`CODE_SIGN_STYLE` left to Xcode/EAS; no Team ID in the repository) | — |

### 0.2 GitHub Actions — `.github/workflows/app-ios.yml` ("App — iOS (Simulator build, unsigned)")

* **Trigger:** Actions → *Run workflow* (inputs `version_name`, `build_number`), **or** a push to an `arena/**` branch with `[build-app]` in the commit message. No secret is referenced.
* **Steps (macos-latest):** `npm ci` → `tsc` + app suites + brand-artwork check → `npx expo prebuild --platform ios --no-install --clean` (+ build-number assertion) → `pod install` (prebuilt React Native core + precompiled Expo modules) → `xcodebuild -workspace MONTEWO.xcworkspace -scheme MONTEWO -configuration Release -sdk iphonesimulator … CODE_SIGNING_ALLOWED=NO build` → checks that `main.jsbundle` is embedded → zips `MONTEWO.app`.
* **Artifact (30 days):** `monte-wo-ios-simulator-<version>-<build>` (`monte-wo-ios-simulator-<version>-<build>-<sha>.zip` + `build-info.json`, `installableOnDevice: false`). Run it on a Mac: unzip, `xcrun simctl boot "iPhone 16"`, `xcrun simctl install booted MONTEWO.app`, `xcrun simctl launch booted com.vitaflex.montewovitaflex`.
* **What it proves / does not prove:** the generated iOS project compiles with the production JS bundle on the current Xcode; it says nothing about App Review, signing or device behaviour.

### 0.3 Device, TestFlight and App Store builds — owner path

1. **Apple Developer Program** membership (paid; organisation enrolment needs a D-U-N-S number) — owner purchase, never made by the agent.
2. Register the App ID (`com.vitaflex.montewovitaflex` or the final choice) and create the App Store Connect record "MONTE WO"; agree to the current agreements; add privacy-policy and support URLs on the confirmed domain.
3. **Recommended: EAS Build** (the owner already has the EAS project `9df7e721-…` used for the Android preview): `cd apps/mobile && npx eas-cli build --platform ios --profile production` — EAS creates/stores the distribution certificate and provisioning profile with the owner's Apple ID (nothing enters the repository), uploads to TestFlight only with `eas submit`, which is **not** configured here and needs explicit authorization. Note the build security gate: `scripts/check-build-security.cjs` currently denies iOS/production while the dependency advisories listed in `RELEASE_STATUS.md` remain un-reviewed — the owner must re-review (or the advisories must be resolved) before a store build is produced.
4. **Alternative: Xcode on a Mac** — `cd apps/mobile && npm ci && npx expo prebuild --platform ios && (cd ios && pod install) && open ios/MONTEWO.xcworkspace`; select the `MONTEWO` scheme → Signing & Capabilities → choose the Team (automatic signing) → Product → Archive → Distribute (App Store Connect / TestFlight). Command-line archive/export follows §4 with `-workspace MONTEWO.xcworkspace -scheme MONTEWO`.
5. Do not commit `.p12`, `.mobileprovision`, API keys or `ExportOptions.plist` with a Team ID (`apps/mobile/.gitignore` already blocks the certificate/profile extensions).

### 0.4 Verification evidence

See `RELEASE_STATUS.md` §2 ("GitHub Actions — App, iOS") for the run ids and results.

---

The sections below describe the **Capacitor shell** (`ios/App` at the repository root, `com.vitaflex.montewo`), unchanged.

## 1. Identity and versioning

| Item | Value | Where |
|---|---|---|
| Bundle identifier | `com.vitaflex.montewo` **(placeholder — owner confirms; must match the App ID registered in the Apple Developer portal)** | `ios/App/App.xcodeproj/project.pbxproj` → `PRODUCT_BUNDLE_IDENTIFIER` (Debug + Release) |
| Display name | MONTE WO | `ios/App/App/Info.plist` → `CFBundleDisplayName` |
| Version / build | `MARKETING_VERSION = 1.0`, `CURRENT_PROJECT_VERSION = 1` (Info.plist reads `$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)`) — align to `0.1.0` / `1` at first archive | `project.pbxproj` |
| Deployment target | iOS 15.0 | `project.pbxproj`, `ios/App/CapApp-SPM/Package.swift` |
| Signing | `CODE_SIGN_STYLE = Automatic`; **no Team ID committed** | set in Xcode → Signing & Capabilities |
| Capabilities / entitlements | none; no camera/photo/location usage descriptions yet (the app requests none) | add `NS*UsageDescription` keys only when a feature really uses them |
| Dependencies | `@capacitor/ios` 8.5.3 via SPM (`CapApp-SPM`) | regenerated by `npx cap sync ios` |

## 2. Requirements that only the account holder can satisfy

1. **Apple Developer Program** membership (paid annual membership; organisation enrolment needs a D-U-N-S number and legal entity verification). **Owner purchase — not made by the agent.**
2. A **Mac with Xcode** (version required by Capacitor 8 — 16.x or newer; the CI workflow prints the exact runner version) and Command Line Tools.
3. In the developer portal / App Store Connect: register App ID `com.vitaflex.montewo` (or the chosen final ID), create the app record "MONTE WO", agree to the current Paid/Free Apps agreements, add the Privacy Policy URL and support URL on the confirmed domain.
4. Signing certificate (Apple Distribution) + App Store provisioning profile — Xcode automatic signing creates them once a Team is selected. Do **not** export `.p12`/`.mobileprovision` files into the repository (git-ignored patterns exist as a safety net).

## 3. Build and run locally (Mac)

```sh
npm ci
npm run build
npm run build:native
npx cap sync ios            # copies build/native → ios/App/App/public (git-ignored), resolves SPM packages
npm run native:ios          # or: open ios/App/App.xcodeproj
```
In Xcode: select the `App` scheme → Signing & Capabilities → choose your Team → run on a simulator or a device.

Command line (unsigned simulator build — identical to the CI check):
```sh
cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
```

## 4. Archive and upload (App Store Connect)

Xcode route (recommended for the first release): Product → Destination "Any iOS Device (arm64)" → Product → Archive → Organizer → Distribute App → App Store Connect → Upload (automatic signing, manage version/build numbers there). Then in App Store Connect → TestFlight (internal testers first) → App Store → submit for review when the checklist is complete.

Command-line route (after signing works in Xcode once):
```sh
cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$PWD/build/MONTEWO.xcarchive" MARKETING_VERSION=0.1.0 CURRENT_PROJECT_VERSION=1 archive
cat > ExportOptions.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>method</key><string>app-store-connect</string><key>signingStyle</key><string>automatic</string><key>teamID</key><string>YOUR_TEAM_ID</string></dict></plist>
EOF
xcodebuild -exportArchive -archivePath "$PWD/build/MONTEWO.xcarchive" -exportOptionsPlist ExportOptions.plist -exportPath "$PWD/build/export"
xcrun altool --validate-app -f build/export/App.ipa -t ios --apiKey YOUR_ASC_KEY_ID --apiIssuer YOUR_ASC_ISSUER_ID   # or Transporter.app
xcrun altool --upload-app   -f build/export/App.ipa -t ios --apiKey YOUR_ASC_KEY_ID --apiIssuer YOUR_ASC_ISSUER_ID
```
(`ExportOptions.plist` and `build/` are local artefacts; `/build/` is git-ignored at the repo root — keep the file out of Git anyway. App Store Connect API keys are secrets.)

## 5. GitHub Actions (manual) — `.github/workflows/ios-build.yml`

Runs on `macos-latest`: `npm ci` → `npm run build` → `npm run build:native` → `npx cap sync ios` → unsigned `xcodebuild … -sdk iphonesimulator build`. It proves the committed project compiles against the current web build; it references **no secrets** and does not archive or upload. Automating signed archives later (fastlane `match`/`gym`, or Xcode Cloud) needs the account holder's certificates/API keys stored as GitHub secrets — decide only after the first manual release.

Run history: run `38496917039` (triggered by the `[build-native]` push on 2026-10-13) **succeeded** — the committed Xcode project, SPM packages and the native bundle compile for the iOS Simulator on `macos-latest`. This is compile evidence only (unsigned, no archive, no device, no App Review).

## 6. App Review readiness — honest assessment

| Guideline | Current state | Action |
|---|---|---|
| 4.2 Minimum functionality (not "a repackaged website") | **Highest risk.** v0.1.0 is an offline shell with honest placeholders ("NOT IMPLEMENTED IN STEP 1"), a demo food logger and packaged website pages. Apple frequently rejects this. | Before submission, ship at least one complete native-worthy workflow (e.g. local performance log with Provisional status + the Strength Lab calculators surfaced in-app) and remove/hide placeholder views that cannot be used. Owner decision on scope. |
| 2.1 Completeness (no placeholder text, no crashes, demo accounts) | Placeholders are explicit labels, not broken features; no crashes known (emulated run clean). | Hide unfinished views or complete them. |
| 5.1.1 Privacy (policy URL, data collection) | Privacy page exists in web + bundle; production URL unconfirmed. v0.1.0 collects no data. | Confirm domain; fill App Privacy "Data Not Collected" truthfully; update when API/auth land. |
| 5.1.1(v) Account deletion | No accounts yet → not applicable; `/delete-account/` page already prepared. | Required the moment account creation ships (in-app initiation). |
| 1.4.1 / 5.1.1 health claims | Fitness education, no medical claims; MONTE Standard shown as DRAFT — NOT OFFICIAL. | Keep claims accurate in store copy. |
| 2.3 Accurate metadata, screenshots | Not produced yet. | Capture from the device/simulator after scope decision. |
| Age rating | 4+ likely (no UGC yet; changes when evidence video upload ships) | Answer the questionnaire at submission. |

## 7. Verification before any upload

* `npm test` + `npm run test:native-browser` (executed in this step; details in `RELEASE_STATUS.md`).
* Sign-in handoff (bundle built with `NATIVE_API_ORIGIN`, server with `NATIVE_CLIENTS_ENABLED=true` + Access prerequisites): Rankings → "Load my ranking workspace" opens an in-app Safari tab (`@capacitor/browser`) → Access login → `com.vitaflex.montewo://auth?…` returns to the app → private workspace loads. `xcrun simctl openurl booted "com.vitaflex.montewo://auth?code=x&state=y"` must only show "Sign-in could not be completed".
* On a simulator/device: Dashboard opens as root; tab bar + More drawer; Settings → Privacy → brand link returns to Dashboard; demo food logger; airplane mode works; safe-area insets look right on notch devices (`public/dashboard.css` uses `env(safe-area-inset-*)` and the shell sets `viewport-fit=cover` — visually confirm on a device; not yet device-verified).
