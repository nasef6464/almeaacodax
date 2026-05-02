const FRONTEND_URL = (process.env.SMOKE_FRONTEND_URL || 'https://almeaacodax.vercel.app').replace(/\/$/, '');
const API_URL = (process.env.SMOKE_API_URL || 'https://almeaacodax-k2ux.onrender.com/api').replace(/\/$/, '');

const routes = [
  '/',
  '/#/category/p_qudrat',
  '/#/category/p_qudrat?level=lvl_qudrat_general',
  '/#/category/p_tahsili',
  '/#/quizzes',
  '/#/reports',
  '/#/login',
];

const checks = [];

async function check(name, fn) {
  try {
    const details = await fn();
    checks.push({ name, passed: true, details });
  } catch (error) {
    checks.push({ name, passed: false, details: error instanceof Error ? error.message : String(error) });
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return {
    text: await response.text(),
    headers: response.headers,
  };
}

await check('api health is live', async () => {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const health = await response.json();
  if (health.status !== 'ok' && health.database !== 'connected') {
    throw new Error(`unexpected health payload: ${JSON.stringify(health)}`);
  }
  return `status=${health.status || 'unknown'}, database=${health.database || 'unknown'}`;
});

let shellHtml = '';
await check('frontend shell loads', async () => {
  const result = await fetchText(`${FRONTEND_URL}/?smoke=${Date.now()}`);
  shellHtml = result.text;
  if (!shellHtml.includes('<div id="root"')) throw new Error('root element missing');
  if (!shellHtml.includes('/assets/')) throw new Error('asset links missing');
  return `cache=${result.headers.get('x-vercel-cache') || 'unknown'}, bytes=${shellHtml.length}`;
});

await check('entry asset loads', async () => {
  const match = shellHtml.match(/src="([^"]*\/assets\/index-[^"]+\.js)"/);
  if (!match) throw new Error('entry asset not found');
  const assetUrl = new URL(match[1], FRONTEND_URL).toString();
  const response = await fetch(assetUrl, { headers: { 'cache-control': 'no-cache' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const text = await response.text();
  if (text.length < 1000) throw new Error(`asset too small: ${text.length}`);
  return `${assetUrl} (${Math.round(text.length / 1024)} KB)`;
});

for (const route of routes) {
  await check(`route shell: ${route}`, async () => {
    const result = await fetchText(`${FRONTEND_URL}${route}${route.includes('?') ? '&' : '?'}smoke=${Date.now()}`);
    if (!result.text.includes('<div id="root"')) throw new Error('root element missing');
    return `bytes=${result.text.length}`;
  });
}

const failed = checks.filter((item) => !item.passed);
for (const item of checks) {
  const mark = item.passed ? 'PASS' : 'FAIL';
  console.log(`${mark} ${item.name} - ${item.details}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} frontend smoke check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} frontend smoke checks passed.`);
