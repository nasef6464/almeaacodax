import fs from "node:fs";
import path from "node:path";

const BASE_URL = (process.env.UI_AUDIT_API_BASE_URL || process.env.API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID =
  process.env.AI_RUNTIME_AUDIT_RUN_ID ||
  process.env.LIVE_AI_AUDIT_RUN_ID ||
  `ai-runtime-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "admin-live-handoff", RUN_ID);
const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");

fs.mkdirSync(OUT_DIR, { recursive: true });

if (fs.existsSync(CREDENTIALS_FILE)) {
  for (const line of fs.readFileSync(CREDENTIALS_FILE, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length && !process.env[key]) process.env[key] = rest.join("=").trim();
  }
}

const redact = (value) =>
  String(value || "")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-google-key]")
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, "[redacted-api-key]")
    .replace(/[A-Za-z0-9_-]{44,}/g, "[redacted-token]")
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 900);

const cookieHeader = (headers) => {
  const raw = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
  return raw.map((cookie) => String(cookie).split(";")[0]).filter(Boolean).join("; ");
};

async function request(pathname, options = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.cookie ? { cookie: options.cookie } : {}),
      ...(options.csrf ? { "x-csrf-token": options.csrf } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: redact(text) };
  }
  return { ok: response.ok, status: response.status, body, cookie: cookieHeader(response.headers) };
}

async function login(email, password) {
  if (!email || !password) return null;
  const csrf = await request("/auth/csrf-token", { headers: { "cache-control": "no-store" } });
  const csrfToken = csrf.body?.csrfToken || "";
  const loginResponse = await request("/auth/login", {
    method: "POST",
    csrf: csrfToken,
    cookie: csrf.cookie,
    body: JSON.stringify({ email, password }),
  });
  return {
    ok: loginResponse.ok,
    status: loginResponse.status,
    cookie: [csrf.cookie, loginResponse.cookie].filter(Boolean).join("; "),
    csrfToken,
    user: loginResponse.body?.user ? { role: loginResponse.body.user.role, email: loginResponse.body.user.email } : null,
  };
}

const adminLogin = await login(
  process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL,
  process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD,
);
const studentLogin = await login(
  process.env.ROLE_STUDENT_EMAIL || process.env.SMOKE_STUDENT_EMAIL || process.env.STUDENT_EMAIL,
  process.env.ROLE_STUDENT_PASSWORD || process.env.SMOKE_STUDENT_PASSWORD || process.env.STUDENT_PASSWORD,
);

const status = await request("/ai/status");
const activeProvider = status.body?.provider || "none";
const configuredProviders = Array.isArray(status.body?.providers)
  ? status.body.providers.filter((provider) => provider.id !== "none" && provider.configured)
  : [];

const readiness = adminLogin?.ok
  ? await request("/ai/readiness", { cookie: adminLogin.cookie })
  : { ok: false, status: 0, body: { skipped: "missing-admin-login" } };

const interactionsBefore = adminLogin?.ok
  ? await request("/ai/interactions?limit=6", { cookie: adminLogin.cookie })
  : { ok: false, status: 0, body: { skipped: "missing-admin-login" } };

const providersToTest = [...new Set([activeProvider, ...configuredProviders.filter((provider) => provider.source === "admin").map((provider) => provider.id)])]
  .filter((provider) => provider && provider !== "none")
  .slice(0, 2);
const providerTests = [];
if (adminLogin?.ok) {
  for (const provider of providersToTest) {
    providerTests.push({
      provider,
      result: await request("/ai/providers/test", {
        method: "POST",
        cookie: adminLogin.cookie,
        csrf: adminLogin.csrfToken,
        body: JSON.stringify({ provider }),
      }),
    });
  }
}

const studentChat = await request("/ai/chat", {
  method: "POST",
  cookie: studentLogin?.ok ? studentLogin.cookie : "",
  csrf: studentLogin?.csrfToken || "",
  body: JSON.stringify({
    message: "اختبار تسليم قصير: قل لي هل المساعد يعمل الآن بجملة عربية واحدة، ولا تذكر أي مفاتيح.",
  }),
});

const interactionsAfter = adminLogin?.ok
  ? await request("/ai/interactions?limit=8", { cookie: adminLogin.cookie })
  : { ok: false, status: 0, body: { skipped: "missing-admin-login" } };

const readinessAfter = adminLogin?.ok
  ? await request("/ai/readiness", { cookie: adminLogin.cookie })
  : { ok: false, status: 0, body: { skipped: "missing-admin-login" } };

const report = {
  generatedAt: new Date().toISOString(),
  apiBaseUrl: BASE_URL,
  adminLogin: adminLogin ? { ok: adminLogin.ok, status: adminLogin.status, user: adminLogin.user } : { ok: false, skipped: "missing-admin-credentials" },
  studentLogin: studentLogin ? { ok: studentLogin.ok, status: studentLogin.status, user: studentLogin.user } : { ok: false, skipped: "missing-student-credentials" },
  status: {
    ok: status.ok,
    status: status.status,
    provider: status.body?.provider,
    routingMode: status.body?.routingMode,
    providerOrderSource: status.body?.providerOrderSource,
    providerOrder: status.body?.providerOrder,
    model: status.body?.model,
    configuredProviders: configuredProviders.map((provider) => ({
      id: provider.id,
      model: provider.model,
      source: provider.source,
    })),
  },
  readiness: {
    ok: readiness.ok,
    status: readiness.status,
    score: readiness.body?.score,
    activeProvider: readiness.body?.activeProvider,
    studentAdvisor: readiness.body?.studentAdvisor,
    monitoring: readiness.body?.monitoring,
    nextActions: readiness.body?.nextActions || [],
  },
  providerTests: providerTests.map((item) => ({
    provider: item.provider,
    ok: item.result.ok,
    status: item.result.status,
    providerOk: item.result.body?.ok,
    model: item.result.body?.model,
    latencyMs: item.result.body?.latencyMs,
    message: redact(item.result.body?.message),
    samplePreview: redact(item.result.body?.sample),
  })),
  studentChat: {
    ok: studentChat.ok,
    status: studentChat.status,
    provider: studentChat.body?.provider,
    model: studentChat.body?.model,
    usedFallback: studentChat.body?.usedFallback,
    fallbackReason: redact(studentChat.body?.fallbackReason),
    providerErrors: Array.isArray(studentChat.body?.providerErrors) ? studentChat.body.providerErrors.map(redact) : [],
    textPreview: redact(studentChat.body?.text),
  },
  interactionsBefore: {
    ok: interactionsBefore.ok,
    status: interactionsBefore.status,
    summary: interactionsBefore.body?.summary,
  },
  interactionsAfter: {
    ok: interactionsAfter.ok,
    status: interactionsAfter.status,
    summary: interactionsAfter.body?.summary,
    latest: Array.isArray(interactionsAfter.body?.items)
      ? interactionsAfter.body.items.slice(0, 3).map((item) => ({
          audience: item.audience,
          endpoint: item.endpoint,
          provider: item.provider,
          model: item.model,
          status: item.status,
          usedFallback: item.usedFallback,
          error: redact(item.error),
          fallbackReason: redact(item.metadata?.fallbackReason),
          hasImage: item.metadata?.hasImage,
          createdAt: item.createdAt,
        }))
      : [],
  },
  readinessAfter: {
    ok: readinessAfter.ok,
    status: readinessAfter.status,
    score: readinessAfter.body?.score,
    activeProvider: readinessAfter.body?.activeProvider,
    studentAdvisor: readinessAfter.body?.studentAdvisor,
    monitoring: readinessAfter.body?.monitoring,
    nextActions: readinessAfter.body?.nextActions || [],
  },
};

const checks = [
  { name: "ai status endpoint is reachable", pass: status.ok },
  { name: "admin readiness endpoint is reachable", pass: readiness.ok },
  { name: "provider order comes from admin integrations", pass: report.status.providerOrderSource === "admin" },
  { name: "at least one real provider is configured", pass: report.status.configuredProviders.length > 0 },
  {
    name: "configured provider live test succeeds",
    pass: providerTests.length === 0 || providerTests.some((item) => item.result.body?.ok === true),
  },
  { name: "student chat endpoint responded", pass: studentChat.ok },
  { name: "student chat used a real provider", pass: studentChat.body?.provider && studentChat.body.provider !== "none" && studentChat.body?.usedFallback !== true },
  {
    name: "post-chat readiness reflects fallback pressure",
    pass:
      studentChat.body?.usedFallback !== true ||
      Number(readinessAfter.body?.studentAdvisor?.fallbackStudentChats24h || readinessAfter.body?.monitoring?.fallbackStudentChats24h || 0) > 0,
  },
];

report.checks = checks.map((check) => ({ ...check, status: check.pass ? "PASS" : "REVIEW" }));
report.summary = {
  pass: report.checks.filter((check) => check.status === "PASS").length,
  review: report.checks.filter((check) => check.status !== "PASS").length,
};

fs.writeFileSync(path.join(OUT_DIR, "live-ai-runtime-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(
  path.join(OUT_DIR, "SUMMARY.md"),
  [
    "# Live AI Runtime Audit",
    "",
    `- Generated: ${report.generatedAt}`,
    `- API: ${BASE_URL}`,
    `- Provider: ${report.status.provider || "unknown"}`,
    `- Routing: ${report.status.routingMode || "unknown"} / ${report.status.providerOrderSource || "unknown"}`,
    `- Readiness score: ${report.readiness.score ?? "unknown"}`,
    `- Post-chat readiness score: ${report.readinessAfter.score ?? "unknown"}`,
    `- Student chat: provider=${report.studentChat.provider || "unknown"}, fallback=${String(report.studentChat.usedFallback)}`,
    `- Fallback reason: ${report.studentChat.fallbackReason || "none"}`,
    `- Checks: PASS ${report.summary.pass}, REVIEW ${report.summary.review}`,
    "",
    "## Checks",
    ...report.checks.map((check) => `- [${check.status}] ${check.name}`),
    "",
  ].join("\n"),
);

console.log(JSON.stringify({ outDir: OUT_DIR, ...report.summary, provider: report.status.provider, studentChat: report.studentChat }, null, 2));
