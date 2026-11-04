#!/bin/sh
set -eu
PATH=/Users/benjaminschachter/.bun/bin:/Users/benjaminschachter/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
export PATH
case "$1" in prepared|integrated) stage=$1 ;; *) exit 1 ;; esac
pack=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
repo=$(CDPATH= cd -- "$pack/../.." && pwd)
result=$(node "$repo/scripts/skill-update.mjs" check "$stage")
checkout=$(printf '%s' "$result" | jq -er '.checkout')
base=$(printf '%s' "$result" | jq -er '.base')
: "${GC_CITY:?}"
: "${GC_ARTIFACT_DIR:?}"
mkdir -p "$GC_CITY/.gc/dependency-updates"
flock --exclusive --timeout 300 "$GC_CITY/.gc/dependency-updates/verify.lock" sh -c '
  set -eu
  cd -- "$1"
  bun install --frozen-lockfile --ignore-scripts
  TURBO_SCM_BASE="$2" TURBO_SCM_HEAD=HEAD bun run verify
' sh "$checkout" "$base" >> "$GC_ARTIFACT_DIR/qualification.log" 2>&1
node "$repo/scripts/skill-update.mjs" qualify "$stage" "$result"
printf '%s\n' "$result"
