#!/bin/sh
set -eu
pack=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
exec sh "$pack/assets/checks/qualify.sh" prepared
