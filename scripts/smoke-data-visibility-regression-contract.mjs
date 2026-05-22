const FRONTEND_URL = (process.env.SMOKE_FRONTEND_URL || "https://almeaacodax.vercel.app").replace(/\/+$/, "");
const API_URL = (process.env.SMOKE_API_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/+$/, "");
const TARGET_PATH_ID = process.env.SMOKE_PATH_ID || "p_1777779639431";
const TARGET_SUBJECT_ID = process.env.SMOKE_SUBJECT_ID || "sub_1777779748206";

const checks = [];
const failed = [];

function isObject(value) {
  return value !== null && typeof value === "object";
}

function toArray(value, key = "") {
  const valueAsArray = isObject(value) && key ? value[key] : value;
  if (Array.isArray(valueAsArray)) return valueAsArray;
  throw new Error(`expected array at ${key || "response"}`);
}

function normalizeId(value) {
  return String(value || "").trim();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
      pragma: "no-cache",
      ...options.headers,
    },
  });

  return { response, json: response.ok ? response.json().catch(() => ({})) : null };
}

async function check(name, fn) {
  try {
    const details = await fn();
    checks.push({ name, status: "PASS", details });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    checks.push({ name, status: "FAIL", details });
    failed.push({ name, details });
  }
}

function isAcceptableHealthStatus(payload) {
  return payload && (payload.status === "ok" || payload.status === "healthy" || payload.status === "live_with_dependency_warnings");
}

function assertNoSensitiveAnswerFields(question, checkName) {
  const sensitiveAnswerFields = ["correctOptionIndex", "correctAnswerIndex", "correctAnswer", "explanation"];
  const leaked = sensitiveAnswerFields.filter((field) => Object.prototype.hasOwnProperty.call(question || {}, field));
  if (leaked.length > 0) {
    throw new Error(`${checkName}: found answer-sensitive fields ${leaked.join(", ")} in learner payload`);
  }
}

