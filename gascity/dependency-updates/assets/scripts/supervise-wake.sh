#!/usr/bin/env bash
set -euo pipefail

: "${GC_CITY:?GC_CITY must identify the managed city}"
if [ "$#" -gt 1 ] || { [ "$#" -eq 1 ] && [ "$1" != '--snapshot' ]; }; then exit 2; fi
PACK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
STATE_DIR="$GC_CITY/.gc/dependency-updates/supervision"
mkdir -p "$STATE_DIR"
exec 9>"$STATE_DIR/wake.lock"
if flock -n -E 75 9; then
    :
else
    LOCK_STATUS=$?
    if [ "$LOCK_STATUS" -eq 75 ] && [ "${1:-}" != '--snapshot' ]; then exit 0; fi
    exit "$LOCK_STATUS"
fi

exec bun "$PACK_ROOT/assets/scripts/supervise-wake.ts" "$@"
