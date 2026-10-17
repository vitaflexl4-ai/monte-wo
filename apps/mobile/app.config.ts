import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "MONTE WO",
  slug: "monte-wo",
  version: "0.1.0",
  scheme: "montewo",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  icon: "./assets/brand-icon.png",
  description:
    "MEASURE. PROVE. RANK. CLIMB. Training records and independent discipline performance.",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.vitaflexbusinessgroup.montewo",
    buildNumber: "1",
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: "com.vitaflexbusinessgroup.montewo",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/brand-icon.png",
      backgroundColor: "#080e17",
    },
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.REQUEST_INSTALL_PACKAGES",
    ],
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/brand-icon.png",
  },
  plugins: [
    [
      "expo-splash-screen",
      {
        image: "./assets/brand-icon.png",
        imageWidth: 160,
        backgroundColor: "#070d16",
      },
    ],
    "expo-secure-store",
    "expo-web-browser",
    [
      "expo-video",
      { supportsBackgroundPlayback: false, supportsPictureInPicture: false },
    ],
  ],
  experiments: {
    ...(process.env.MONTEWO_WEB_PREVIEW === "true"
      ? { baseUrl: "/mobile" }
      : {}),
  },
  extra: {
    ...(process.env.EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
      : {}),
  },
  ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
};
export default config;
