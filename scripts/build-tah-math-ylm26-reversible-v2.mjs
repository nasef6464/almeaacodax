#!/usr/bin/env node
// TAH-MATH/YLM26 offline, fail-closed manifest builder. Never writes to MongoDB or R2.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const dir = path.join(root, 'ops/tah-math');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const baseline = read('TAH_MATH_YLM26_TOPICID_REVERSIBLE_MANIFEST_V1.json');
const reviewed = read('TAH_MATH_YLM26_MAPPING_CORRECTIONS_MANIFEST_V1.json');
const run79 = read('TAH_MATH_RUN79_150_FINAL_REVIEWED_CONTENT_CHECKPOINT.json');
const fail = (message) => { throw new Error('FAIL_CLOSED: ' + message); };

if (baseline.mutation?.rows?.length !== 326) fail('Expected 326 baseline rows');
const corrections = new Map();
for (const row of reviewed.rows) {
  if (row.decision !== 'REMAP' || corrections.has(row.questionCode)) fail('Duplicate or unreviewed correction');
  corrections.set(row.questionCode, { before: row.old, after: row.new, evidence: 'mapping V1' });
}
for (const [shortCode, pair] of Object.entries(run79.sourceBackedMappingCorrections)) {
  const code = 'TAH-MATH-YLM26-' + shortCode;
  const [skillId, subSkillId] = pair.split('/');
  if (corrections.has(code) || !skillId || !subSkillId) fail('Invalid RUN79 correction: ' + code);
  corrections.set(code, { after: { skillId, subSkillId }, evidence: 'RUN79 source-backed review' });
}
if (corrections.size !== 7) fail('Expected exactly seven reviewed remaps');

const codes = new Set(), sources = new Set(), hashes = new Set(), applied = new Set();
const rows = baseline.mutation.rows.map((r) => {
  if (!r.questionCode || !r.sourceItemId || !/^[0-9a-f]{64}$/.test(r.imageHash)) fail('Invalid source identity');
  if (codes.has(r.questionCode) || sources.has(r.sourceItemId) || hashes.has(r.imageHash)) fail('Duplicate source identity');
  codes.add(r.questionCode); sources.add(r.sourceItemId); hashes.add(r.imageHash);
  if (r.before?.topicId !== null || !r.skillId || !r.subSkillId) fail('Invalid before state: ' + r.questionCode);
  const correction = corrections.get(r.questionCode);
  if (correction?.before && (correction.before.skillId !== r.skillId || correction.before.subSkillId !== r.subSkillId))
    fail('Correction preimage mismatch: ' + r.questionCode);
  const afterSkill = correction?.after.skillId ?? r.skillId;
  const afterSub = correction?.after.subSkillId ?? r.subSkillId;
  if (!afterSub.startsWith('sub_tah_math_') || afterSkill !== 'skill_tah_math_' + afterSub.slice(13,15))
    fail('Parent/subskill mismatch: ' + r.questionCode);
  const topicId = 'top_tah_math_sub_' + afterSub.slice('sub_tah_math_'.length);
  if (correction) applied.add(r.questionCode);
  return {
    questionCode: r.questionCode,
    sourceItemId: r.sourceItemId,
    imageHash: r.imageHash,
    expectedBefore: { skillId: r.skillId, subSkillId: r.subSkillId, topicId: null },
    proposedAfter: { skillId: afterSkill, subSkillId: afterSub, topicId },
    rollback: { skillId: r.skillId, subSkillId: r.subSkillId, topicId: null },
    correctionEvidence: correction?.evidence ?? null
  };
}).sort((a, b) => a.questionCode.localeCompare(b.questionCode));

if (rows.length !== 326 || applied.size !== 7) fail('Row or correction coverage mismatch');
const manifest = {
  project: 'TAH-MATH', bank: 'YLM26', version: 2,
  status: 'OFFLINE_STAGED_NOT_APPLY_READY', productionMutation: false,
  sourceInputs: [
    'TAH_MATH_YLM26_TOPICID_REVERSIBLE_MANIFEST_V1.json',
    'TAH_MATH_YLM26_MAPPING_CORRECTIONS_MANIFEST_V1.json',
    'TAH_MATH_RUN79_150_FINAL_REVIEWED_CONTENT_CHECKPOINT.json'
  ],
  gates: {
    liveTopicIdAndTaxonomyParity: 'REQUIRES_FRESH_READ_ONLY_CHECK',
    fullPedagogyPerRow: 'REQUIRED_BEFORE_APPROVAL',
    liveR2HttpParity: 'REQUIRED_BEFORE_APPROVAL',
    guardedDryRun: 'REQUIRED_BEFORE_APPROVAL',
    preimageBackupAndRollback: 'REQUIRED_BEFORE_APPROVAL'
  },
  summary: { rows: rows.length, remaps: applied.size, newMastered: 0 },
  rows
};
const body = JSON.stringify(manifest, null, 2) + '\n';
const digest = crypto.createHash('sha256').update(body).digest('hex');
const output = process.argv[2];
if (output) fs.writeFileSync(output, body, { flag: 'wx' });
else process.stdout.write(body);
process.stderr.write('YLM26 staged V2 rows=' + rows.length + ' remaps=' + applied.size + ' sha256=' + digest + '\n');
