# MONTE WO — privacy, policy and store-listing checklist

Legend: ✅ done in repo · 🟡 prepared, needs owner input · ⛔ missing / owner action. "v0.1.0 as packaged" = the native shells built from this commit (offline, no API origin configured).

## 1. Legal pages and URLs

| Item | Web | Native bundle | Status |
|---|---|---|---|
| Privacy policy | `/privacy/` | `/privacy/index.html` (linked from Settings) | ✅ page exists · ⛔ **public HTTPS URL requires the confirmed production domain** (stores need an absolute URL) · 🟡 content must be re-read by the owner/legal once the API, accounts and evidence uploads are enabled (data categories change) |
| Terms of use | `/terms/` | `/terms/index.html` | ✅ page · 🟡 same review note; Apple needs an EULA only if the standard one is insufficient |
| Account deletion | `/delete-account/` (also "clear this device" action) | `/delete-account/index.html` | ✅ page prepared · not required until accounts exist; **Play: web URL + in-app path; Apple: in-app initiation** once account creation ships |
| Support / contact | `/contact/` | packaged | ✅ page · ⛔ support URL + email must be reachable on the confirmed domain |

## 2. Data collection disclosure — v0.1.0 as packaged (truthful today)

| Question | Answer for v0.1.0 | Evidence |
|---|---|---|
| Does the app collect or share user data? | **No.** No accounts, no analytics SDK, no crash reporting SDK, no ads, no third-party SDKs besides the Capacitor runtime. The demo food log is in-memory and discarded on close. | `tests/native-browser.mjs` asserts zero network writes; `AndroidManifest.xml` has only INTERNET; no `NS*UsageDescription` keys |
| Network access? | Yes (INTERNET permission) but **no endpoint is reachable in a default build**: `NATIVE_API_ORIGIN` is empty, so `/api/*` resolves to the local bundle server (404) and the ranking page says "not configured for this app build"; the waitlist says "use the website". A build with `NATIVE_API_ORIGIN` set **plus** `NATIVE_CLIENTS_ENABLED=true` on the server adds sign-in and private records → disclosures change (see below). | `tests/native.test.js`, `tests/native-browser.mjs` |
| Device data stored? | `localStorage` only for preferences already used by the web (e.g. language, calculator inputs on tool pages). No identifiers. | web code unchanged |
| Permissions | Android: INTERNET. iOS: none. Camera is **not** requested (the food-scan button opens a dialog that explains the camera is not connected). | test-enforced |
| URL scheme / deep link | `com.vitaflex.montewo://auth` is registered on both platforms for the sign-in return only; it carries a short-lived single-use code, never a token or personal data. | `AndroidManifest.xml`, `Info.plist`, `server/native.js` |
| Encryption export compliance (Apple) | Uses only standard HTTPS/no proprietary crypto → `ITSAppUsesNonExemptEncryption = NO` can be declared (add key to Info.plist before submission) | 🟡 owner to confirm |

**Play Data safety form (v0.1.0):** "No data collected", "No data shared", no security-practices claims needed beyond "data encrypted in transit: N/A". **Apple App Privacy (v0.1.0):** "Data Not Collected".

**Must be updated when** (each is a re-submission with changed disclosures): waitlist works in-app (email, language, consent timestamp → "Contact info"), accounts via Cloudflare Access (identifier, email), performance submissions (health & fitness data), evidence video upload (user content, camera/photos permissions), any analytics.

## 3. Platform policy items

| Topic | Status | Notes |
|---|---|---|
| Google Play Developer account | ⛔ owner | registration fee, identity/organisation verification, D-U-N-S for organisations |
| Apple Developer Program | ⛔ owner | annual membership, organisation enrolment |
| App Store 4.2 minimum functionality | ⛔ product decision | see `IOS_RELEASE.md` §6 — a placeholder shell is likely to be rejected |
| Play "closed testing" prerequisite for new personal accounts | 🟡 | plan 14-day closed test with the required tester count if the account is personal |
| Target API level | ✅ targetSdk 36 (meets the current ≥35 requirement for new apps — verify at upload time) | `android/variables.gradle` |
| Health/fitness content | ✅ no medical claims; standards shown as DRAFT — NOT OFFICIAL; Provisional vs Verified explained | app shell copy |
| User-generated content | n/a in v0.1.0 | evidence video review flow exists server-side only |
| Children | not directed at children; age rating via questionnaires | |
| Accessibility | shell has focus management, aria-current, 1 h1/view, 320-px layouts (browser-tested) | continue to test with TalkBack/VoiceOver on device |
| Third-party code attribution | Inter font (OFL 1.1, license file shipped), Capacitor (Apache-2.0) | `BUILD_AND_SETUP.md` §8 |

