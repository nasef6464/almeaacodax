import fs from 'node:fs';
import path from 'node:path';

const folder = path.resolve('docs/content/mnsf26');

// 1. Load taxonomy
const taxonomy = JSON.parse(fs.readFileSync(path.join(folder, 'MNSF26_CANONICAL_TAXONOMY_25_95_V1.json'), 'utf8'));
const mainMap = new Map();
const subMap = new Map();
for (const main of taxonomy) {
  mainMap.set(main.id, main);
  for (const sub of main.subSkills) {
    subMap.set(sub.id, { ...sub, mainSkillId: main.id, mainSkillName: main.name });
  }
}

// 2. Candidate & Source Skill Lookup
const candidateMapDoc = JSON.parse(fs.readFileSync(path.join(folder, 'MNSF26_SOURCE_TO_CANONICAL_CANDIDATE_MAP_V1.json'), 'utf8'));
const candidateLookup = new Map();
for (const group of candidateMapDoc.sourceGroups) {
  for (const t of group.tests) {
    candidateLookup.set(`${group.sourcePart}|${t}`, group.candidates);
  }
}

const sourceSkillIndexDoc = JSON.parse(fs.readFileSync(path.join(folder, 'MNSF26_SOURCE_SKILL_INDEX_V1.json'), 'utf8'));
const sourceSkillLookup = new Map();
for (const group of sourceSkillIndexDoc.sourceGroups) {
  for (const t of group.tests) {
    sourceSkillLookup.set(`${group.sourcePart}|${t}`, group.sourceSkillLabel);
  }
}

// 3. 37 Source conflicts list
const conflictList = "GEO-T001-Q19 GEO-T003-Q20 GEO-T005-Q11 GEO-T007-Q03 GEO-T007-Q17 GEO-T011-Q10 AR-T037-Q14 AR-T039-Q03 AR-T040-Q13 AR-T049-Q16 AR-T051-Q01 AR-T051-Q05 AR-T051-Q06 AR-T051-Q12 AR-T051-Q14 AR-T055-Q08 AR-T057-Q12 AR-T057-Q14 AR-T058-Q11 AR-T059-Q09 AR-T054-Q01 AR-T054-Q05 AR-T057-Q02 AR-T058-Q19 AR-T063-Q19 GEO-T048-Q20 GEO-T050-Q03 GEO-T035-Q07 GEO-T014-Q01 GEO-T020-Q05 AR-T039-Q04 GEO-T026-Q17 GEO-T027-Q02 GEO-T010-Q19 GEO-T010-Q09 GEO-T027-Q13 GEO-T008-Q14".split(' ').map(x => 'MNSF26-' + x);
const conflictSet = new Set(conflictList);

// 4. Known exclusions & holds
const excludedSet = new Set([
  'MNSF26-GEO-T024-Q18', // Absent from source
  'MNSF26-AR-T002-Q09',  // Suppression 1
  'MNSF26-AR-T002-Q10',  // Suppression 2
  'MNSF26-AR-T014-Q08',  // Suppression 3
  'MNSF26-AR-T018-Q20',  // Suppression 4
  'MNSF26-AR-T053-MISSING' // Absent Test 33
]);

const explicitHolds = new Set([
  'MNSF26-AR-T001-Q10',
  'MNSF26-AR-T013-Q15'
]);

// 5. Load MASTER records from the 348 files
const masterFiles = fs.readdirSync(folder).filter(f => /^MNSF26_QUESTION_MASTERING_.*\.json$/.test(f));
const masterRecordsByKey = new Map();

for (const file of masterFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8'));
    if (!Array.isArray(data.records)) continue;
    for (const rec of data.records) {
      const rawKey = rec.sourceKey || rec.id || rec.questionCode;
      if (!rawKey) continue;
      const match = /^MNSF26-(AR|GEO)-T0*(\d+)-Q0*(\d+)$/i.exec(rawKey.trim());
      if (!match) continue;
      const key = `MNSF26-${match[1].toUpperCase()}-T${String(Number(match[2])).padStart(3, '0')}-Q${String(Number(match[3])).padStart(2, '0')}`;
      
      if (!masterRecordsByKey.has(key)) {
        masterRecordsByKey.set(key, { ...rec, sourceKey: key, masterFile: file });
      } else {
        const existing = masterRecordsByKey.get(key);
        if (rec.status === 'MASTERED' && existing.status !== 'MASTERED' && !conflictSet.has(key)) {
          masterRecordsByKey.set(key, { ...rec, sourceKey: key, masterFile: file });
        }
      }
    }
  } catch (e) {}
}

