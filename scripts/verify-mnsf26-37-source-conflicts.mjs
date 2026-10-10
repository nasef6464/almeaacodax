#!/usr/bin/env node
// Fail-closed MNSF26 source-conflict gate. Reads local repository JSON only.
import fs from 'node:fs';
import path from 'node:path';
const expected = "GEO-T001-Q19 GEO-T003-Q20 GEO-T005-Q11 GEO-T007-Q03 GEO-T007-Q17 GEO-T011-Q10 AR-T037-Q14 AR-T039-Q03 AR-T040-Q13 AR-T049-Q16 AR-T051-Q01 AR-T051-Q05 AR-T051-Q06 AR-T051-Q12 AR-T051-Q14 AR-T055-Q08 AR-T057-Q12 AR-T057-Q14 AR-T058-Q11 AR-T059-Q09 AR-T054-Q01 AR-T054-Q05 AR-T057-Q02 AR-T058-Q19 AR-T063-Q19 GEO-T048-Q20 GEO-T050-Q03 GEO-T035-Q07 GEO-T014-Q01 GEO-T020-Q05 AR-T039-Q04 GEO-T026-Q17 GEO-T027-Q02 GEO-T010-Q19 GEO-T010-Q09 GEO-T027-Q13 GEO-T008-Q14".split(' ').map(x => 'MNSF26-' + x);
if (new Set(expected).size !== 37) throw new Error('Invalid conflict inventory');
const root = path.resolve(process.env.MNSF26_ROOT || 'docs/content/mnsf26');
const hits = new Map(expected.map(key => [key, []]));
const failures = [];
let filesRead = 0;
try {
  const files = fs.readdirSync(root).filter(name => /^MNSF26_QUESTION_MASTERING_.*\.json$/.test(name));
  if (!files.length) throw new Error('No original MASTER files');
  for (const file of files) {
    let doc;
    try { doc = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
    catch { failures.push({file,reason:'UNREADABLE_MASTER'}); continue; }
    if (!Array.isArray(doc.records)) { failures.push({file,reason:'NO_RECORDS'}); continue; }
    filesRead++;
    for (const row of doc.records) {
      const key = row.sourceKey || row.id;
      if (hits.has(key)) hits.get(key).push({file,status:row.status,eligible:row.importEligible,sha:row.imageHash,sourceSha:row.sourceProvenance?.cropSha256});
    }
  }
} catch(e) { failures.push({reason:'SOURCE_DIRECTORY_UNREADABLE',detail:String(e.message)}); }
let checked = 0;
for (const [key, rows] of hits) {
  if (rows.length !== 1) { failures.push({key,reason:'NOT_EXACTLY_ONE_SOURCE_RECORD',count:rows.length}); continue; }
  checked++;
  const row = rows[0];
  if (row.status !== 'REVIEW' || row.eligible !== false) failures.push({key,reason:'SOURCE_CONFLICT_NOT_QUARANTINED',status:row.status,eligible:row.eligible??null});
  if (!/^[a-f0-9]{64}$/i.test(row.sha||'') || row.sha !== row.sourceSha) failures.push({key,reason:'SOURCE_HASH_MISMATCH'});
}
const ok = checked === 37 && failures.length === 0;
console.log(JSON.stringify({bank:'MNSF26',gate:'37_SOURCE_CONFLICTS',ok,expected:37,checked,filesRead,failures:failures.slice(0,100),productionTouched:false},null,2));
if (!ok) process.exitCode = 1;