## 4. Store listing drafts (English; Kreyòl ayisyen / Français to follow the site's localisation)

**Name:** MONTE WO
**Subtitle (App Store, ≤30):** Strength ranks, honestly earned
**Short description (Play, ≤80):** Four lifts, nine Discipline Ranks. Track strength and climb the MONTE Climb Scale.

**Full description (draft — all statements true for v0.1.0; adjust when features ship):**
> MONTE WO by VitaFlex is a strength-training companion built around the MONTE WO Strength Index™. Four independent disciplines — Squat, Bench Press, Deadlift and Biceps Curl — each have their own nine Discipline Ranks, from Debitan to Lejand. There is no combined score and no shortcut: ranks are never transferred between disciplines, and nothing you do except lifting to a MONTE Standard moves you up the MONTE Climb Scale.
>
> In this early release you can explore the app foundation: your Dashboard with Discipline Rank cards, the Muscle Character View that maps muscle groups to disciplines, the Exercise Library guides, the Strength Lab calculators (one-rep max, percentages, plates, warm-up, unit converter) and a demo of the Food Scan & Macro Logger. Current MONTE Standards are shown as DRAFT — NOT OFFICIAL while they are under review; no official rank is awarded in this version.
>
> Coming later, after review: self-reported performances with Provisional status, MONTE Verified ranks after authorised evidence review, transparent performance history and methodology versions.
>
> MONTE WO does not collect personal data in this version and requests no permissions beyond internet access.

**Keywords (App Store, ≤100 chars):** strength,powerlifting,squat,bench,deadlift,curl,one rep max,ranks,fitness,haiti
**Category:** Health & Fitness · **Price:** Free · **Ads:** none · **In-app purchases:** none
**Release notes v0.1.0 (draft):** First public foundation: Dashboard, Discipline Rank cards (no awards yet), Muscle Character View, Exercise Library, Strength Lab, demo food logger. Standards are draft; accounts and verification are not yet available.

## 5. Store assets — outstanding

| Asset | Spec | Source | Status |
|---|---|---|---|
| App icon | Play 512×512 PNG (no alpha), iOS 1024×1024 PNG (no alpha); launcher icons for all densities (`android/app/src/main/res/mipmap-*`) and `ios/App/App/Assets.xcassets/AppIcon.appiconset` currently hold the **Capacitor template icons** | derive from `public/assets/icon.svg` / `icon-512.png` (approved brand) | ⛔ generate with `@capacitor/assets` (`npx @capacitor/assets generate --iconBackgroundColor '#090c13'` from a 1024-px source) — owner approval of the rendering |
| Splash screen | Android 12+ splash (icon on `#090c13`), iOS `Splash.imageset` (template images today) | brand emblem | ⛔ |
| Feature graphic (Play) | 1024×500 | brand | ⛔ |
| Screenshots | Play: ≥2 phone (16:9/9:16, 320–3840 px); App Store: 6.9" and 6.5" iPhone sets (+ iPad if offered) | capture from device/simulator; `docs/dashboard/screenshots/` are web captures and can guide composition | ⛔ |
| Promo video | optional | — | — |

## 6. Security hygiene (verified in repo)

* No keystore, certificate, provisioning profile, `.env`, service-account or API key is tracked (`tests/native.test.js` scans `git ls-files` and workflow files; `.gitignore` blocks `*.jks`, `*.keystore`, `*.p12`, `*.mobileprovision`, `*.cer`, `.env*`).
* Signing is injected only through environment variables / GitHub secrets at build time.
* Private evidence never enters the bundle (`strength/admin/` excluded; evidence lives only in the private R2 bucket, reviewer-gated).
