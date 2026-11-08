#!/bin/sh
set -eu
: "${GC_CITY:?}"
repo=$(gc --city "$GC_CITY" rig list --json | jq -er '[.rigs[] | select(.name == "personal-site")] | if length == 1 then .[0].path else error("Expected one registered personal-site rig") end')
case "$repo" in /*) ;; *) exit 1 ;; esac
node=$(command -v node)
case "$node" in /*) ;; *) exit 1 ;; esac
SKILL_REGISTERED_RIG=$repo
export SKILL_REGISTERED_RIG
. "$repo/gascity/skill-updates/assets/checks/archive.sh"
skill_archive_begin scanned
"$node" "$repo/scripts/skill-update.mjs" scan-check
