export default {
  expo: {
    name: "Monte Wo",
    slug: "monte-wo",
    version: "2.0.0",
    scheme: "montewo",
    userInterfaceStyle: "dark",
    backgroundColor: "#000000",
    icon: "./assets/brand-icon.png",
    splash: {
      image: "./assets/brand-icon.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    android: {
      package: "com.vitaflex.montewovitaflex",
      versionCode: 2,
      adaptiveIcon: {
        foregroundImage: "./assets/brand-icon.png",
        backgroundColor: "#000000",
      },
      blockedPermissions: ["android.permission.RECORD_AUDIO"],
    },
    plugins: [
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow MONTE WO to use your camera for the AI Muscle Definition Lens, Barcode Reader, and Food Scanner.",
          recordAudioAndroid: false,
        },
      ],
      [
        "expo-media-library",
        {
          photosPermission:
            "Allow MONTE WO to access your photo library when exporting physique captures.",
          savePhotosPermission:
            "Allow MONTE WO to save sculpted physique photos directly to your gallery.",
          isAccessMediaLocationEnabled: false,
        },
      ],
      "expo-sharing",
      "expo-secure-store",
    ],
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/brand-icon.png",
    },
    experiments: {
      ...(process.env.MONTEWO_WEB_PREVIEW === "true"
        ? { baseUrl: "/mobile" }
        : {}),
    },
    extra: {
      eas: {
        projectId: "9df7e721-09d7-47a7-b74e-adae504dee37",
      },
    },
  },
};
