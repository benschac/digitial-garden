#!/bin/sh
set -eu
PATH=/Users/benjaminschachter/.bun/bin:/Users/benjaminschachter/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
export PATH
pack=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
repo=$(CDPATH= cd -- "$pack/../.." && pwd)
. "$pack/assets/checks/archive.sh"
skill_archive_begin reviewed
node "$repo/scripts/skill-update.mjs" check reviewed
