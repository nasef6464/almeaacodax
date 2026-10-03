#!/usr/bin/env bash
set -euo pipefail
bash ops/col26-v7-transport/reconstruct.sh
work=/tmp/col26-v7
rm -rf "$work"
mkdir -p "$work"
unzip -q /tmp/COL26_V7_CANONICAL_READY_FINAL.zip -d "$work"
cd "$work"
node run-col26-v7-import.mjs
