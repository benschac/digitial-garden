#!/usr/bin/env bash
set -euo pipefail
set -m

cd "$(dirname "$0")/.."
city=.tools/gascity
owned_city=0
child_pid=

cleanup() {
  result=$?
  trap - EXIT INT TERM
  if [ -n "$child_pid" ]; then
    kill -TERM -- "-$child_pid" 2>/dev/null || true
    wait "$child_pid" 2>/dev/null || true
  fi
  if [ "$owned_city" = 1 ]; then
    if gc --city "$city" stop; then
      :
    elif [ "$result" = 0 ]; then
      result=1
    fi
  fi
  exit "$result"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [ ! -f "$city/city.toml" ]; then
  echo 'Gas City is not initialized. Follow the Gas City setup in README.md.' >&2
  exit 1
fi

exec 9>"$city/dev.lock"
if ! flock -n 9; then
  echo 'Development is already running for this checkout.' >&2
  exit 1
fi

running=$(gc --city "$city" status --json | jq -er '.controller.running | if type == "boolean" then tostring else error("missing controller state") end')
if [ "$running" = false ]; then
  owned_city=1
  gc --city "$city" start &
  child_pid=$!
  wait "$child_pid"
  child_pid=
fi

turbo run dev --ui=stream "$@" &
child_pid=$!
wait "$child_pid"
child_pid=
