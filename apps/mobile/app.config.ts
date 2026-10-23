export default {
  expo: {
    name: "Monte Wo",
    slug: "monte-wo",
    version: "1.0.0",
    scheme: "montewo",
    userInterfaceStyle: "dark",
    icon: "./assets/brand-icon.png",
    android: {
      package: "com.vitaflex.montewovitaflex",
    },
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
