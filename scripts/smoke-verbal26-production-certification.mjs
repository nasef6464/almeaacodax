import fs from "node:fs";
const API_BASE = process.env.SMOKE_API_BASE_URL || "https://almeaacodax.vercel.app/api";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "";
const STUDENT_EMAIL = process.env.SMOKE_STUDENT_EMAIL || "";
const STUDENT_PASSWORD = process.env.SMOKE_STUDENT_PASSWORD || "";
const QUESTION_ID = "VERBAL26-ANAS-P005-Q001";
const EXPECTED_SKILL_ID = "skill_verbal_17";
const EXPECTED_SKILL_NAME = "الخطأ السياقي — فهم السياق وتحديد الخطأ";
const EXPECTED_SUBSKILL_ID = "sub_verbal_11_2";
const EXPECTED_SUBSKILL_NAME = "تحديد الكلمة الخاطئة";
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

  const taxonomy = await req("/taxonomy/bootstrap?phase=full", { token: admin.token });
  const verbalSections = (taxonomy.body?.sections || []).filter((item) => String(item?.subjectId || "") === "sub_1777779759038");
  const verbalSkills = (taxonomy.body?.skills || []).filter((item) => String(item?.subjectId || "") === "sub_1777779759038");
  const verbalSubSkillCount = verbalSkills.reduce((sum, item) => sum + (Array.isArray(item?.subSkills) ? item.subSkills.length : 0), 0);
  assert(verbalSections.length === 22, `taxonomy sections mismatch: ${verbalSections.length}/22`);
  assert(verbalSkills.length === 22, `taxonomy main skill records mismatch: ${verbalSkills.length}/22`);
  assert(verbalSubSkillCount === 76, `taxonomy subskills mismatch: ${verbalSubSkillCount}/76`);
  const expectedMainSkill = verbalSkills.find((item) => String(item?.id || item?._id || "") === EXPECTED_SKILL_ID);
  assert(expectedMainSkill, `taxonomy missing expected main skill: ${EXPECTED_SKILL_ID}`);
  assert(String(expectedMainSkill.name || "").trim() === EXPECTED_SKILL_NAME,
    `taxonomy main skill name mismatch: ${expectedMainSkill?.name || "<blank>"}`);
  const expectedSubSkill = (Array.isArray(expectedMainSkill.subSkills) ? expectedMainSkill.subSkills : [])
    .find((item) => String(item?.id || "") === EXPECTED_SUBSKILL_ID);
  assert(expectedSubSkill, `taxonomy missing expected subskill: ${EXPECTED_SUBSKILL_ID}`);
  assert(String(expectedSubSkill.name || "").trim() === EXPECTED_SUBSKILL_NAME,
    `taxonomy subskill name mismatch: ${expectedSubSkill?.name || "<blank>"}`);

  const canonicalQuery = "subject=sub_1777779759038&source=imported&approvalStatus=approved&skillLinkStatus=linked";
  const coverageResponse = await req(`/quizzes/questions?${canonicalQuery}&limit=1&page=1&summary=true&noTotal=true&includeCoverage=true&paginate=true`, { token: admin.token });
  const coverage = coverageResponse.body?.coverage || {};
  assert(Number(coverage.total) === 1050, `question coverage total mismatch: ${coverage.total}/1050`);
  assert(Number(coverage.mainSkillCount) === 22, `question coverage main skills mismatch: ${coverage.mainSkillCount}/22`);
  assert(Number(coverage.subSkillCount) === 50, `question coverage used subskills mismatch: ${coverage.subSkillCount}/50`);
  assert(Object.keys(coverage.sectionQuestionCounts || {}).length === 22, "section question coverage does not include all 22 main skills");

  const approvedBankPath = new URL("../server/data/verbal_approved_bank_v2.json", import.meta.url);
  const approvedBank = JSON.parse(fs.readFileSync(approvedBankPath, "utf8"));
  assert(Array.isArray(approvedBank) && approvedBank.length === 1050,
    `approved canonical bank mismatch: ${Array.isArray(approvedBank) ? approvedBank.length : "<not-array>"}/1050`);
  const expectedIds = approvedBank.map((q) => String(q?.canonicalId || "").trim()).filter(Boolean);
  assert(new Set(expectedIds).size === 1050, `approved canonical IDs mismatch: ${new Set(expectedIds).size}/1050`);

  const canonicalInventory = [];
  for (let offset = 0; offset < expectedIds.length; offset += 100) {
    const batch = expectedIds.slice(offset, offset + 100);
    const batchResponse = await req(
      `/quizzes/questions?subject=sub_1777779759038&source=imported&approvalStatus=approved&ids=${encodeURIComponent(batch.join(","))}&limit=100&page=1&paginate=true`,
      { token: admin.token },
    );
    const pageItems = asArray(batchResponse.body);
    assert(pageItems.length === batch.length,
      `canonical batch size mismatch at offset ${offset}: ${pageItems.length}/${batch.length}`);
    canonicalInventory.push(...pageItems);
  }
  const returnedIds = canonicalInventory.map((q) => String(q?.id || q?.canonicalId || q?.sourceMeta?.sourceItemId || "").trim()).filter(Boolean);
  const returnedSet = new Set(returnedIds);
  assert(returnedSet.size === 1050, `production canonical exact-ID mismatch: ${returnedSet.size}/1050`);
  const missingIds = expectedIds.filter((id) => !returnedSet.has(id));
  assert(missingIds.length === 0, `production canonical IDs missing: ${missingIds.slice(0, 10).join(", ")}`);
  const sourceBookCounts = canonicalInventory.reduce((acc, q) => {
    const key = String(q?.sourceBook || "");
    acc[key] = Number(acc[key] || 0) + 1;
    return acc;
  }, {});
  assert(Number(sourceBookCounts.abdelbaset) === 915 && Number(sourceBookCounts.anas) === 135,
    `canonical sourceBook counts mismatch: ${JSON.stringify(sourceBookCounts)}`);
  assert(Object.keys(sourceBookCounts).every((key) => ["abdelbaset", "anas"].includes(key)),
    `unexpected canonical sourceBook values: ${JSON.stringify(sourceBookCounts)}`);

  const catalog = await req(`/quizzes/questions?ids=${encodeURIComponent(QUESTION_ID)}&limit=10&page=1`, { token: admin.token });
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
  assert(detailText.includes(EXPECTED_SKILL_NAME), "result/review analysis missing main skill name from same attempt");
  assert(detailText.includes(EXPECTED_SUBSKILL_NAME), "result/review analysis missing subskill name from same attempt");

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
    mainSkillName: EXPECTED_SKILL_NAME,
    subSkillId: EXPECTED_SUBSKILL_ID,
    subSkillName: EXPECTED_SUBSKILL_NAME,
    taxonomy: { mainSkills: 22, subSkills: 76, usedSubSkills: 50, questions: 1050 },
    canonicalBySource: { abdelbaset: 915, anas: 135 },
    checks: ["taxonomy-ui-lineage","question-bank-coverage","question","answer","result","review","retry-guard","results-history","same-attempt-skill-analysis"],
  }, null, 2));
} finally {
  if (admin?.token) {
    const cleanup = await req(`/quizzes/${QUIZ_ID}`, { method: "DELETE", token: admin.token }).catch((error) => {
      const message = String(error);
      if (message.includes("failed 404")) return { skippedMissingQuiz: true };
      return { cleanupError: message };
    });
    if (cleanup?.cleanupError) console.error(cleanup.cleanupError);
  }
}
