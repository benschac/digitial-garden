skill_archive_begin() {
  skill_archive_stage=$1
  skill_archive=$(node "$repo/scripts/skill-update.mjs" archive begin "$skill_archive_stage") || return "$?"
  exec 3>&1 4>&2
  umask 077
  set -C
  exec > "$skill_archive/stdout.log" 2> "$skill_archive/stderr.log"
  trap 'skill_archive_finish "$?"' 0
  trap 'trap - 0; exit 129' HUP
  trap 'trap - 0; exit 130' INT
  trap 'trap - 0; exit 143' TERM
}

skill_archive_finish() {
  skill_archive_code=$1
  trap - 0
  skill_archive_output=$skill_archive
  if ! printf '{"exitCode":%s}\n' "$skill_archive_code" > "$skill_archive/exit.json" || ! node "$repo/scripts/skill-update.mjs" archive finish "$skill_archive_stage" "$skill_archive_code" > /dev/null; then
    if [ "$skill_archive_code" -eq 0 ]; then
      skill_archive_code=1
    fi
  else
    skill_archive_output=$skill_archive/sealed
  fi
  cat "$skill_archive_output/stdout.log" >&3
  cat "$skill_archive_output/stderr.log" >&4
  exit "$skill_archive_code"
}
