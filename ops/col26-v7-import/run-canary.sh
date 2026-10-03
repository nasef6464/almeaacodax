#!/usr/bin/env bash
set -euo pipefail
bash ops/col26-v7-transport/reconstruct.sh
rm -rf /tmp/cv7 && mkdir -p /tmp/cv7
unzip -oq /tmp/COL26_V7_CANONICAL_READY_FINAL.zip -d /tmp/cv7
cd /tmp/cv7
export COL26_PAYLOAD_FILE=COL26_PILOT_PAYLOAD_V7.json
export COL26_IMAGE_DIR=images
export COL26_LEDGER_FILE=COL26_master_ledger_READY_UPLOAD_V7_CANONICAL.csv
export COL26_CONTRACT_FILE=COL26_IMPORT_CONTRACT_GATE_V7.json
export COL26_OUTPUT_FILE=col26-run-report.json
export COL26_MODE=full
export PILOT_ALLOW_EXTERNAL_RUN=YES
export PILOT_WRITE_AUTHORIZATION=YES

# Keep the canonical V7 importer unchanged, but execute bounded slices so
# presign -> dry-run -> upload -> write completes inside R2 TTL and API limits.
cp COL26_PILOT_PAYLOAD_V7.json COL26_PILOT_PAYLOAD_V7.full.json
node <<'NODE'
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('COL26_PILOT_PAYLOAD_V7.full.json','utf8'));
const items=Array.isArray(p)?p:(p.items||p.questions||[]);
if(!items.length) throw new Error('COL26 V7 payload has no items');
fs.writeFileSync('/tmp/col26-total',String(items.length));
NODE
TOTAL=$(cat /tmp/col26-total)
SLICE_SIZE=25
START=0
while [ "$START" -lt "$TOTAL" ]; do
  node - "$START" "$SLICE_SIZE" <<'NODE'
const fs=require('fs');
const start=Number(process.argv[2]), size=Number(process.argv[3]);
const p=JSON.parse(fs.readFileSync('COL26_PILOT_PAYLOAD_V7.full.json','utf8'));
const key=Array.isArray(p)?null:(Array.isArray(p.items)?'items':(Array.isArray(p.questions)?'questions':null));
const items=Array.isArray(p)?p:p[key];
const slice=items.slice(start,start+size);
const out=Array.isArray(p)?slice:{...p,[key]:slice};
fs.writeFileSync('COL26_PILOT_PAYLOAD_V7.json',JSON.stringify(out));
console.log('COL26_SLICE',start,start+slice.length-1,'COUNT',slice.length);
NODE
  export COL26_MODE=full
  node run-col26-v7-import.mjs
  START=$((START+SLICE_SIZE))
done
cp COL26_PILOT_PAYLOAD_V7.full.json COL26_PILOT_PAYLOAD_V7.json
export COL26_MODE=verify
node run-col26-v7-import.mjs
