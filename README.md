# oh-hell

Scorekeeper for the card game Oh Hell, for web, desktop, and Android. One
person keeps score for the table; games are saved on the device.

Rules are configurable (scoring, hand sequence, hook, trump, target score) with
presets for common variants. The default, "Tricks or difference", scores your
bid when you make it and minus the difference when you miss.

```sh
direnv allow
just install
just check     # format, lint, typecheck, tests
just web       # browser dev server
just desktop   # desktop app via nix
just android   # from `nix develop .#android`
```

Licensed under MIT.
