#!/usr/bin/env node
// Read-only YLM26 option-specific pedagogy coverage audit. No production writes.
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('ops/tah-math');
const read = (n) => JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
const base = read('TAH_MATH_YLM26_ENRICHED_REVIEW_V2.json');
const evidence = [
  'TAH_MATH_RUN19_6_VISUAL_EXCEPTION_FULL_PEDAGOGY.json',
  'TAH_MATH_RUN28_20_SOURCE_GROUNDED_PEDAGOGY.json',
  'TAH_MATH_RUN49_10_OPTION_PEDAGOGY_PART1.json',
  'TAH_MATH_RUN49_5_OPTION_PEDAGOGY_PART2A.json',
  'TAH_MATH_RUN49_5_OPTION_PEDAGOGY_PART2B.json',
  'TAH_MATH_RUN49_5_OPTION_PEDAGOGY_PART4A.json',
  'TAH_MATH_RUN49_5_OPTION_PEDAGOGY_PART4B.json',
  'TAH_MATH_RUN61_28_SOURCE_GROUNDED_PEDAGOGY.json',
  'TAH_MATH_RUN78_PEDAGOGY_OVERLAY_PART01.json',
  'TAH_MATH_RUN78_PEDAGOGY_OVERLAY_PART04.json',
  'TAH_MATH_RUN78_PEDAGOGY_OVERLAY_PART05.json',
  'TAH_MATH_RUN78_PEDAGOGY_OVERLAY_PART06.json'
];
const noGeneric = (s) => !/BLOCKED|PENDING|لا يطابق نتيجة المسألة|does not match the result/i.test(String(s));
const candidates = new Map();
for (const file of evidence) {
  const data = read(file);
  for (const r of data.rows ?? data.records ?? []) {
    const code = r.questionCode ?? (r.code && 'TAH-MATH-YLM26-' + r.code);
    if (!code) continue;
    const options = r.optionsSourceReviewed ?? r.options;
    const wrong = r.whyOthersWrong;
    const sourceItemId = r.sourceItemId ?? r.source?.sourceItemId;
    const imageHash = r.imageHash ?? r.source?.imageHash ?? r.sourceImageHash;
    const optionSpecific = !!options && ['A','B','C','D'].every(k => typeof options[k] === 'string' && options[k].length > 1)
      && !!wrong && Object.keys(wrong).length >= 3 && Object.values(wrong).every(noGeneric);
    if (!candidates.has(code)) candidates.set(code, []);
    candidates.get(code).push({ file, optionSpecific, hasIdentity: !!sourceItemId && !!imageHash, answer: r.answerLetter ?? r.answerLetterMathVerified ?? r.answer ?? null });
  }
}
if (base.rows?.length !== 326) throw Error('FAIL_CLOSED: expected 326 Enriched V2 rows');
const rows = [], seen = new Set();
for (const r of base.rows) {
  if (!r.questionCode || seen.has(r.questionCode)) throw Error('FAIL_CLOSED: duplicate or missing questionCode');
  seen.add(r.questionCode);
  const sources = candidates.get(r.questionCode) ?? [];
  const specific = sources.filter(x => x.optionSpecific && x.hasIdentity);
  const answers = [...new Set(sources.map(x => x.answer).filter(Boolean))];
  rows.push({
    questionCode: r.questionCode,
    enrichedOptionReasonsComplete: r.gates?.whyOthersWrong === true,
    candidateOptionSpecificEvidence: specific.map(x => x.file),
    candidateAnswerConflict: answers.length > 1,
    requiresDirectR2AndTopicParity: true,
    finalApproval: false
  });
}
const result = {
  project:'TAH-MATH',bank:'YLM26',status:'READ_ONLY_AUDIT_NOT_APPROVAL',
  summary:{
    total:rows.length,
    enrichedOptionReasonsComplete:rows.filter(x=>x.enrichedOptionReasonsComplete).length,
    sourceSpecificCandidateCodes:rows.filter(x=>x.candidateOptionSpecificEvidence.length).length,
    sourceAnswerConflicts:rows.filter(x=>x.candidateAnswerConflict).length,
    newlyMastered:0
  },rows
};
const out = JSON.stringify(result,null,2)+'\n';
if (process.argv[2]) fs.writeFileSync(process.argv[2],out,{flag:'wx'});
else process.stdout.write(out);