async function checkRouteShell(route) {
  await check(`frontend route shell loads: ${route}`, async () => {
    const url = `${FRONTEND_URL}${route}${route.includes("?") ? "&" : "?"}smoke=${Date.now()}`;
    const response = await fetch(url, {
      headers: {
        accept: "text/html",
        "cache-control": "no-cache",
        pragma: "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text.includes("<div id=\"root\"")) {
      throw new Error("frontend shell root element missing");
    }

    return `shell=${text.length}B`;
  });
}

(async () => {
  await check("frontend shell loads", async () => {
    const response = await fetch(`${FRONTEND_URL}/?smoke=${Date.now()}`, {
      headers: { "cache-control": "no-cache", pragma: "no-cache" },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text.includes("<div id=\"root\"")) {
      throw new Error("missing root element");
    }
    if (!text.includes("/assets/")) {
      throw new Error("missing compiled assets link");
    }

    return `bytes=${text.length}`;
  });

  const health = await fetchJson(`${API_URL}/health`);
  await check("api health is available", async () => {
    const { response, json } = health;
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const payload = await json;
    if (!payload || !isAcceptableHealthStatus(payload)) {
      throw new Error(`unexpected health payload: ${JSON.stringify(payload)}`);
    }
    return `status=${payload.status}`;
  });

  const taxonomyResult = await fetchJson(`${API_URL}/taxonomy/bootstrap`);
  const taxonomyPayload = await taxonomyResult.json;

  await check("taxonomy bootstrap returns learning paths/subjects", async () => {
    if (!taxonomyResult.response.ok) throw new Error(`${taxonomyResult.response.status} ${taxonomyResult.response.statusText}`);

    const paths = toArray(taxonomyPayload, "paths");
    const subjects = toArray(taxonomyPayload, "subjects");
    const sections = toArray(taxonomyPayload, "sections");
    const skills = toArray(taxonomyPayload, "skills");

    if (paths.length === 0) throw new Error("no paths in /taxonomy/bootstrap");
    if (subjects.length === 0) throw new Error("no subjects in /taxonomy/bootstrap");
    if (sections.length === 0) throw new Error("no sections in /taxonomy/bootstrap");
    if (skills.length === 0) throw new Error("no skills in /taxonomy/bootstrap");

    return `paths=${paths.length}, subjects=${subjects.length}, sections=${sections.length}, skills=${skills.length}`;
  });

  const bootstrapPayload = await (async () => {
    const result = await fetchJson(`${API_URL}/content/bootstrap`);
    if (!result.response.ok) {
      throw new Error(`${result.response.status} ${result.response.statusText}`);
    }
    return result.json;
  })();

  const contentPayload = await bootstrapPayload;
  await check("content bootstrap returns topics/lessons", async () => {
    const topics = toArray(contentPayload, "topics");
    const lessons = toArray(contentPayload, "lessons");

    if (topics.length === 0) throw new Error("no topics in /content/bootstrap");
    if (lessons.length === 0) throw new Error("no lessons in /content/bootstrap");

    return `topics=${topics.length}, lessons=${lessons.length}`;
  });

  const selectedPath =
    (toArray(taxonomyPayload, "paths").find((path) => normalizeId(path.id || path._id) === TARGET_PATH_ID) ||
      toArray(taxonomyPayload, "paths").find((path) => normalizeId(path.id || path._id) !== "")) || null;

  await check("course/path route has subjects attached", async () => {
    const pathId = normalizeId(selectedPath && selectedPath.id ? selectedPath.id : selectedPath && selectedPath._id);
    if (!pathId) throw new Error("could not resolve path id");

    const subjects = toArray(taxonomyPayload, "subjects").filter((subject) => normalizeId(subject.pathId) === pathId);
    if (subjects.length === 0) throw new Error(`path ${pathId} has no subjects`);

    const pathRoute = `/#/category/${pathId}`;
    await checkRouteShell(pathRoute);
    const pathWithSubjectRoute = `/#/category/${pathId}?subject=${normalizeId(subjects[0].id || subjects[0]._id)}&tab=skills`;
    await checkRouteShell(pathWithSubjectRoute);

    return `pathId=${pathId}, subjects=${subjects.length}`;
  });

  const selectedSubject =
    toArray(taxonomyPayload, "subjects").find(
      (subject) =>
        normalizeId(subject.id || subject._id) === TARGET_SUBJECT_ID &&
        (!selectedPath || normalizeId(subject.pathId) === normalizeId(selectedPath.id || selectedPath._id)),
    ) ||
    toArray(taxonomyPayload, "subjects").find(
      (subject) => normalizeId(subject.pathId) === normalizeId(selectedPath?.id || selectedPath?._id),
    );

  await check("subject route keeps topics and skills visible", async () => {
    if (!selectedSubject) throw new Error("target subject not found");

    const subjectId = normalizeId(selectedSubject.id || selectedSubject._id);
    const pathId = normalizeId(selectedPath?.id || selectedPath?._id);
    const subjectTopics = toArray(contentPayload, "topics").filter(
      (topic) => normalizeId(topic.subjectId) === subjectId && (!pathId || normalizeId(topic.pathId) === pathId),
    );
    const subjectSkills = toArray(taxonomyPayload, "skills").filter(
      (skill) => normalizeId(skill.subjectId) === subjectId && (!pathId || normalizeId(skill.pathId) === pathId),
    );

    if (subjectTopics.length === 0) throw new Error(`subject ${subjectId} has no topics`);
    if (subjectSkills.length === 0) throw new Error(`subject ${subjectId} has no skills`);

    return `subjectId=${subjectId}, topics=${subjectTopics.length}, skills=${subjectSkills.length}`;
  });

  await check("lesson route data is present for learner path", async () => {
    const subjectId = normalizeId(selectedSubject?.id || selectedSubject?._id);
    const pathId = normalizeId(selectedPath?.id || selectedPath?._id);

    const lessons = toArray(contentPayload, "lessons").filter(
      (lesson) => (!subjectId || normalizeId(lesson.subjectId) === subjectId) && (!pathId || normalizeId(lesson.pathId) === pathId),
    );

    if (lessons.length === 0) throw new Error(`subject ${subjectId} has no lessons`);

    const topicForLesson = toArray(contentPayload, "topics").find((topic) => normalizeId(topic.subjectId) === subjectId);
    const lessonRoute = topicForLesson
      ? `/#/category/${pathId}?subject=${subjectId}&topic=${normalizeId(topicForLesson.id || topicForLesson._id)}`
      : `/#/category/${pathId}?subject=${subjectId}`;
    await checkRouteShell(lessonRoute);

    return `lessons=${lessons.length}, subject=${subjectId}`;
  });

  const quizzesPayloadRaw = await fetchJson(`${API_URL}/quizzes?pathId=${encodeURIComponent(
    normalizeId(selectedPath?.id || selectedPath?._id),
  )}`);
  const quizzesPayload = await quizzesPayloadRaw.json;
  const questionsPayloadRaw = await fetchJson(`${API_URL}/quizzes/questions?pathId=${encodeURIComponent(
    normalizeId(selectedPath?.id || selectedPath?._id),
  )}`);
  const questionsPayload = await questionsPayloadRaw.json;

  await check("quiz list is accessible and has items", async () => {
    if (!quizzesPayloadRaw.response.ok) throw new Error(`${quizzesPayloadRaw.response.status} ${quizzesPayloadRaw.response.statusText}`);
    const quizzesContainer = quizzesPayload || {};
    const quizItems = Array.isArray(quizzesContainer.quizzes) ? quizzesContainer.quizzes : [];

    if (quizItems.length === 0) {
      throw new Error("no quizzes in /quizzes");
    }

    return `quizzes=${quizItems.length}`;
  });

  await check("quiz page questions are visible and do not include answers for guest/learner", async () => {
    if (!questionsPayloadRaw.response.ok) {
      throw new Error(`${questionsPayloadRaw.response.status} ${questionsPayloadRaw.response.statusText}`);
    }

    if (!Array.isArray(questionsPayload)) throw new Error("questions payload is not an array");
    if (questionsPayload.length === 0) throw new Error("no questions in /quizzes/questions");

    const sample = questionsPayload.slice(0, 20);
    sample.forEach((question, index) => assertNoSensitiveAnswerFields(question, `question[${index}]`));
    if (sample.length === 0) {
      return "questions=0 (empty payload)";
    }

    const mappedSubjects = sample.some((question) => normalizeId(question?.pathId) || normalizeId(question?.subject));
    if (!mappedSubjects) {
      throw new Error("questions payload has no path/subject mapping");
    }

    return `questions=${questionsPayload.length}`;
  });

  await check("student cannot call admin routes without auth", async () => {
    const restricted = await Promise.all([
      fetch(`${API_URL}/operations/status`, { method: "GET", headers: { accept: "application/json" } }),
      fetch(`${API_URL}/notifications/admin/templates`, { method: "GET", headers: { accept: "application/json" } }),
      fetch(`${API_URL}/operations/audit`, { method: "GET", headers: { accept: "application/json" } }),
    ]);

    const denied = restricted.every((response) => response.status === 401 || response.status === 403);
    if (!denied) {
      const status = restricted.map((response) => response.status).join(",");
      throw new Error(`admin/auth-guard endpoints are not protected: ${status}`);
    }
    return "operations endpoints blocked";
  });

  await check("student/public student area routes stay loadable", async () => {
    await checkRouteShell("/#/dashboard");
    await checkRouteShell("/#/courses");
    await checkRouteShell("/#/quizzes");
    await checkRouteShell("/#/my-quizzes");
    return "routes loaded";
  });

  await check("admin content area route shell loads (non-persistent)", async () => {
    await checkRouteShell("/#/admin-dashboard");
    await checkRouteShell("/#/admin-dashboard?tab=lessons");
    await checkRouteShell("/#/admin-dashboard?tab=paths");
    return "admin routes render shell";
  });

  const hashRouteChecks = [
    "/#/courses",
    "/#/reports",
    "/#/mock-exams",
    "/#/favorites",
    "/#/book-session",
    "/#/profile",
  ];

  for (const route of hashRouteChecks) {
    await checkRouteShell(route);
  }

  console.log("\n--- Data Visibility Regression Checks ---");
  checks.forEach((item) => {
    const status = item.status === "PASS" ? "PASS" : "FAIL";
    console.log(`${status} ${item.name} - ${item.details || ""}`);
  });

  if (failed.length > 0) {
    console.error(`\n${failed.length} blocking check(s) failed.`);
    process.exit(1);
  }

  console.log(`\nAll ${checks.length} blocking checks passed.`);
  process.exit(0);
})().catch((error) => {
  console.error("Unhandled exception in regression smoke:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