// 6. Load Early Enrichment Records
const enrichmentDoc = JSON.parse(fs.readFileSync(path.join(folder, 'MNSF26_CONTENT_ENRICHMENT_V1.json'), 'utf8'));
const enrichmentMap = new Map();
for (const rec of enrichmentDoc.records) {
  const match = /P0*(\d+)-Q0*(\d+)/i.exec(rec.questionCode);
  if (match) {
    const key = `MNSF26-AR-T${String(Number(match[1])).padStart(3, '0')}-Q${String(Number(match[2])).padStart(2, '0')}`;
    enrichmentMap.set(key, rec);
  }
}

// 7. Load Geometry Work Queue
const geoQueue = JSON.parse(fs.readFileSync(path.join(folder, 'MNSF26_GEOMETRY_QUESTION_WORK_QUEUE_V1.json'), 'utf8'));

const catalogMap = new Map();

// Add Geometry questions (931)
for (const g of geoQueue.records) {
  const match = /^MNSF26-(AR|GEO)-T0*(\d+)-Q0*(\d+)$/i.exec(g.sourceId.trim());
  const key = `MNSF26-GEO-T${String(Number(match[2])).padStart(3, '0')}-Q${String(Number(match[3])).padStart(2, '0')}`;
  const testNumber = Number(match[2]);
  const questionNumber = Number(match[3]);
  const candidates = candidateLookup.get(`الهندسة|${testNumber}`) || [];
  const sourceLabel = sourceSkillLookup.get(`الهندسة|${testNumber}`) || g.sourceLessonLabel;
  const master = masterRecordsByKey.get(key);

  catalogMap.set(key, {
    sourceKey: key,
    sourcePart: 'الهندسة',
    testNumber,
    questionNumber,
    pdfPage: g.startPdfPage || master?.sourceProvenance?.pdfPage || null,
    sourceSkillLabel: sourceLabel,
    candidates,
    isConflict: conflictSet.has(key),
    isExcluded: excludedSet.has(key),
    isExplicitHold: explicitHolds.has(key),
    masterRecord: master || null,
    enrichmentRecord: null
  });
}

// Add Arithmetic questions (1,204)
// Loop through test 1 to 63 (skipping test 33 which is absent in source)
// We collect from masterRecordsByKey and enrichmentMap
const allArKeys = new Set([...masterRecordsByKey.keys()].filter(k => k.startsWith('MNSF26-AR-')));
for (const k of enrichmentMap.keys()) allArKeys.add(k);

for (const key of [...allArKeys].sort()) {
  const match = /^MNSF26-AR-T0*(\d+)-Q0*(\d+)$/i.exec(key);
  if (!match) continue;
  const testNumber = Number(match[1]);
  const questionNumber = Number(match[2]);
  const candidates = candidateLookup.get(`الحساب/الجبر|${testNumber}`) || [];
  const sourceLabel = sourceSkillLookup.get(`الحساب/الجبر|${testNumber}`) || 'الحساب والجبر';
  const master = masterRecordsByKey.get(key);
  const enrichment = enrichmentMap.get(key);

  catalogMap.set(key, {
    sourceKey: key,
    sourcePart: 'الحساب/الجبر',
    testNumber,
    questionNumber,
    pdfPage: master?.sourceProvenance?.pdfPage || enrichment?.pdfPage || null,
    sourceSkillLabel: master?.sourceProvenance?.sourceSkillLabel || sourceLabel,
    candidates,
    isConflict: conflictSet.has(key),
    isExcluded: excludedSet.has(key),
    isExplicitHold: explicitHolds.has(key),
    masterRecord: master || null,
    enrichmentRecord: enrichment || null
  });
}

const catalog = [...catalogMap.values()];

console.log(JSON.stringify({
  totalCatalog: catalog.length,
  geometry: catalog.filter(c => c.sourcePart === 'الهندسة').length,
  arithmetic: catalog.filter(c => c.sourcePart === 'الحساب/الجبر').length,
  conflicts: catalog.filter(c => c.isConflict).length,
  excluded: catalog.filter(c => c.isExcluded).length,
  hasMasterOrEnrichment: catalog.filter(c => c.masterRecord || c.enrichmentRecord).length
}, null, 2));

fs.writeFileSync(path.join(folder, 'MNSF26_COMPLETE_CATALOG_INDEX_V1.json'), JSON.stringify(catalog, null, 2), 'utf8');
console.log('Saved updated catalog to MNSF26_COMPLETE_CATALOG_INDEX_V1.json');
