const API_BASE_URL = String(process.env.SMOKE_API_BASE_URL || process.env.SMOKE_API_URL || "https://almeaacodax.vercel.app/api").replace(/\/$/, "");
const expectedCallback = "https://almeaacodax-codex.onrender.com/api/auth/google/callback";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchWithRetry(url, options = {}, attempts = 6) {
  let lastResponse = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: { "user-agent": "almeaa-google-oauth-smoke/1.0", ...(options.headers || {}) },
    });
    lastResponse = response;
    if (response.status !== 429 && response.status < 500) return response;
    if (attempt < attempts) {
      const retryAfter = Number(response.headers.get("retry-after") || "");
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 30000) : attempt * 1500);
    }
  }
  return lastResponse;
}

const start = await fetchWithRetry(`${API_BASE_URL}/auth/google/start?returnTo=${encodeURIComponent("/#/dashboard")}`, { redirect: "manual" });
const location = String(start.headers.get("location") || "");
if (![302, 303].includes(start.status) || !location) {
  console.error(JSON.stringify({ ok:false, step:"start", status:start.status }, null, 2));
  process.exit(1);
}
let authUrl;
try { authUrl = new URL(location); } catch {
  console.error(JSON.stringify({ ok:false, step:"start_location" }, null, 2)); process.exit(1);
}
const redirectUri = String(authUrl.searchParams.get("redirect_uri") || "");
const hasClientId = Boolean(String(authUrl.searchParams.get("client_id") || "").trim());
const hasState = Boolean(String(authUrl.searchParams.get("state") || "").trim());
if (authUrl.hostname !== "accounts.google.com" || redirectUri !== expectedCallback || !hasClientId || !hasState) {
  console.error(JSON.stringify({ ok:false, step:"start_contract", host:authUrl.hostname, redirectUri, hasClientId, hasState }, null, 2));
  process.exit(1);
}

const callback = await fetchWithRetry(`${API_BASE_URL}/auth/google/callback`, { redirect: "manual" });
const callbackLocation = String(callback.headers.get("location") || "");
if (![302, 303].includes(callback.status) || !callbackLocation.includes("/#/login?oauth_error=google")) {
  console.error(JSON.stringify({ ok:false, step:"callback_route", status:callback.status, hasSafeFallback:callbackLocation.includes("oauth_error=google") }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  startStatus: start.status,
  providerHost: authUrl.hostname,
  callbackUri: redirectUri,
  callbackRouteStatus: callback.status,
  callbackSafeFallback: true,
}, null, 2));
