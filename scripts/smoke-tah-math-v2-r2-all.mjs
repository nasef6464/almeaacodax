import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = readFileSync(path.join(root, 'ops/tah-math-v2-r2-2270-image-index-20261014.tsv'), 'utf8');
const entries = manifest.trim().split(/\r?\n/).map(line => line.split('\t'));
const base = 'https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev/tah-math-v2/crops';
if (entries.length !== 2270 || new Set(entries.map(row => row[0])).size !== 2270 ||
    entries.some(row => row.length !== 2 || !/^[A-Z0-9_-]+$/.test(row[0]) || !/^[a-f0-9]{64}$/.test(row[1]))) {
  throw new Error('Invalid 2270-image manifest; abort before external requests.');
}
let next = 0, passed = 0, bytesTotal = 0;
const problems = [];
const errorsByKind = {};
const concurrency = 8;
const fetchOne = async ([code, expected]) => {
  const url = `${base}/${code}/${expected}.webp`;
  let last = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(20000),
        headers: { Accept: 'image/webp' },
      });
      if (!response.ok) {
        last = { code, error: 'HTTP_' + response.status };
        if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
      } else {
        const buffer = Buffer.from(await response.arrayBuffer());
        const isWebp = buffer.length >= 12 &&
          buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
          buffer.subarray(8, 12).toString('ascii') === 'WEBP';
        const actual = createHash('sha256').update(buffer).digest('hex');
        if (!isWebp || actual !== expected) {
          last = { code, error: !isWebp ? 'INVALID_WEBP_BYTES' : 'SHA256_MISMATCH' };
          break;
        }
        passed++;
        bytesTotal += buffer.length;
        return;
      }
    } catch (error) {
      last = { code, error: error instanceof Error ? error.name : String(error) };
    }
  }
  errorsByKind[last?.error || 'UNKNOWN'] = (errorsByKind[last?.error || 'UNKNOWN'] || 0) + 1;
  problems.push(last || { code, error: 'UNKNOWN' });
};
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (true) {
    const index = next++;
    if (index >= entries.length) return;
    await fetchOne(entries[index]);
  }
}));
console.log(JSON.stringify({
  intent: 'READ_ONLY_FULL_R2_IMAGE_AVAILABILITY_AND_SHA256_PROOF',
  total: entries.length,
  verified: passed,
  failed: problems.length,
  bytesRead: bytesTotal,
  errorsByKind,
  failedSample: problems.slice(0, 30),
  status: passed === entries.length ? 'PASS' : 'FAIL',
}, null, 2));
if (passed !== entries.length) process.exit(1);
