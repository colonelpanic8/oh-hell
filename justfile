set positional-arguments := true

app_pkg := "oh-hell-app"

default:
    @just --list

fmt:
    cargo fmt --all
    alejandra --quiet .

fmt-check:
    cargo fmt --all --check
    alejandra --quiet --check .

# The app's default `web` feature only builds for wasm32, so native runs use `desktop`.
lint:
    cargo clippy --workspace --exclude {{app_pkg}} --all-targets -- -D warnings
    cargo clippy -p {{app_pkg}} --all-targets --no-default-features --features desktop -- -D warnings
    cargo clippy -p {{app_pkg}} --target wasm32-unknown-unknown -- -D warnings

test:
    cargo test --workspace --exclude {{app_pkg}}
    cargo test -p {{app_pkg}} --no-default-features --features desktop

build:
    cargo build --workspace --exclude {{app_pkg}}
    cargo build -p {{app_pkg}} --no-default-features --features desktop

web-build:
    dx build --web --package {{app_pkg}} --release --debug-symbols false

check: fmt-check lint test web-build

# Run the API server; pass --web-dir to also serve a built web client.
serve *args:
    cargo run -p oh-hell-server -- "$@"

# Dioxus web dev server.
web *args:
    dx serve --web --package {{app_pkg}} "$@"

# Dioxus desktop app.
desktop *args:
    dx serve --platform desktop --package {{app_pkg}} --no-default-features --features desktop "$@"

# Android debug build; run from `nix develop .#android`.
android-build *args:
    dx build --android --package {{app_pkg}} --no-default-features --features android "$@"
