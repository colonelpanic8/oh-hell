const packageJson = require("./package.json");

export default {
  expo: {
    name: "Oh Hell",
    slug: "oh-hell",
    version: packageJson.version,
    orientation: "default",
    scheme: "ohhell",
    userInterfaceStyle: "automatic",
    android: {
      package: "org.colonelpanic.ohhell",
    },
    web: {
      bundler: "metro",
      // One index.html for every route, so static hosts and the Electron shell
      // can serve it as the fallback for client-side routes.
      output: "single",
    },
    plugins: ["expo-router", "expo-font"],
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
