import { createHash } from 'node:crypto';

const base = 'https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev/tah-math-v2/crops';
const samples = [
  ['TAH-MATH-V2-COL26-P005-Q01', '7f736394c5da7ead5b0fb3ffd5e6f371a965f31ea9f7b5fa9a2c486984da8816'],
  ['TAH-MATH-V2-COL26-P005-Q10', 'a7f756eeec0031c06615637572fff8d93a40fb29753b9abbbf7779352f8e5ca8'],
  ['TAH-MATH-V2-COL26-P005-Q14', '77a8c9d97b09c0d8c57ce159fe3f0c4454fc9eccc3802f9a54c317d417ae8fe7'],
  ['TAH-MATH-V2-COL26OLD-P080-Q58', 'e4e43035d5a0ed03e120f4a46d5baba27ddbe4c7c0444cc8c2e917c16eb023ca'],
  ['TAH-MATH-V2-COL26OLD-P080-Q60', 'bb6d2eb43a31a8eeca8bfbbdd4affd54c3eb592bb32bae50aba7bb89473ea030'],
  ['TAH-MATH-V2-COL26OLD-P080-Q63', '45c6e8b42398fb44ff694687164ba6151e2fd9fca5fde171dc0eef4e1d9220bc'],
];
const results = await Promise.all(samples.map(async ([code, expectedHash]) => {
  const url = `${base}/${code}/${expectedHash}.webp`;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'image/webp', 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return { code, ok: false, httpStatus: response.status, error: 'HTTP_ERROR' };
    const bytes = Buffer.from(await response.arrayBuffer());
    const magic = bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    const actualHash = createHash('sha256').update(bytes).digest('hex');
    return {
      code,
      ok: magic && actualHash === expectedHash,
      httpStatus: response.status,
      contentType: response.headers.get('content-type'),
      sizeBytes: bytes.length,
      webpMagic: magic,
      sha256MatchesAtlas: actualHash === expectedHash,
    };
  } catch (error) {
    return { code, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}));
const passed = results.filter(x => x.ok).length;
console.log(JSON.stringify({
  status: passed === results.length ? 'PASS' : 'FAIL',
  intent: 'READ_ONLY_PUBLIC_IMAGE_BYTE_SAMPLE_NO_MUTATION',
  sampleSize: results.length,
  passed,
  failed: results.length - passed,
  results,
}, null, 2));
if (passed !== results.length) process.exit(1);
