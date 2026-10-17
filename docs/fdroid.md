# Android releases and F-Droid

Android builds are distributed two ways, both from the same signed APK:

- GitHub releases: <https://github.com/colonelpanic8/oh-hell/releases>
- A self-hosted F-Droid repository on GitHub Pages:
  landing page <https://colonelpanic8.github.io/oh-hell/fdroid/>,
  repository address `https://colonelpanic8.github.io/oh-hell/fdroid/repo`

Because the repository indexes the release APKs unchanged, an install from
either place upgrades in place from the other.

## Cutting a release

1. Bump `version` in `package.json` (the Android `versionCode` is derived from
   it as `major * 10000 + minor * 100 + patch`).
2. Add `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`.
3. Commit, tag `v<version>`, and push the tag.

`.github/workflows/release.yml` runs `expo prebuild`, builds a signed
`oh-hell-release.apk`, and attaches it to a GitHub release for the tag. When it
succeeds, `.github/workflows/pages.yml` rebuilds the site: the web app at `/`
and the F-Droid repository at `/fdroid`.

## Signing

`plugins/withReleaseSigning.js` is an Expo config plugin that teaches the
generated `android/app/build.gradle` to sign release builds with the keystore
named by `OH_HELL_UPLOAD_STORE_FILE`, `OH_HELL_UPLOAD_STORE_PASSWORD`,
`OH_HELL_UPLOAD_KEY_ALIAS`, and `OH_HELL_UPLOAD_KEY_PASSWORD`. Without them a
release build falls back to the debug keystore, which CI uses to check that the
build still works; the Release workflow fails instead.

The release keystore lives in the GitHub Actions secrets
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`,
and `ANDROID_KEY_PASSWORD`, and is backed up in the
`signing/oh-hell-android-release` password-store entry. The same key signs the
F-Droid index, so there is a single secret to manage. Changing the key breaks
in-place upgrades; `scripts/fdroid/build-repo.sh` stops collecting older
releases at a signer change for that reason.

## Local repository build

```bash
nix develop .#android
python3 -m venv /tmp/fdroid-venv && /tmp/fdroid-venv/bin/pip install fdroidserver
export PATH=/tmp/fdroid-venv/bin:$PATH
FDROID_KEYSTORE_FILE=... FDROID_KEY_ALIAS=... FDROID_KEYSTORE_PASSWORD=... FDROID_KEY_PASSWORD=... just fdroid-repo
```

The repository is written to `target/fdroid`. Store metadata (title, summary,
description, per-version changelogs) lives in `fastlane/metadata/android/` and
is shared with any external catalog that reads the fastlane layout.
