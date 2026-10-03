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
cp run-col26-v7-import.mjs run-col26-v7-import.slice.mjs
# Patch only the ephemeral runner guard; canonical ZIP and importer remain byte-identical.
sed -i 's/const expected = Number(contract\\.questionCount || 1012);/const expected = Number(process.env.COL26_EXPECTED_COUNT || contract.questionCount || 1012);/' run-col26-v7-import.slice.mjs
node <<'NODE'
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('COL26_PILOT_PAYLOAD_V7.full.json','utf8'));
const items=Array.isArray(p)?p:(p.items||p.questions||[]);
if(!items.length) throw new Error('COL26 V7 payload has no items');
fs.writeFileSync('/tmp/col26-total',String(items.length));
NODE
TOTAL=$(cat /tmp/col26-total)
# Query production batch state and build a resume payload containing only missing codes.
node <<'NODE'
const fs=require('fs');
(async()=>{
 const API=(process.env.PILOT_API_BASE||'').replace(/\/$/,'');
 const token=process.env.PILOT_ADMIN_TOKEN||'';
 const r=await fetch(API+'/quizzes/questions/import-batch/TAH-MATH-COL26-SEC1-V7',{headers:{authorization:'Bearer '+token,accept:'application/json'}});
 if(!r.ok) throw new Error('batch checkpoint HTTP '+r.status);
 const b=await r.json();
 const existing=new Set((b.questionCodes||[]).map(String));
 const p=JSON.parse(fs.readFileSync('COL26_PILOT_PAYLOAD_V7.full.json','utf8'));
 const key=Array.isArray(p)?null:(Array.isArray(p.items)?'items':'questions');
 const items=Array.isArray(p)?p:p[key];
 const missing=items.filter(x=>!existing.has(String(x.questionCode||'').trim().toUpperCase()));
 fs.writeFileSync('COL26_PILOT_PAYLOAD_V7.missing.json',JSON.stringify(Array.isArray(p)?missing:{...p,[key]:missing}));
 fs.writeFileSync('/tmp/col26-missing',String(missing.length));
 console.log('COL26_CHECKPOINT existing='+existing.size+' missing='+missing.length);
})().catch(e=>{console.error(e.message);process.exit(1)});
NODE
MISSING=$(cat /tmp/col26-missing)
SLICE_SIZE=20
START=0
while [ "$START" -lt "$MISSING" ]; do
  node - "$START" "$SLICE_SIZE" <<'NODE'
const fs=require('fs');
const start=Number(process.argv[2]), size=Number(process.argv[3]);
const full=JSON.parse(fs.readFileSync('COL26_PILOT_PAYLOAD_V7.full.json','utf8'));
const miss=JSON.parse(fs.readFileSync('COL26_PILOT_PAYLOAD_V7.missing.json','utf8'));
const key=Array.isArray(full)?null:(Array.isArray(full.items)?'items':'questions');
const all=Array.isArray(full)?full:full[key], m=Array.isArray(miss)?miss:miss[key];
const baseline=all.slice(0,5), fresh=m.slice(start,start+size);
const slice=[...baseline,...fresh];
const out=Array.isArray(full)?slice:{...full,[key]:slice};
fs.writeFileSync('COL26_PILOT_PAYLOAD_V7.json',JSON.stringify(out));
console.log('COL26_RESUME_SLICE',start,start+fresh.length-1,'NEW',fresh.length);
NODE
  export COL26_MODE=full
  export COL26_EXPECTED_COUNT=$(node -e "const p=require('./COL26_PILOT_PAYLOAD_V7.json');console.log(Array.isArray(p)?p.length:(p.items||p.questions).length)")
  node run-col26-v7-import.slice.mjs
  START=$((START+SLICE_SIZE))
done
cp COL26_PILOT_PAYLOAD_V7.full.json COL26_PILOT_PAYLOAD_V7.json
unset COL26_EXPECTED_COUNT
export COL26_MODE=verify
node run-col26-v7-import.mjs
