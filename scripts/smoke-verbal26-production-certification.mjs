const API_BASE = process.env.SMOKE_API_BASE_URL || "https://almeaacodax.vercel.app/api";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "";
const STUDENT_EMAIL = process.env.SMOKE_STUDENT_EMAIL || "";
const STUDENT_PASSWORD = process.env.SMOKE_STUDENT_PASSWORD || "";
const QUESTION_ID = "VERBAL26-ANAS-P005-Q001";
const EXPECTED_SKILL_ID = "skill_verbal_17";
const EXPECTED_SUBSKILL_ID = "sub_verbal_11_2";
const EXPECTED_CORRECT_INDEX = 3;
const QUIZ_ID = `verbal26-cert-${Date.now()}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function parseCookie(raw) {
  return String(raw || "").split(",")[0]?.split(";")[0]?.trim() || "";
}
function extractCookieValue(raw, cookieName) {
  const match = String(raw || "").match(new RegExp(`${cookieName}=([^;]+)`));
  return String(match?.[1] || "").trim();
}
async function csrf() {
  const res = await fetch(`${API_BASE}/auth/csrf-token`, { headers: { "Content-Type": "application/json" } });
  assert(res.ok, `csrf failed ${res.status}`);
  const body = await res.json();
  const cookie = parseCookie(res.headers.get("set-cookie"));
  assert(body?.csrfToken && cookie, "csrf context incomplete");
  return { token: body.csrfToken, cookie };
}
async function login(email, password) {
  assert(email && password, "missing smoke credentials");
  const c = await csrf();
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": c.token, Cookie: c.cookie },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  assert(res.ok, `login failed ${res.status}: ${text}`);
  const body = JSON.parse(text);
  const bodyToken = String(body?.token || "").trim();
  const cookieToken = extractCookieValue(res.headers.get("set-cookie"), "almeaa_access_token");
  const token = bodyToken || cookieToken;
  assert(token, "login returned no bearer token in JSON or auth cookie");
  return { token, user: body.user };
}
async function req(path, { method = "GET", token, body, expected } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (["POST","PATCH","DELETE"].includes(method)) {
    const c = await csrf();
    headers["x-csrf-token"] = c.token;
    headers.Cookie = c.cookie;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : null; } catch {}
  if (expected !== undefined) {
    assert(res.status === expected, `${method} ${path} expected ${expected}, got ${res.status}: ${raw}`);
  } else {
    assert(res.ok, `${method} ${path} failed ${res.status}: ${raw}`);
  }
  return { status: res.status, body: json, raw };
}
function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of ["data","items","results","questions"]) if (Array.isArray(value[key])) return value[key];
  return [];
}

let admin, student, resultId = "";
try {
  admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  student = await login(STUDENT_EMAIL, STUDENT_PASSWORD);
  const me = await req("/auth/me", { token: student.token });
  const studentId = String(me.body?.user?.id || me.body?.user?._id || student.user?.id || "");
  assert(studentId, "student id missing");

  const catalog = await req("/quizzes/questions", { token: admin.token });
  const question = asArray(catalog.body).find((q) => String(q?.id || q?._id || q?.canonicalId) === QUESTION_ID);
  assert(question, `VERBAL26 question not visible to admin catalog: ${QUESTION_ID}`);
  assert(Number(question.correctOptionIndex) === EXPECTED_CORRECT_INDEX, "production correctOptionIndex mismatch");
  assert(String(question.skillId || question.mainSkillId) === EXPECTED_SKILL_ID, "production main skill mismatch");
  assert(String(question.subSkillId) === EXPECTED_SUBSKILL_ID, "production subskill mismatch");

  await req("/quizzes", {
    method: "POST", token: admin.token, expected: 201,
    body: {
      id: QUIZ_ID,
      title: "VERBAL26 Production Certification",
      pathId: String(question.pathId || "p_1777779639431"),
      subjectId: String(question.subjectId || question.subject || "sub_1777779759038"),
      quizKind: "test",
      mode: "central",
      questionIds: [QUESTION_ID],
      targetUserIds: [studentId],
      isPublished: true,
      showOnPlatform: true,
      access: { type: "free" },
      settings: { maxAttempts: 1, passingScore: 0 },
    },
  });

  const definition = await req(`/quizzes/${QUIZ_ID}`, { token: student.token });
  const definitionText = JSON.stringify(definition.body);
  assert(definitionText.includes(QUESTION_ID), "student definition missing VERBAL26 question");

  const submission = await req(`/quizzes/${QUIZ_ID}/submit`, {
    method: "POST", token: student.token, expected: 201,
    body: { answers: { [QUESTION_ID]: EXPECTED_CORRECT_INDEX }, timeSpentSeconds: 2, source: "verbal26-production-certification" },
  });
  assert(Number(submission.body?.score) === 100, `expected score=100, got ${submission.body?.score}`);
  resultId = String(submission.body?.id || submission.body?._id || "");
  assert(resultId, "submission result id missing");

  const detail = await req(`/quiz-results/${resultId}`, { token: student.token });
  const detailText = JSON.stringify(detail.body);
  assert(detailText.includes(QUIZ_ID), "result detail missing certification quiz id");
  assert(detailText.includes(EXPECTED_SKILL_ID), "result/review analysis missing main skill from same attempt");
  assert(detailText.includes(EXPECTED_SUBSKILL_ID), "result/review analysis missing subskill from same attempt");

  const history = await req(`/quiz-results/my?quizId=${encodeURIComponent(QUIZ_ID)}&limit=10`, { token: student.token });
  assert(asArray(history.body).some((r) => String(r?.id || r?._id) === resultId), "student results history missing certification result");

  await req(`/quizzes/${QUIZ_ID}/submit`, {
    method: "POST", token: student.token, expected: 409,
    body: { answers: { [QUESTION_ID]: EXPECTED_CORRECT_INDEX }, timeSpentSeconds: 1, source: "verbal26-production-certification-retry" },
  });

  console.log(JSON.stringify({
    ok: true,
    canonicalQuestion: QUESTION_ID,
    quizId: QUIZ_ID,
    resultId,
    score: submission.body?.score,
    mainSkillId: EXPECTED_SKILL_ID,
    subSkillId: EXPECTED_SUBSKILL_ID,
    checks: ["question","answer","result","review","retry-guard","results-history","same-attempt-skill-analysis"],
  }, null, 2));
} finally {
  if (admin?.token) {
    const cleanup = await req(`/quizzes/${QUIZ_ID}`, { method: "DELETE", token: admin.token, expected: 200 }).catch((error) => ({ cleanupError: String(error) }));
    if (cleanup?.cleanupError) console.error(cleanup.cleanupError);
  }
}
