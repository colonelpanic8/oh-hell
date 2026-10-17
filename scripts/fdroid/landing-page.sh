#!/usr/bin/env bash
# Write a small page describing the F-Droid repository.
# Usage: landing-page.sh <fdroid-build-dir> <output-html>
set -euo pipefail
build_dir="$1"
out="$2"
repo_url="$(sed -n 's/^repo_url:[[:space:]]*//p' fdroid/config.yml)"
fingerprint="$(cat "$build_dir/fingerprint.txt" 2>/dev/null || true)"
add_url="$repo_url"
[[ -n "$fingerprint" ]] && add_url="$repo_url?fingerprint=$fingerprint"
apks=""
for apk in "$build_dir"/repo/*.apk; do
  name="$(basename "$apk")"
  apks+="<li><a href=\"repo/$name\">$name</a></li>"
done
cat > "$out" <<HTML
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Oh Hell F-Droid repository</title>
<style>
:root{color-scheme:light dark}body{margin:0 auto;max-width:44rem;padding:2.5rem 1.25rem 4rem;font:16px/1.6 system-ui,sans-serif}
h1{display:flex;align-items:center;gap:.75rem;font-size:1.6rem}h1 img{width:3rem;height:3rem;border-radius:.75rem}
pre,code{font-family:ui-monospace,monospace;font-size:.9em}pre{padding:.85rem 1rem;border-radius:.5rem;background:rgba(127,127,127,.14);white-space:pre-wrap;overflow-wrap:anywhere}
.cta{display:inline-block;margin:.5rem 0 1.5rem;padding:.7rem 1.2rem;border-radius:.5rem;background:#6750a4;color:#fff;font-weight:600;text-decoration:none}
</style></head><body>
<h1><img src="repo/icons/icon.png" alt="">Oh Hell F-Droid repository</h1>
<p>Install the Android app through F-Droid and get updates automatically. The APKs are the same ones attached to the <a href="https://github.com/colonelpanic8/oh-hell/releases">GitHub releases</a>.</p>
<a class="cta" href="$add_url">Add repository to F-Droid</a>
<p>Or add it by hand in F-Droid under Settings &rsaquo; Repositories:</p>
<pre>$repo_url</pre>
${fingerprint:+<p>Fingerprint:</p><pre>$fingerprint</pre>}
<p>Available APKs:</p><ul>$apks</ul>
<p><a href="../">Open the web app</a></p>
</body></html>
HTML
