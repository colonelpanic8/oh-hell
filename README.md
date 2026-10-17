# oh-hell

Scorekeeper for the card game Oh Hell, for web, desktop, and Android. One
person keeps score for the table; games are saved on the device.

Rules are configurable (scoring, hand sequence, hook, trump, target score) with
presets for common variants. The default, "Tricks or difference", scores your
bid when you make it and minus the difference when you miss.

- Web: <https://colonelpanic8.github.io/oh-hell/>
- Android: APKs on the [releases page](https://github.com/colonelpanic8/oh-hell/releases),
  or add the [F-Droid repository](https://colonelpanic8.github.io/oh-hell/fdroid/)
  for automatic updates. See [docs/fdroid.md](docs/fdroid.md).
- Desktop (Linux): `nix run github:colonelpanic8/oh-hell#desktop`

```sh
direnv allow
just install
just check     # format, lint, typecheck, tests
just web       # browser dev server
just desktop   # desktop app via nix
just android   # from `nix develop .#android`
```

Licensed under MIT.
