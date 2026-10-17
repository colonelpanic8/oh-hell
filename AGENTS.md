# oh-hell

Scorekeeper for the card game Oh Hell. One Rust codebase ships three surfaces:

- **Web**, self-hosted behind a DuckDNS hostname: the Dioxus wasm build,
  served by `oh-hell-server`, which also exposes the HTTP API.
- **Desktop**: Dioxus desktop.
- **Android**: Dioxus mobile.

Modeled on `keepbook` (`~/projects/keepbook`); look there first when adding
Android release/F-Droid packaging, desktop bundling, or deployment pieces.

## Structure

```
crates/
  oh-hell-core/    # scoring rules + game state; no UI, no I/O
  oh-hell-server/  # headless service layer; `http` feature = axum API + static web host
  oh-hell-app/     # Dioxus UI; features: web (default), desktop, mobile, android
nix/module.nix     # NixOS module: services.oh-hell
```

## Invariants

- Scoring and game logic live only in `oh-hell-core`. UI code must not
  reimplement any of it; if a view needs a derived value (totals, standings,
  valid bids), add it to core/server and consume that.
- Native builds (desktop, Android) link `oh-hell-server` in-process with
  `default-features = false`. The wasm build talks to the same API over HTTP.
- `wasm-bindgen` is pinned exactly in `crates/oh-hell-app/Cargo.toml` to match
  `wasm-bindgen-cli_0_2_118` in `flake.nix`, and `dioxus` is pinned to the
  nixpkgs `dioxus-cli` version. Bump them together.
- The version lives once, in `[workspace.package]` in `Cargo.toml`; the flake
  reads it from there.

## Development

- Use the direnv environment. Outside it, run `direnv exec . <cmd>` from the
  repo root rather than `nix develop -c`.
- Android work needs `nix develop .#android` (SDK/NDK/JDK).
- `just check` runs formatting, clippy (workspace + desktop feature), tests, and
  the web build. CI runs the same thing.
- `just serve`, `just web`, `just desktop` for local dev.
