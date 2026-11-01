#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
city=.tools/gascity

if [ ! -f "$city/city.toml" ]; then
  echo 'Gas City is not initialized. Follow the Gas City setup in README.md.' >&2
  exit 1
fi

exec 9>"$city/dev.lock"
if ! flock -n 9; then
  echo 'Development is already running for this checkout.' >&2
  exit 1
fi

exec node scripts/dev.mjs "$@"
