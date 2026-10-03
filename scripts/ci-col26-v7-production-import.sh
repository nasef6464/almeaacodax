#!/usr/bin/env bash
set -euo pipefail

: "${SMOKE_ADMIN_TOKEN:?SMOKE_ADMIN_TOKEN is required}"
export PILOT_API_BASE="${PILOT_API_BASE:-https://almeaacodax.vercel.app/api}"
export PILOT_ALLOW_EXTERNAL_RUN=YES
export PILOT_WRITE_AUTHORIZATION=YES
export COL26_PAYLOAD_FILE=/tmp/col26/COL26_PILOT_PAYLOAD_V7.json
export COL26_IMAGE_DIR=/tmp/col26/images
export COL26_EXPECTED_COUNT=1012
export COL26_BATCH_ID=TAH-MATH-COL26-SEC1-V7

rm -rf /tmp/col26 /tmp/col26.zip /tmp/col26.b64
mkdir -p /tmp/col26

find .col26-package -type f -name '*.b64' -print0 | sort -z | xargs -0 cat > /tmp/col26.b64
base64 --decode /tmp/col26.b64 > /tmp/col26.zip
echo "d92e99514951d233e5141e1ef518d79eda4e0430e195fa8dde83c4cab629edc5  /tmp/col26.zip" | sha256sum -c -
unzip -q /tmp/col26.zip -d /tmp/col26

test "$(find /tmp/col26/images -type f -name '*.webp' | wc -l)" -eq 1012

run_mode() {
  local mode="$1"
  local out="/tmp/col26-${mode}.json"
  COL26_MODE="$mode" COL26_OUTPUT_FILE="$out" node /tmp/col26/run-col26-v7-import.mjs
}

run_mode prepare
run_mode verify

existing_count="$(node -e 'const r=require("/tmp/col26-verify.json");process.stdout.write(String(Number(r.verification?.count||0)))')"
existing_drafts="$(node -e 'const r=require("/tmp/col26-verify.json");process.stdout.write(String(Number(r.verification?.drafts||0)))')"

if [ "$existing_count" = "0" ] && [ "$existing_drafts" = "0" ]; then
  run_mode canary
  node <<'NODE'
const fs=require("fs");
const r=JSON.parse(fs.readFileSync("/tmp/col26-canary.json","utf8"));
const v=r.verification||{};
if (r.uploaded!==5 || Number(v.count)!==5 || Number(v.drafts)!==5) process.exit(1);
console.log("COL26 canary PASS: 5/5 Draft");
NODE
  existing_count=5
  existing_drafts=5
elif [ "$existing_count" = "5" ] && [ "$existing_drafts" = "5" ]; then
  echo "COL26 canary already PASS: 5/5 Draft; resuming at item 6."
elif [ "$existing_count" = "1012" ] && [ "$existing_drafts" = "1012" ]; then
  echo "COL26 full Draft batch already present; skipping writes."
else
  echo "Unexpected COL26 batch state count=$existing_count drafts=$existing_drafts" >&2
  exit 1
fi

if [ "$existing_count" = "5" ]; then
  run_mode full
  node <<'NODE'
const fs=require("fs");
const r=JSON.parse(fs.readFileSync("/tmp/col26-full.json","utf8"));
const v=r.verification||{};
if (r.uploaded!==1007 || Number(v.count)!==1012 || Number(v.drafts)!==1012) process.exit(1);
console.log("COL26 full import PASS: 1012/1012 Draft");
NODE
fi

run_mode verify
node <<'NODE'
const fs=require("fs");
const r=JSON.parse(fs.readFileSync("/tmp/col26-verify.json","utf8"));
const v=r.verification||{};
if (Number(v.count)!==1012 || Number(v.drafts)!==1012) process.exit(1);
console.log("COL26 final batch verification PASS: 1012/1012 Draft");
NODE
