const API_BASE_URL = String(
  process.env.PRODUCTION_API_BASE_URL || "https://almeaacodax-codex.onrender.com/api",
).replace(/\/$/, "");

const roles = [
  ["student", process.env.ROLE_STUDENT_EMAIL, process.env.ROLE_STUDENT_PASSWORD],
  ["admin", process.env.ROLE_ADMIN_EMAIL, process.env.ROLE_ADMIN_PASSWORD],
  ["parent", process.env.ROLE_PARENT_EMAIL, process.env.ROLE_PARENT_PASSWORD],
  ["teacher", process.env.ROLE_TEACHER_EMAIL, process.env.ROLE_TEACHER_PASSWORD],
  ["supervisor", process.env.ROLE_SUPERVISOR_EMAIL, process.env.ROLE_SUPERVISOR_PASSWORD],
];

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

const health = await fetchJson(`${API_BASE_URL}/health/live`);
if (!health.response.ok) {
  throw new Error(`health/live returned ${health.response.status}`);
}

const results = [];
for (const [expectedRole, email, password] of roles) {
  if (!email || !password) {
    results.push({ role: expectedRole, status: "SKIP", reason: "credentials missing" });
    continue;
  }

  const csrf = await fetchJson(`${API_BASE_URL}/auth/csrf-token`, {
    headers: { accept: "application/json" },
  });
  if (!csrf.response.ok) {
    throw new Error(`${expectedRole}: csrf returned ${csrf.response.status}`);
  }
  const cookie = String(csrf.response.headers.get("set-cookie") || "").match(
    /almeaa_csrf_token=([^;]+)/,
  )?.[1] || "";
  const token = String(csrf.body?.csrfToken || cookie);
  const login = await fetchJson(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": token,
      ...(cookie ? { cookie: `almeaa_csrf_token=${cookie}` } : {}),
    },
    body: JSON.stringify({ email, password }),
  });
  if (!login.response.ok) {
    throw new Error(`${expectedRole}: login returned ${login.response.status}`);
  }
  if (String(login.body?.user?.role || "") !== expectedRole) {
    throw new Error(
      `${expectedRole}: role mismatch, got ${String(login.body?.user?.role || "missing")}`,
    );
  }
  results.push({ role: expectedRole, status: "PASS" });

  // Deliberately serialize and pace production auth probes to protect the small runtime.
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

console.log(JSON.stringify({ health: "PASS", results }, null, 2));
