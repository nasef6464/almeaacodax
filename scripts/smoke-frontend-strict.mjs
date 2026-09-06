import { execSync } from 'node:child_process';

const frontendUrl = (process.env.SMOKE_FRONTEND_URL || 'https://almeaacodax.vercel.app').replace(/\/$/, '');
const expectedVersion = process.env.SMOKE_EXPECT_VERSION || execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
const maxAttempts = 12;
const waitMs = 5000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function productionServesExpectedVersion() {
  const shellResponse = await fetch(`${frontendUrl}/?smoke-version=${Date.now()}`, {
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
  });
  if (!shellResponse.ok) return false;

  const shellHtml = await shellResponse.text();
  const match = shellHtml.match(/src="([^"]*\/assets\/index-[^"]+\.js)"/);
  if (!match) return false;

  const assetUrl = new URL(match[1], frontendUrl).toString();
  const assetResponse = await fetch(assetUrl, {
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
  });
  if (!assetResponse.ok) return false;

  return (await assetResponse.text()).includes(expectedVersion);
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    if (await productionServesExpectedVersion()) {
      console.log(`Production is serving expected version ${expectedVersion} (attempt ${attempt}/${maxAttempts}).`);
      break;
    }
  } catch (error) {
    console.warn(`Production version probe ${attempt}/${maxAttempts} failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (attempt === maxAttempts) {
    throw new Error(`Production did not serve expected version ${expectedVersion} after ${maxAttempts} attempts.`);
  }

  await sleep(waitMs);
}

process.env.SMOKE_STRICT_VERSION = '1';
await import('./smoke-frontend-routes.mjs');
