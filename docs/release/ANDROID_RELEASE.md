# MONTE WO — Android release (Google Play)

**State:** project committed and structurally verified; **no APK/AAB has been compiled yet** (the Arena sandbox has no JDK/Android SDK and cannot reach `dl.google.com` / `services.gradle.org`). First compilation happens on the owner's machine or via the manual GitHub Actions workflow. Nothing is submitted to Google Play by anything in this repository.

## 1. Identity and versioning

| Item | Value | Where |
|---|---|---|
| Application ID / namespace | `com.vitaflex.montewo` **(placeholder chosen by the agent — owner must confirm before the first Play upload; it is permanent afterwards)** | `capacitor.config.json`, `android/app/build.gradle`, `android/app/src/main/res/values/strings.xml` |
| App name | MONTE WO | `strings.xml` (`app_name`, `title_activity_main`) |
| versionName / versionCode | `MONTE_WO_VERSION_NAME` (default `0.1.0`) / `MONTE_WO_VERSION_CODE` (default `1`) from the environment | `android/app/build.gradle` |
| minSdk / target & compile SDK | 24 / 36 | `android/variables.gradle` (Capacitor 8 defaults) |
| Permissions | `android.permission.INTERNET` only | `AndroidManifest.xml` (test-enforced) |
| Toolchain | Gradle 8.14.3 wrapper, AGP 8.13.0, JDK 21 | `android/gradle/wrapper/gradle-wrapper.properties`, `android/build.gradle` |

To change the application ID before first release: replace `com.vitaflex.montewo` in the three files above, rename `android/app/src/main/java/com/vitaflex/montewo/` accordingly (package line in `MainActivity.java`), update `PRODUCT_BUNDLE_IDENTIFIER` in `ios/App/App.xcodeproj/project.pbxproj`, and run `npm run test:native`.

## 2. Build from a clean clone (owner machine)

```sh
npm ci
npm run build                # web
npm run build:native         # build/native (Capacitor webDir)
npx cap sync android         # copies bundle into android/app/src/main/assets/public (git-ignored)
cd android
./gradlew --no-daemon assembleDebug      # debug APK for device testing: app/build/outputs/apk/debug/app-debug.apk
```

Install on a device/emulator: `adb install -r app/build/outputs/apk/debug/app-debug.apk`. Or `npm run native:android` to open Android Studio and run from there.

## 3. Signed release bundle (.aab)

1. Create the **upload keystore once**, outside the repository (e.g. a password manager + offline backup):
   ```sh
   keytool -genkeypair -v -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000
   ```
   Enrol the app in **Play App Signing** (default for new apps): Google holds the app signing key, you keep the upload key. Losing the upload key is recoverable via Play support; losing a self-managed signing key is not.
2. Export the signing environment (never commit it; `*.jks`, `*.keystore`, `.env` are git-ignored):
   ```sh
   export ANDROID_KEYSTORE_PATH=/secure/path/upload-keystore.jks
   export ANDROID_KEYSTORE_PASSWORD='…' ANDROID_KEY_ALIAS=upload ANDROID_KEY_PASSWORD='…'
   export MONTE_WO_VERSION_NAME=0.1.0 MONTE_WO_VERSION_CODE=1
   ```
3. Build:
   ```sh
   cd android && ./gradlew --no-daemon bundleRelease
   # → app/build/outputs/bundle/release/app-release.aab
   jarsigner -verify app/build/outputs/bundle/release/app-release.aab   # "jar verified"
   ```
   Without the four `ANDROID_KEY*` variables Gradle produces an **unsigned** bundle (Play rejects it) — intentional so that no credential is ever needed in Git.
4. Upload manually in Play Console → Testing (Internal testing first) → create release → upload `.aab` → release notes (include the Git commit SHA).

## 4. GitHub Actions (manual) — `.github/workflows/android-release.yml`

* Trigger: **Actions → "Android release bundle (manual)" → Run workflow**, inputs `version_name`, `version_code`. Never runs automatically; never uploads to Play.
* Steps: `npm ci` → `npm run build` → `npm test` → `npm run build:native` → `npx cap sync android` → decode keystore (only if secret exists) → `./gradlew bundleRelease` → signature report in the job summary → artifact `monte-wo-android-<version>-<code>` (14-day retention).
* Repository secrets to add (Settings → Secrets and variables → Actions): `ANDROID_KEYSTORE_BASE64` (`base64 -w0 upload-keystore.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
* The repository is public, so Actions minutes are free; the workflow has **not been triggered** (owner authorization). First run will reveal any SDK-package download or toolchain mismatch — fix forward in the workflow.

## 5. Google Play Console — what the account holder must do

1. Google Play Developer account (one-time registration fee; identity verification; for organisations a D-U-N-S number) — **owner action, no purchases made by the agent**.
2. Create the app: name "MONTE WO", default language (English; add Kreyòl ayisyen / Français when store copy is translated), app/free, category Health & Fitness.
3. Store listing (drafts in `PRIVACY_AND_STORE_CHECKLIST.md` §4): 512×512 icon, 1024×500 feature graphic, ≥2 phone screenshots (and 7"/10" tablet if the layout is declared tablet-ready — the shell is responsive, verified at 320–1440 px), short + full description.
4. **App content** declarations: privacy policy URL (`https://<confirmed-domain>/privacy/`), ads (none), app access (no login required today), content rating questionnaire (IARC; no UGC in v0.1.0), target audience (18+ recommended for a strength-training product unless reviewed otherwise), **Data safety** form (v0.1.0 as packaged collects no data — see checklist), account deletion (not applicable until accounts exist; URL `https://<confirmed-domain>/delete-account/` is already prepared), government apps / financial features (none), health apps declaration (fitness, no medical claims).
5. Testing track: Internal testing → Closed testing. Since 2023 new personal developer accounts must run a closed test with a minimum number of testers for 14 days before production access can be requested — plan for it (organisation accounts: verify current policy).
6. Production release only after the owner's explicit go/no-go (see `RELEASE_STATUS.md`).

## 6. Verification before any upload

* `npm test` (includes `tests/native.test.js`: identifiers agree, manifest permissions, env-driven signing, no secrets tracked, deterministic bundle, workflow hygiene) and `npm run test:native-browser` (packaged-app workflows) — both executed in this step, see `RELEASE_STATUS.md`.
* On a device: cold start opens the Dashboard; tab bar (Dashboard / Performance / Rankings / Nutrition / More); Settings → Privacy opens the packaged privacy page and the brand link returns to the Dashboard; Food Scan & Macro Logger demo adds/removes items with "—" macros; airplane mode: everything still works (bundle is local); the waitlist page says nothing was submitted. These are the same steps `tests/native-browser.mjs` automates in the emulation.
* Not yet verifiable: anything requiring the API (accounts, submissions, rankings) — see `ARCHITECTURE.md` §6.
