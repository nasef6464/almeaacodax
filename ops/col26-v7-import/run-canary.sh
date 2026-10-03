#!/usr/bin/env bash
set -e
bash ops/col26-v7-transport/reconstruct.sh
mkdir -p /tmp/cv7
unzip -oq /tmp/COL26_V7_CANONICAL_READY_FINAL.zip -d /tmp/cv7
cd /tmp/cv7
export COL26_PAYLOAD_FILE=COL26_PILOT_PAYLOAD_V7.json
export COL26_IMAGE_DIR=images
export COL26_LEDGER_FILE=COL26_master_ledger_READY_UPLOAD_V7_CANONICAL.csv
export COL26_CONTRACT_FILE=COL26_IMPORT_CONTRACT_GATE_V7.json
export COL26_OUTPUT_FILE=col26-run-report.json
export COL26_MODE=canary
export PILOT_ALLOW_EXTERNAL_RUN=YES
export PILOT_WRITE_AUTHORIZATION=YES
node run-col26-v7-import.mjs
