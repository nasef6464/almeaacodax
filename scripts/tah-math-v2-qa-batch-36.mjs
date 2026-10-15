import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(readFileSync('ops/tah-math-v2-qa-batch-36-20261015.json','utf8'));
const start = Number(process.env.BATCH_START ?? '0');
if (!Number.isSafeInteger(start) || start < 0 || start % 12 !== 0) throw Error('bad BATCH_START');
const rows = manifest.rows.slice(start, start+12);
if (rows.length !== 12) throw Error('expected exactly 12 questions');
for (const row of rows) {
  const url = `https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev/tah-math-v2/crops/${row.code}/${row.hash}.webp`;
  const res = await fetch(url,{signal:AbortSignal.timeout(25000)});
  if (!res.ok) throw Error(`${row.code}: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== row.hash || bytes.subarray(0,4).toString('ascii') !== 'RIFF' || bytes.subarray(8,12).toString('ascii') !== 'WEBP') throw Error(`${row.code}: image integrity`);
  console.log('TAH_MATH_IMAGE_QA|'+JSON.stringify({ code:row.code, questionId:row.id, sourceItemId:row.sourceItemId, existingKey:row.answer, claimedSubskill:row.subSkillId, webpBase64:bytes.toString('base64') }));
}
console.log(JSON.stringify({status:'R2_PIXELS_DOWNLOADED',start,downloaded:rows.length,note:'DOWNLOAD_ONLY_NO_SCIENTIFIC_APPROVAL'}));
