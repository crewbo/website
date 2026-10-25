#!/usr/bin/env bash
# Copies the brand files the site uses from crewbo/crewbo's docs/brand at the
# commit in CREWBO_REF, unchanged, into brand/ (CLAUDE.md rule 3).
#
#   scripts/sync-brand.sh          copy them
#   scripts/sync-brand.sh --check  exit 1 if brand/ differs from that commit
#
# To take a newer brand: put a newer crewbo commit in CREWBO_REF and run it.
set -euo pipefail

here=$(cd "$(dirname "$0")/.." && pwd)
ref=$(cat "$here/CREWBO_REF")
base="https://raw.githubusercontent.com/crewbo/crewbo/${ref}/docs/brand"
files=(
  tokens/tokens.css
  reference/component/bo.js
  reference/component/bo.css
  assets/fonts/instrument-sans-latin-400-normal.woff2
  assets/fonts/instrument-sans-latin-500-normal.woff2
  assets/fonts/instrument-sans-latin-600-normal.woff2
  assets/fonts/instrument-sans-latin-700-normal.woff2
  assets/fonts/jetbrains-mono-latin-400-normal.woff2
  assets/fonts/jetbrains-mono-latin-500-normal.woff2
  assets/fonts/LICENSE-InstrumentSans-OFL.txt
  assets/fonts/LICENSE-JetBrainsMono-OFL.txt
  assets/fonts/instrument-serif-latin-400-normal.woff2
  assets/fonts/LICENSE-InstrumentSerif-OFL.txt
  assets/svg/logo/lockup-light.svg
  assets/svg/logo/lockup-dark.svg
  assets/svg/logo/mark-black.svg
  assets/svg/logo/mark-white.svg
  assets/png/favicon.ico
  assets/png/favicon-32.png
  assets/png/apple-touch-icon-180.png
  assets/png/favicon-192.png
  assets/png/favicon-512.png
  assets/png/social-preview-1280x640.png
)

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for f in "${files[@]}"; do
  mkdir -p "$tmp/$(dirname "$f")"
  curl -fsSL "$base/$f" -o "$tmp/$f"
done

if [[ "${1:-}" == "--check" ]]; then
  if diff -r "$tmp" "$here/brand" > /dev/null; then
    echo "brand/ matches crewbo ${ref:0:7}"
    exit 0
  fi
  echo "brand/ differs from crewbo ${ref:0:7}; run scripts/sync-brand.sh" >&2
  diff -rq "$tmp" "$here/brand" >&2 || true
  exit 1
fi

rm -rf "$here/brand"
cp -r "$tmp" "$here/brand"
echo "brand/ copied from crewbo ${ref:0:7} (${#files[@]} files)"
