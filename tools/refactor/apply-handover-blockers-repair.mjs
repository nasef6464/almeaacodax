import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HANDOVER_PATH = path.join(ROOT, 'docs', 'NEXT_SESSION_HANDOVER_AR.md');
const CHECK_ONLY = process.argv.includes('--check');

const content = fs.readFileSync(HANDOVER_PATH, 'utf8');
const markers = [];
for (const re of [/^##\s+BATCH\s+\d+.*$/gm, /^##\s+Update\s+BATCH\s+\d+.*$/gm]) {
  for (const match of content.matchAll(re)) {
    markers.push({ index: match.index ?? 0, heading: match[0] });
  }
}
markers.sort((a, b) => a.index - b.index);

if (!markers.length) {
  throw new Error('No BATCH section found in docs/NEXT_SESSION_HANDOVER_AR.md');
}

const latest = markers.at(-1);
const section = content.slice(latest.index);
const isBatch247 = /^##\s+(?:Update\s+)?BATCH\s+247\b/.test(latest.heading);

if (!isBatch247) {
  throw new Error(`Refusing handover repair: latest batch is not BATCH 247 (${latest.heading}).`);
}

if (section.includes('Blockers:')) {
  console.log(JSON.stringify({ status: 'ALREADY_REPAIRED', heading: latest.heading }, null, 2));
  process.exit(0);
}

const expectedEvidence = '15 BLOCKED';
if (!section.includes(expectedEvidence) || !section.includes('role credentials')) {
  throw new Error('Refusing handover repair: expected BATCH 247 blocked-role evidence is missing.');
}

const anchor = '- Next exact task:';
const anchorIndex = section.indexOf(anchor);
if (anchorIndex === -1) {
  throw new Error('Refusing handover repair: BATCH 247 Next exact task anchor is missing.');
}

if (CHECK_ONLY) {
  console.log(JSON.stringify({ status: 'REPAIR_REQUIRED', heading: latest.heading, scope: 'docs/NEXT_SESSION_HANDOVER_AR.md' }, null, 2));
  process.exit(0);
}

const blockers = [
  '- Blockers:',
  '  - external blocker: 15 optional role cases in `smoke:role-pages-live` were BLOCKED because the corresponding role credentials were unavailable; no functional failures were reported.',
  '',
].join('\n');

const repairedSection = `${section.slice(0, anchorIndex)}${blockers}${section.slice(anchorIndex)}`;
const repaired = `${content.slice(0, latest.index)}${repairedSection}`;
fs.writeFileSync(HANDOVER_PATH, repaired, 'utf8');

console.log(JSON.stringify({ status: 'APPLIED', heading: latest.heading, changedFile: 'docs/NEXT_SESSION_HANDOVER_AR.md' }, null, 2));
