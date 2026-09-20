const API_BASE = String(process.env.RELEASE_API_BASE || 'https://almeaacodax.vercel.app/api').replace(/\/$/, '');
const EXPECTED_RELEASE_SHA = String(process.env.EXPECTED_RELEASE_SHA || '').trim();
const MAX_ATTEMPTS = Number(process.env.RELEASE_IDENTITY_MAX_ATTEMPTS || 40);
const INTERVAL_MS = Number(process.env.RELEASE_IDENTITY_INTERVAL_MS || 15000);
const REQUIRE_SCALE_READY = ['1', 'true', 'yes', 'on'].includes(String(process.env.REQUIRE_SCALE_READY || '').trim().toLowerCase());

if (!EXPECTED_RELEASE_SHA) {
  console.error('EXPECTED_RELEASE_SHA is required for release identity verification.');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJson(path) {
  const response = await fetch(API_BASE + path, {
    method: 'GET',
    headers: { accept: 'application/json', 'cache-control': 'no-cache', pragma: 'no-cache' },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function commitMatches(actual) {
  const normalizedActual = String(actual || '').trim().toLowerCase();
  const normalizedExpected = EXPECTED_RELEASE_SHA.toLowerCase();
  if (!normalizedActual) return false;
  return normalizedExpected.startsWith(normalizedActual) || normalizedActual.startsWith(normalizedExpected);
}

let liveEvidence = null;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  try {
    const { response, body } = await readJson('/health/live');
    liveEvidence = {
      attempt,
      status: response.status,
      commit: body?.commit || null,
      environment: body?.environment || null,
      version: body?.version || null,
    };
    if (response.ok && commitMatches(body?.commit)) break;
  } catch (error) {
    liveEvidence = { attempt, status: 0, commit: null, error: String(error?.message || error) };
  }
  if (attempt < MAX_ATTEMPTS) await sleep(INTERVAL_MS);
}

if (!liveEvidence || !commitMatches(liveEvidence.commit)) {
  console.error(JSON.stringify({
    status: 'release_identity_mismatch',
    expected: EXPECTED_RELEASE_SHA,
    apiBase: API_BASE,
    live: liveEvidence,
  }, null, 2));
  process.exit(1);
}

const ready = await readJson('/health/ready');
if (!ready.response.ok || ready.body?.ready !== true) {
  console.error(JSON.stringify({
    status: 'release_not_ready',
    expected: EXPECTED_RELEASE_SHA,
    apiBase: API_BASE,
    readiness: ready.body,
    httpStatus: ready.response.status,
  }, null, 2));
  process.exit(1);
}

let scale = null;
if (REQUIRE_SCALE_READY) {
  scale = await readJson('/health/scale-ready');
  if (!scale.response.ok || scale.body?.scaleReady !== true) {
    console.error(JSON.stringify({
      status: 'release_not_scale_ready',
      expected: EXPECTED_RELEASE_SHA,
      apiBase: API_BASE,
      scaleReadiness: scale.body,
      httpStatus: scale.response.status,
    }, null, 2));
    process.exit(1);
  }
}

console.log(JSON.stringify({
  status: 'release_verified',
  expected: EXPECTED_RELEASE_SHA,
  apiBase: API_BASE,
  live: liveEvidence,
  readiness: {
    status: ready.response.status,
    ready: ready.body?.ready === true,
    scaleReady: ready.body?.scaleReady === true,
    database: ready.body?.database?.status || null,
    redisConfiguredForScale: ready.body?.summary?.redisConfiguredForScale === true,
  },
  scaleReadinessRequired: REQUIRE_SCALE_READY,
  scaleReadinessStatus: scale?.response?.status ?? null,
}, null, 2));
