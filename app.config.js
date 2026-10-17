const packageJson = require("./package.json");

const [major, minor, patch] = packageJson.version.split(".").map(Number);

export default {
  expo: {
    name: "Oh Hell",
    slug: "oh-hell",
    version: packageJson.version,
    orientation: "default",
    scheme: "ohhell",
    userInterfaceStyle: "automatic",
    icon: "./assets/icon.png",
    android: {
      package: "org.colonelpanic.ohhell",
      versionCode: major * 10000 + minor * 100 + patch,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#6750a4",
      },
    },
    web: {
      bundler: "metro",
      favicon: "./assets/icon.png",
      // One index.html for every route, so static hosts and the Electron shell
      // can serve it as the fallback for client-side routes.
      output: "single",
    },
    plugins: ["expo-router", "expo-font", "./plugins/withReleaseSigning"],
    experiments: {
      typedRoutes: true,
      // Asset and route URLs are baked in at export time, so a path prefix
      // (e.g. "/oh-hell" on GitHub Pages) has to be set here.
      ...(process.env.OH_HELL_WEB_BASE_URL
        ? { baseUrl: process.env.OH_HELL_WEB_BASE_URL }
        : {}),
    },
  },
};
