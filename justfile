default:
    @just --list

install:
    yarn install --frozen-lockfile

fmt:
    yarn format
    alejandra --quiet .

fmt-check:
    yarn format:check
    alejandra --quiet --check .

lint:
    yarn lint

typecheck:
    yarn typecheck

test:
    yarn test

check: fmt-check lint typecheck test

# Expo dev server for the browser.
web *args:
    yarn web "$@"

# Static web export into dist/; set OH_HELL_WEB_BASE_URL to serve under a path.
web-build:
    yarn export:web

# Desktop app (Electron around the web export), built and run through nix.
desktop:
    nix run .#desktop

# Build and run on a connected Android device; run from `nix develop .#android`.
android *args:
    yarn android "$@"

# Build the self-hosted F-Droid repository into target/fdroid; see docs/fdroid.md.
fdroid-repo:
    ./scripts/fdroid/build-repo.sh
