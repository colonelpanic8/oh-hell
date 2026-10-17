const { withAppBuildGradle } = require("expo/config-plugins");

const PREFIX = "OH_HELL_UPLOAD";

const STORE_FILE = `
// Release keystore from the environment or gradle properties; local builds
// without one fall back to the debug keystore.
def uploadStoreFile = System.getenv('${PREFIX}_STORE_FILE') ?: findProperty('${PREFIX}_STORE_FILE')
`;

const SIGNING_CONFIGS = `        if (uploadStoreFile) {
            release {
                storeFile file(uploadStoreFile)
                storePassword System.getenv('${PREFIX}_STORE_PASSWORD') ?: findProperty('${PREFIX}_STORE_PASSWORD')
                keyAlias System.getenv('${PREFIX}_KEY_ALIAS') ?: findProperty('${PREFIX}_KEY_ALIAS')
                keyPassword System.getenv('${PREFIX}_KEY_PASSWORD') ?: findProperty('${PREFIX}_KEY_PASSWORD')
            }
        }
    }
    buildTypes {`;

const RELEASE_SIGNING = `            if (uploadStoreFile) {
                signingConfig signingConfigs.release
            } else {
                logger.warn("${PREFIX}_STORE_FILE not set; the release build is signed with the debug keystore. Do not distribute it.")
                signingConfig signingConfigs.debug
            }`;

function replaceOnce(source, pattern, replacement, what) {
  const match = source.match(pattern);
  if (!match) throw new Error(`withReleaseSigning: could not find ${what}`);
  return source.replace(pattern, replacement);
}

/** Signs release builds with the keystore named by OH_HELL_UPLOAD_* variables. */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    let gradle = mod.modResults.contents;
    if (gradle.includes(`${PREFIX}_STORE_FILE`)) return mod;
    gradle = replaceOnce(
      gradle,
      /\nandroid \{/,
      `${STORE_FILE}\nandroid {`,
      "the android block",
    );
    gradle = replaceOnce(
      gradle,
      /\n    \}\n    buildTypes \{/,
      `\n${SIGNING_CONFIGS}`,
      "the end of signingConfigs",
    );
    gradle = replaceOnce(
      gradle,
      /\n        release \{\n(?:\s*\/\/[^\n]*\n)*\s*signingConfig signingConfigs\.debug/,
      `\n        release {\n${RELEASE_SIGNING}`,
      "the release signingConfig",
    );
    mod.modResults.contents = gradle;
    return mod;
  });
};
