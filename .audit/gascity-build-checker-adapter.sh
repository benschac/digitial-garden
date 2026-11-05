#!/bin/sh
set -eu
PATH="/opt/homebrew/opt/python@3.12/libexec/bin:${PATH:-/usr/local/bin:/usr/bin:/bin}"
export PATH
exec /Users/benjaminschachter/.gc/cache/repos/6bbc7036c0774e7f911263e5ab60333cea1ac8f9dd70bcaa76328cd2e3532a75/gascity/assets/scripts/checks/build-artifact-valid.sh "$@"
