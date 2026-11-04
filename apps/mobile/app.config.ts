// One codebase, three targets: Android, iOS and the browser. The native projects are generated from this
// file with `expo prebuild` (android/ and ios/ are gitignored — CI regenerates them on every build, see
// .github/workflows/app-android.yml and app-ios.yml). The web build is the SAME app exported with
// `expo export --platform web`; scripts/build_webapp.py places it at public/app/web/ on the MONTE WO site.
//
// Environment overrides (all optional, used by the GitHub Actions builds; defaults keep local commands
// — `expo start`, `npm run web`, `npm run export:web` — exactly as before):
//   MONTEWO_WEB_BASE_URL          "/app/web" when the web export is hosted under the site (build_webapp.py)
//   MONTEWO_APP_VERSION           marketing version shown in the stores (semver, default 1.0.0)
//   MONTEWO_ANDROID_VERSION_CODE  Google Play versionCode (positive integer, must only ever increase)
//   MONTEWO_IOS_BUILD_NUMBER      App Store build number (positive integer, must only ever increase)
const webBaseUrl = (process.env.MONTEWO_WEB_BASE_URL || "").trim().replace(/\/+$/, "");

function positiveInteger(raw: string | undefined, fallback: number): number {
  const value = (raw || "").trim();
  if (!value) return fallback;
  if (!/^\d{1,9}$/.test(value) || Number(value) < 1) {
    throw new Error(`Expected a positive integer, got "${value}"`);
  }
  return Number(value);
}

function semver(raw: string | undefined, fallback: string): string {
  const value = (raw || "").trim();
  if (!value) return fallback;
  if (!/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(`Expected a MAJOR.MINOR.PATCH version, got "${value}"`);
  }
  return value;
}

const version = semver(process.env.MONTEWO_APP_VERSION, "1.0.0");
const androidVersionCode = positiveInteger(process.env.MONTEWO_ANDROID_VERSION_CODE, 1);
const iosBuildNumber = String(positiveInteger(process.env.MONTEWO_IOS_BUILD_NUMBER, 1));

// Approved brand artwork only (assets/brand-icon.png is the MONTE WO emblem on #090C13). The adaptive-icon
// foreground is the same emblem re-padded for the Android safe zone by scripts/make-native-icons.cjs.
const BRAND_BACKGROUND = "#090C13";

export default {
  expo: {
    name: "MONTE WO",
    slug: "monte-wo",
    version,
    // Deep-link scheme used by the sign-in redirect (src/api.ts: montewo://auth) — must match the server's
    // MOBILE_REDIRECT_URIS allow-list (server/mobile/security.js).
    scheme: "montewo",
    orientation: "portrait",
    icon: "./assets/brand-icon.png",
    userInterfaceStyle: "dark",
    // Root view colour behind the app (src/ui.tsx C.bg) — avoids a white flash on launch/rotation.
    backgroundColor: "#02070E",
    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./assets/brand-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: BRAND_BACKGROUND
        }
      ]
    ],
    android: {
      package: "com.vitaflex.montewovitaflex",
      versionCode: androidVersionCode,
      adaptiveIcon: {
        foregroundImage: "./assets/native/adaptive-icon-foreground.png",
        backgroundColor: BRAND_BACKGROUND
      },
      // The app only needs INTERNET. Evidence files are chosen through the system document picker
      // (Storage Access Framework), so the storage permissions Expo adds by default are not required —
      // keeping the manifest minimal keeps the Play Console data-safety / permissions declaration honest.
      blockedPermissions: [
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.VIBRATE"
      ]
    },
    ios: {
      // Not registered with Apple yet — it can still be changed until the first App Store Connect record
      // is created (docs/release/IOS_RELEASE.md). Mirrors the Android application id of the same app.
      bundleIdentifier: "com.vitaflex.montewovitaflex",
      buildNumber: iosBuildNumber,
      supportsTablet: false,
      infoPlist: {
        // HTTPS-only networking (exempt encryption). The owner confirms this on the App Store Connect
        // "Export Compliance" question; the key just avoids the prompt on every upload.
        ITSAppUsesNonExemptEncryption: false
      }
    },
    web: {
      name: "MONTE WO",
      shortName: "MONTE WO",
      lang: "en",
      bundler: "metro",
      output: "single"
    },
    ...(webBaseUrl ? { experiments: { baseUrl: webBaseUrl } } : {}),
    extra: {
      eas: {
        projectId: "9df7e721-09d7-47a7-b74e-adae504dee37"
      }
    }
  }
};
