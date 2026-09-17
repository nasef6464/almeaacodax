const API_BASE = String(process.env.SMOKE_API_BASE_URL || "https://almeaacodax.vercel.app/api").replace(/\/$/, "");
const ADMIN_EMAIL = String(process.env.SMOKE_ADMIN_EMAIL || process.env.GOLIVE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim();
const ADMIN_PASSWORD = String(process.env.SMOKE_ADMIN_PASSWORD || process.env.GOLIVE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "").trim();
const ADMIN_TOKEN = String(process.env.SMOKE_ADMIN_TOKEN || process.env.GOLIVE_ADMIN_TOKEN || "").trim();

const AUTH_COOKIE_NAME = "almeaa_access_token";
const CSRF_COOKIE_NAME = "almeaa_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const extractCookieValue = (rawHeader, cookieName) => {
  const match = String(rawHeader || "").match(new RegExp(`${cookieName}=([^;]+)`));
  return String(match?.[1] || "").trim();
};

async function fetchWithColdStartRetry(url, init = {}, attempts = 6) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.status < 500 || attempt === attempts) return response;
      lastError = new Error(`${init.method || "GET"} ${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(Math.min(1500 * attempt, 6000));
  }
  throw lastError instanceof Error ? lastError : new Error(`Unable to reach ${url}`);
}

async function readJson(response, label) {
  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`${label} returned invalid JSON (${raw.length} bytes)`);
  }
  return payload;
}

async function assertMe(token, cookieHeader = "") {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookieHeader) headers.Cookie = cookieHeader;

  const response = await fetchWithColdStartRetry(`${API_BASE}/auth/me`, { method: "GET", headers }, 3);
  const payload = await readJson(response, "GET /auth/me");
  if (!response.ok) {
    throw new Error(`GET /auth/me failed (${response.status})`);
  }
  if (String(payload?.user?.role || "") !== "admin") {
    throw new Error(`GET /auth/me returned unexpected role: ${payload?.user?.role || "missing"}`);
  }
  return payload.user;
}

// Wake the production backend and prove the browser-facing Vercel proxy is healthy.
const healthResponse = await fetchWithColdStartRetry(`${API_BASE}/health`, {
  method: "GET",
  headers: { Accept: "application/json" },
});
const health = await readJson(healthResponse, "GET /health");
if (!healthResponse.ok || health?.status !== "ok" || health?.database !== "connected") {
  throw new Error(`Production health check failed (${healthResponse.status})`);
}

if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const csrfResponse = await fetchWithColdStartRetry(`${API_BASE}/auth/csrf-token`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const csrf = await readJson(csrfResponse, "GET /auth/csrf-token");
  const csrfCookie = extractCookieValue(csrfResponse.headers.get("set-cookie"), CSRF_COOKIE_NAME);
  const csrfToken = String(csrf?.csrfToken || csrfCookie).trim();

  if (!csrfResponse.ok || !csrfCookie || !csrfToken) {
    throw new Error(`CSRF bootstrap failed (${csrfResponse.status})`);
  }

  // Deliberately single-shot: never retry a credential POST after a response might
  // have reached production. The preceding health request handles Render cold starts.
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      [CSRF_HEADER_NAME]: csrfToken,
      Cookie: `${CSRF_COOKIE_NAME}=${csrfCookie}`,
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const login = await readJson(loginResponse, "POST /auth/login");
  if (!loginResponse.ok) {
    throw new Error(`POST /auth/login failed (${loginResponse.status})`);
  }

  const authCookie = extractCookieValue(loginResponse.headers.get("set-cookie"), AUTH_COOKIE_NAME);
  const bodyToken = String(login?.token || "").trim();
  if (!authCookie) {
    throw new Error("Login succeeded but the production proxy did not preserve the auth cookie.");
  }

  const user = await assertMe("", `${AUTH_COOKIE_NAME}=${authCookie}`);
  console.log(
    JSON.stringify({
      ok: true,
      mode: "production-read-only-auth",
      transport: "vercel-proxy",
      database: health.database,
      login: "ok",
      cookieSession: "ok",
      bearerTokenAlsoReturned: Boolean(bodyToken),
      role: user.role,
    }),
  );
  process.exit(0);
}

if (ADMIN_TOKEN) {
  const user = await assertMe(ADMIN_TOKEN);
  console.log(
    JSON.stringify({
      ok: true,
      mode: "production-read-only-auth",
      transport: "vercel-proxy",
      database: health.database,
      bearerSession: "ok",
      role: user.role,
    }),
  );
  process.exit(0);
}

throw new Error("Production auth smoke needs SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD or SMOKE_ADMIN_TOKEN.");
