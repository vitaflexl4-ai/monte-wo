// One codebase, three targets: Android (EAS), iOS (EAS) and the browser. The web build is the SAME app
// exported with `expo export --platform web`; scripts/build_webapp.py places it at public/app/web/ on
// the MONTE WO site. MONTEWO_WEB_BASE_URL (e.g. "/app/web") is only set by that script, so the local
// workflows (`expo start`, `npm run web`, `npm run export:web`) keep serving from "/" exactly as before.
const webBaseUrl = (process.env.MONTEWO_WEB_BASE_URL || "").trim().replace(/\/+$/, "");

export default {
  expo: {
    name: "Monte Wo",
    slug: "monte-wo",
    version: "1.0.0",
    android: {
      package: "com.vitaflex.montewovitaflex"
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
