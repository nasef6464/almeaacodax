import { pathToFileURL } from "node:url";

const DEFAULT_API_BASE = "https://almeaacodax-k2ux.onrender.com/api";
const AUTH_COOKIE_NAME = "almeaa_access_token";
const CSRF_COOKIE_NAME = "almeaa_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

const normalizeBase = (value) => String(value || DEFAULT_API_BASE).replace(/\/$/, "");
const readCredential = (env, names) => {
  for (const name of names) {
    const value = String(env?.[name] || "").trim();
    if (value) return value;
  }
  return "";
};

const extractCookieValue = (setCookieHeader, cookieName) => {
  const cookieMatch = String(setCookieHeader || "").match(new RegExp(`${cookieName}=([^;]+)`));
  return String(cookieMatch?.[1] || "").trim();
};

const parseJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export async function resolveSmokeAdminToken({
  env = process.env,
  apiBase = env.SMOKE_API_BASE_URL || DEFAULT_API_BASE,
  timeoutMs = 15_000,
  allowPasswordLogin = true,
} = {}) {
  const existingToken = String(env.SMOKE_ADMIN_TOKEN || "").trim();
  if (existingToken) {
    return { token: existingToken, source: "env" };
  }

  if (!allowPasswordLogin) {
    throw new Error("SMOKE_ADMIN_TOKEN is missing and password login is disabled.");
  }

  const adminEmail = readCredential(env, ["SMOKE_ADMIN_EMAIL", "GOLIVE_ADMIN_EMAIL", "ADMIN_EMAIL"]);
  const adminPassword = readCredential(env, ["SMOKE_ADMIN_PASSWORD", "GOLIVE_ADMIN_PASSWORD", "ADMIN_PASSWORD"]);
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Missing admin credentials. Set SMOKE_ADMIN_TOKEN or one of the supported admin email/password pairs.",
    );
  }

  const base = normalizeBase(apiBase);
  const csrfResponse = await fetch(`${base}/auth/csrf-token`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const csrfRawBody = await csrfResponse.text();
  const csrfPayload = parseJson(csrfRawBody);
  const csrfCookie = extractCookieValue(csrfResponse.headers.get("set-cookie") || "", CSRF_COOKIE_NAME);
  const csrfToken = String(csrfPayload?.csrfToken || csrfCookie).trim();

  if (!csrfResponse.ok || !csrfCookie || !csrfToken) {
    throw new Error(
      `Admin auth CSRF bootstrap failed (HTTP ${csrfResponse.status}; cookie=${Boolean(csrfCookie)}; token=${Boolean(csrfToken)}).`,
    );
  }

  const loginResponse = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [CSRF_HEADER_NAME]: csrfToken,
      Cookie: `${CSRF_COOKIE_NAME}=${csrfCookie}`,
    },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const rawBody = await loginResponse.text();
  const payload = parseJson(rawBody);
  if (!loginResponse.ok) {
    throw new Error(`Admin login failed with HTTP ${loginResponse.status}.`);
  }

  const bodyToken = String(payload?.token || "").trim();
  if (bodyToken) {
    return { token: bodyToken, source: "json" };
  }

  const cookieToken = extractCookieValue(loginResponse.headers.get("set-cookie") || "", AUTH_COOKIE_NAME);
  if (cookieToken) {
    return { token: cookieToken, source: "cookie" };
  }

  throw new Error("Admin login succeeded but no access token was returned.");
}

export async function resolvePilotAdminToken({
  env = process.env,
  apiBase = env.PILOT_API_BASE || env.SMOKE_API_BASE_URL || DEFAULT_API_BASE,
  timeoutMs = 15_000,
} = {}) {
  const pilotToken = String(env.PILOT_ADMIN_TOKEN || "").trim();
  if (pilotToken) return { token: pilotToken, source: "pilot-env" };

  const smokeToken = String(env.SMOKE_ADMIN_TOKEN || "").trim();
  if (smokeToken) return { token: smokeToken, source: "smoke-env" };

  return resolveSmokeAdminToken({ env, apiBase, timeoutMs, allowPasswordLogin: true });
}

const isDirectExecution =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  try {
    const resolved = await resolveSmokeAdminToken();
    console.log(
      JSON.stringify(
        {
          ok: true,
          source: resolved.source,
          tokenPresent: Boolean(resolved.token),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
}
