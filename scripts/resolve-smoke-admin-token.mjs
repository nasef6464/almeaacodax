const API_BASE = String(process.env.SMOKE_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const ADMIN_EMAIL = String(process.env.SMOKE_ADMIN_EMAIL || process.env.GOLIVE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim();
const ADMIN_PASSWORD = String(process.env.SMOKE_ADMIN_PASSWORD || process.env.GOLIVE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "").trim();
const AUTH_COOKIE_NAME = "almeaa_access_token";

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "Missing admin credentials. Set one of: SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD, GOLIVE_ADMIN_EMAIL/GOLIVE_ADMIN_PASSWORD, or ADMIN_EMAIL/ADMIN_PASSWORD.",
  );
  process.exit(1);
}

const response = await fetch(`${API_BASE}/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  }),
});

const rawBody = await response.text();
let payload = null;
try {
  payload = JSON.parse(rawBody);
} catch {
  payload = null;
}

if (!response.ok) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        step: "login",
        status: response.status,
        body: payload || rawBody,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const bodyToken = String(payload?.token || "").trim();
if (bodyToken) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        source: "json",
        token: bodyToken,
        exportCommand: `setx SMOKE_ADMIN_TOKEN "${bodyToken}"`,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const setCookieHeader = response.headers.get("set-cookie") || "";
const cookieMatch = setCookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
const cookieToken = String(cookieMatch?.[1] || "").trim();

if (cookieToken) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        source: "cookie",
        token: cookieToken,
        exportCommand: `setx SMOKE_ADMIN_TOKEN "${cookieToken}"`,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.error(
  JSON.stringify(
    {
      ok: false,
      step: "extract_token",
      message: "Login succeeded but no token was found in JSON response or Set-Cookie header.",
      hints: [
        "Check whether the production proxy strips Set-Cookie from this client context.",
        "As a fallback, log in from the browser and copy the almeaa_access_token cookie from DevTools > Application > Cookies.",
      ],
    },
    null,
    2,
  ),
);
process.exit(1);
