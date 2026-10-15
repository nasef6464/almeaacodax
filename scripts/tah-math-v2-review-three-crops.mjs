import { createHash } from 'node:crypto';
const samples = [["TAH-MATH-V2-COL26-P005-Q01","7f736394c5da7ead5b0fb3ffd5e6f371a965f31ea9f7b5fa9a2c486984da8816"],["TAH-MATH-V2-COL26-P005-Q02","a2b2ad47cdf99fd0c2d4c3db237d8804d76ec36c5ea8fa9c491f050a517c7a45"],["TAH-MATH-V2-COL26-P005-Q03","e941cc469ba424580101072e8e46119fc0a71b403b35f9c612ec1da23dc30d69"]];
const base = 'https://pub-335cc83968b2426d915cacd8e6dc085d.r2.dev/tah-math-v2/crops';
for (const [code,sha] of samples) {
  const response=await fetch(`${base}/${code}/${sha}.webp`,{signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error(`Missing ${code}: HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==sha) throw new Error(`SHA256 mismatch ${code}`);
  if(bytes.subarray(0,4).toString('ascii')!=='RIFF'||bytes.subarray(8,12).toString('ascii')!=='WEBP') throw new Error(`Not WebP: ${code}`);
  console.log('VISUAL_QA_IMAGE|' + code + '|' + bytes.toString('base64'));
}
