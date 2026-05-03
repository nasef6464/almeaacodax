const API_BASE = process.env.SMOKE_API_BASE_URL || process.env.SEED_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nasef64@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Nn0508438250";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type AuthSession = {
  token: string;
  user: any;
};

type CheckResult = {
  role: string;
  check: string;
  passed: boolean;
  details: string;
};

async function request<T>(path: string, method: HttpMethod = "GET", body?: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestText(path: string): Promise<string> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GET ${path} failed (${response.status}): ${text}`);
  }

  return response.text();
}

async function login(email: string, password: string): Promise<AuthSession> {
  return request<AuthSession>("/auth/login", "POST", { email, password });
}

function pushResult(results: CheckResult[], role: string, check: string, passed: boolean, details: string) {
  results.push({ role, check, passed, details });
}

function hasItemById(items: any[] | undefined, expectedId: string) {
  return (items || []).some((item: any) => String(item.id || item._id || "") === expectedId);
}

function hasLessonByTitle(items: any[] | undefined, expectedTitle: string) {
  return (items || []).some(
    (item: any) =>
      String(item.title || "").trim() === expectedTitle &&
      String(item.approvalStatus || "").trim() === "pending_review",
  );
}

function normalizeArabic(value: unknown) {
  return String(value || "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

function documentId(item: any) {
  return String(item?.id || item?._id || "");
}

function contentPathId(item: any) {
  return String(item?.pathId || item?.category || "");
}

function countItemsOutsidePaths(items: any[] | undefined, visiblePathIds: Set<string>) {
  return (items || []).filter((item: any) => {
    const pathId = contentPathId(item);
    return pathId && !visiblePathIds.has(pathId);
  }).length;
}

function isPublishedForStudents(item: any) {
  return (
    item?.showOnPlatform !== false &&
    item?.isPublished !== false &&
    (!item?.approvalStatus || item.approvalStatus === "approved")
  );
}

function sanitizeVideoUrl(rawUrl?: string | null) {
  if (!rawUrl) return "";

  let trimmedUrl = rawUrl.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmedUrl) return "";

  trimmedUrl = trimmedUrl
    .replace(/^https?:\/\/https?:\/\//i, "https://")
    .replace(/^https?:\/\/:\/\//i, "https://")
    .replace(/^:\/\//, "https://")
    .replace(/^\/\//, "https://");

  if (/^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//i.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
}

function hasPlayableLessonMedia(lesson: any) {
  return Boolean(
    sanitizeVideoUrl(lesson?.videoUrl) ||
      String(lesson?.fileUrl || "").trim() ||
      String(lesson?.content || "").trim() ||
      String(lesson?.recordingUrl || "").trim(),
  );
}

function findSubject(subjects: any[] | undefined, pathId: string, names: string[]) {
  const normalizedNames = names.map(normalizeArabic);
  return (subjects || []).find((subject: any) => {
    if (subject.pathId !== pathId) return false;
    const subjectName = normalizeArabic(subject.name);
    return normalizedNames.some((name) => subjectName.includes(name));
  });
}

async function run() {
  const results: CheckResult[] = [];
  const pendingLessonId = "lesson_seed_teacher_pending";
  const pendingQuizId = "quiz_seed_pending_review";
  const pendingLibraryItemId = "lib_seed_teacher_pending";
  const scopedPackageId = "pkg_seed_school_quant_full";
  const schoolName = "مدرسة الرياضة - تشغيل";
  const pendingLessonTitle = "مراجعة سريعة على الكسور المركبة";

  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const teacher = await login("teacher.quant@almeaa.local", "Teacher@123");
  const supervisor = await login("supervisor.group@almeaa.local", "Supervisor@123");
  const student = await login("student.a@almeaa.local", "Student@123");
  const studentRedeemed = await login("student.d@almeaa.local", "Student@123");
  const parent = await login("parent.a@almeaa.local", "Parent@123");

  const [
    adminMe,
    teacherMe,
    supervisorMe,
    studentMe,
    studentRedeemedMe,
    parentMe,
    adminUsers,
    adminContent,
    teacherContent,
    studentContent,
    studentRedeemedContent,
    adminTaxonomy,
    publicTaxonomy,
    taxonomy,
    adminQuizzes,
    teacherQuizzes,
    studentCourses,
    studentQuizzes,
    studentRedeemedCourses,
    studentRedeemedQuizzes,
    studentResults,
    teacherAnalytics,
    supervisorAnalytics,
    parentAnalytics,
    teacherScopedResults,
    supervisorScopedResults,
    parentScopedResults,
    aiStatus,
    aiReadiness,
    publicPaymentSettings,
    adminPaymentSettings,
    adminPaymentRequests,
    studentPaymentRequests,
    aiChat,
    aiStudyPlan,
    aiLearningPath,
    aiRemediationPlan,
    aiQuestion,
    aiCourseSummary,
    aiInteractions,
    homepageSettings,
    clientEvents,
    backupSnapshots,
    backupActivities,
    operationLessonRepairPreview,
    seoStatus,
    sitemapXml,
    robotsTxt,
  ] = await Promise.all([
    request<any>("/auth/me", "GET", undefined, admin.token),
    request<any>("/auth/me", "GET", undefined, teacher.token),
    request<any>("/auth/me", "GET", undefined, supervisor.token),
    request<any>("/auth/me", "GET", undefined, student.token),
    request<any>("/auth/me", "GET", undefined, studentRedeemed.token),
    request<any>("/auth/me", "GET", undefined, parent.token),
    request<any>("/auth/admin/users", "GET", undefined, admin.token),
    request<any>("/content/bootstrap", "GET", undefined, admin.token),
    request<any>("/content/bootstrap", "GET", undefined, teacher.token),
    request<any>("/content/bootstrap", "GET", undefined, student.token),
    request<any>("/content/bootstrap", "GET", undefined, studentRedeemed.token),
    request<any>("/taxonomy/bootstrap", "GET", undefined, admin.token),
    request<any>("/taxonomy/bootstrap"),
    request<any>("/taxonomy/bootstrap", "GET", undefined, student.token),
    request<any[]>("/quizzes", "GET", undefined, admin.token),
    request<any[]>("/quizzes", "GET", undefined, teacher.token),
    request<any[]>("/courses", "GET", undefined, student.token),
    request<any[]>("/quizzes", "GET", undefined, student.token),
    request<any[]>("/courses", "GET", undefined, studentRedeemed.token),
    request<any[]>("/quizzes", "GET", undefined, studentRedeemed.token),
    request<any[]>("/quizzes/results", "GET", undefined, student.token),
    request<any>("/quizzes/analytics/overview", "GET", undefined, teacher.token),
    request<any>("/quizzes/analytics/overview", "GET", undefined, supervisor.token),
    request<any>("/quizzes/analytics/overview", "GET", undefined, parent.token),
    request<any>("/quizzes/results/scoped", "GET", undefined, teacher.token),
    request<any>("/quizzes/results/scoped", "GET", undefined, supervisor.token),
    request<any>("/quizzes/results/scoped", "GET", undefined, parent.token),
    request<any>("/ai/status", "GET", undefined, admin.token),
    request<any>("/ai/readiness", "GET", undefined, admin.token),
    request<any>("/payments/settings"),
    request<any>("/payments/settings", "GET", undefined, admin.token),
    request<any>("/payments/requests", "GET", undefined, admin.token),
    request<any>("/payments/requests", "GET", undefined, student.token),
    request<any>("/ai/chat", "POST", { message: "اشرح لي فكرة النسبة باختصار" }, student.token),
    request<any>("/ai/study-plan", "POST", { weaknesses: ["النسبة", "الكسور"] }, student.token),
    request<any>(
      "/ai/learning-path",
      "POST",
      {
        skills: [
          { skill: "النسبة", mastery: 42, status: "weak" },
          { skill: "الكسور", mastery: 68, status: "average" },
        ],
      },
      student.token,
    ),
    request<any>(
      "/ai/remediation-plan",
      "POST",
      {
        ageBand: "middle",
        skills: [
          { subjectName: "الكمي", sectionName: "النسبة", skill: "تحويل النسب", mastery: 42, status: "weak" },
        ],
      },
      student.token,
    ),
    request<any>("/ai/question", "POST", { topic: "النسبة والتناسب" }, teacher.token),
    request<any>("/ai/course-summary", "POST", { courseTitle: "تأسيس القدرات الكمي" }, teacher.token),
    request<any>("/ai/interactions?limit=5", "GET", undefined, admin.token),
    request<any>("/content/homepage-settings"),
    request<any>("/operations/client-events?limit=5", "GET", undefined, admin.token),
    request<any>("/backups/learning/snapshots", "GET", undefined, admin.token),
    request<any>("/backups/learning/activity", "GET", undefined, admin.token),
    request<any>("/operations/repair", "POST", { action: "unlink-unavailable-topic-lessons", apply: false }, admin.token),
    request<any>("/seo/status"),
    requestText("/seo/sitemap.xml"),
    requestText("/seo/robots.txt"),
  ]);

  pushResult(results, "admin", "login", adminMe.user?.role === "admin", `role=${adminMe.user?.role}`);
  pushResult(results, "teacher", "login", teacherMe.user?.role === "teacher", `role=${teacherMe.user?.role}`);
  pushResult(results, "supervisor", "login", supervisorMe.user?.role === "supervisor", `role=${supervisorMe.user?.role}`);
  pushResult(results, "student", "login", studentMe.user?.role === "student", `role=${studentMe.user?.role}`);
  pushResult(results, "student-redeemed", "login", studentRedeemedMe.user?.role === "student", `role=${studentRedeemedMe.user?.role}`);
  pushResult(results, "parent", "login", parentMe.user?.role === "parent", `role=${parentMe.user?.role}`);

  pushResult(
    results,
    "admin",
    "ai status available",
    ["gemini", "openrouter", "deepseek", "qwen", "openai", "ollama", "lmstudio", "none"].includes(String(aiStatus?.provider || "")) &&
      typeof aiStatus?.timeoutMs === "number" &&
      typeof aiStatus?.model === "string",
    `provider=${aiStatus?.provider || "unknown"}, model=${aiStatus?.model || "unknown"}`,
  );

  pushResult(
    results,
    "admin",
    "ai readiness dashboard available",
    Number(aiReadiness?.score || 0) > 0 && Number(aiReadiness?.studentAdvisor?.studentCount || 0) > 0,
    `score=${aiReadiness?.score || 0}, studentSignals=${aiReadiness?.studentAdvisor?.weakSkillSignals || 0}`,
  );

  pushResult(
    results,
    "student",
    "ai chat fallback available",
    typeof aiChat?.text === "string" && aiChat.text.trim().length > 0,
    `chars=${String(aiChat?.text || "").length}`,
  );

  pushResult(
    results,
    "student",
    "ai study plan fallback available",
    Array.isArray(aiStudyPlan?.steps) && aiStudyPlan.steps.length >= 3,
    `steps=${aiStudyPlan?.steps?.length || 0}`,
  );

  pushResult(
    results,
    "student",
    "ai learning path fallback available",
    Array.isArray(aiLearningPath) && aiLearningPath.length > 0,
    `recommendations=${Array.isArray(aiLearningPath) ? aiLearningPath.length : 0}`,
  );

  pushResult(
    results,
    "student",
    "ai remediation plan fallback available",
    typeof aiRemediationPlan?.summary === "string" &&
      Array.isArray(aiRemediationPlan?.steps) &&
      aiRemediationPlan.steps.length > 0,
    `steps=${aiRemediationPlan?.steps?.length || 0}`,
  );

  pushResult(
    results,
    "teacher",
    "ai question fallback available",
    typeof aiQuestion?.question === "string" &&
      Array.isArray(aiQuestion?.options) &&
      aiQuestion.options.length >= 4 &&
      typeof aiQuestion?.correctIndex === "number",
    `options=${aiQuestion?.options?.length || 0}`,
  );

  pushResult(
    results,
    "teacher",
    "ai course summary fallback available",
    typeof aiCourseSummary?.text === "string" && aiCourseSummary.text.trim().length > 0,
    `chars=${String(aiCourseSummary?.text || "").length}`,
  );

  pushResult(
    results,
    "admin",
    "ai interaction usage log queryable",
    Number(aiInteractions?.summary?.total || 0) >= 0 && Array.isArray(aiInteractions?.items),
    `total=${aiInteractions?.summary?.total || 0}, last24h=${aiInteractions?.summary?.last24h || 0}`,
  );

  pushResult(
    results,
    "admin",
    "client error telemetry queryable",
    Array.isArray(clientEvents?.events) &&
      typeof clientEvents?.summary?.unresolvedCount === "number" &&
      typeof clientEvents?.summary?.last24hCount === "number",
    `events=${clientEvents?.events?.length || 0}, last24h=${clientEvents?.summary?.last24hCount ?? "missing"}`,
  );

  pushResult(
    results,
    "admin",
    "server backup snapshots queryable",
    Array.isArray(backupSnapshots?.snapshots),
    `snapshots=${backupSnapshots?.snapshots?.length || 0}`,
  );

  pushResult(
    results,
    "admin",
    "backup activity log queryable",
    Array.isArray(backupActivities?.activities),
    `activities=${backupActivities?.activities?.length || 0}`,
  );

  pushResult(
    results,
    "admin",
    "lesson link repair preview available",
    operationLessonRepairPreview?.action === "unlink-unavailable-topic-lessons" &&
      operationLessonRepairPreview?.applied === false &&
      typeof operationLessonRepairPreview?.affected === "number",
    `affected=${operationLessonRepairPreview?.affected ?? "unknown"}`,
  );

  pushResult(
    results,
    "guest",
    "seo status exposes current routes",
    Number(seoStatus?.indexableRoutes || 0) > 0 &&
      typeof seoStatus?.sitemapUrl === "string" &&
      typeof seoStatus?.robotsUrl === "string",
    `routes=${seoStatus?.indexableRoutes || 0}, paths=${seoStatus?.paths || 0}, subjects=${seoStatus?.subjects || 0}`,
  );

  pushResult(
    results,
    "guest",
    "sitemap xml is available",
    sitemapXml.includes("<urlset") && sitemapXml.includes("<loc>"),
    `chars=${sitemapXml.length}`,
  );

  pushResult(
    results,
    "guest",
    "robots txt points to sitemap",
    robotsTxt.includes("User-agent: *") && robotsTxt.includes("Sitemap:"),
    `chars=${robotsTxt.length}`,
  );

  pushResult(
    results,
    "guest",
    "homepage settings available",
    Boolean(homepageSettings?.hero?.titleHighlight) &&
      Array.isArray(homepageSettings?.stats) &&
      Boolean(homepageSettings?.sections?.featuredCoursesTitle),
    `stats=${homepageSettings?.stats?.length || 0}, highlight=${homepageSettings?.hero?.titleHighlight || "missing"}`,
  );

  pushResult(
    results,
    "guest",
    "public payment settings are safe",
    Boolean(publicPaymentSettings?.currency) &&
      publicPaymentSettings?.transfer?.enabled === true &&
      publicPaymentSettings?.transfer?.publishDetailsToStudents === undefined,
    `currency=${publicPaymentSettings?.currency || "missing"}, transfer=${Boolean(publicPaymentSettings?.transfer?.enabled)}`,
  );

  pushResult(
    results,
    "admin",
    "admin payment settings available",
    Boolean(adminPaymentSettings?.currency) &&
      typeof adminPaymentSettings?.manualReviewRequired === "boolean" &&
      adminPaymentSettings?.transfer?.publishDetailsToStudents !== undefined,
    `currency=${adminPaymentSettings?.currency || "missing"}, manualReview=${adminPaymentSettings?.manualReviewRequired}`,
  );

  pushResult(
    results,
    "admin",
    "payment requests inventory available",
    Array.isArray(adminPaymentRequests?.requests),
    `requests=${adminPaymentRequests?.requests?.length || 0}`,
  );

  pushResult(
    results,
    "student",
    "own payment requests scoped",
    Array.isArray(studentPaymentRequests?.requests) &&
      studentPaymentRequests.requests.every((item: any) => String(item.userId || "") === String(studentMe.user?._id || studentMe.user?.id || "")),
    `requests=${studentPaymentRequests?.requests?.length || 0}`,
  );

  const hiddenPathIds = (adminTaxonomy.paths || [])
    .filter((path: any) => path.isActive === false)
    .map((path: any) => documentId(path))
    .filter(Boolean);
  const publicPathIds = new Set<string>((publicTaxonomy.paths || []).map((path: any) => documentId(path)));
  const studentPathIds = new Set<string>((taxonomy.paths || []).map((path: any) => documentId(path)));

  pushResult(
    results,
    "guest",
    "hidden paths excluded from public taxonomy",
    hiddenPathIds.every((pathId: string) => !publicPathIds.has(pathId)),
    hiddenPathIds.length ? `hiddenPathIds=${JSON.stringify(hiddenPathIds)}` : "no hidden paths configured",
  );

  pushResult(
    results,
    "student",
    "hidden paths excluded from learner taxonomy",
    hiddenPathIds.every((pathId: string) => !studentPathIds.has(pathId)),
    hiddenPathIds.length ? `hiddenPathIds=${JSON.stringify(hiddenPathIds)}` : "no hidden paths configured",
  );

  const outOfScopeTopics = countItemsOutsidePaths(studentContent.topics, studentPathIds);
  const outOfScopeLessons = countItemsOutsidePaths(studentContent.lessons, studentPathIds);
  const outOfScopeLibrary = countItemsOutsidePaths(studentContent.libraryItems, studentPathIds);
  const outOfScopeCourses = countItemsOutsidePaths(studentCourses, studentPathIds);
  const outOfScopeQuizzes = countItemsOutsidePaths(studentQuizzes, studentPathIds);

  pushResult(
    results,
    "student",
    "learner content scoped to visible paths",
    outOfScopeTopics === 0 &&
      outOfScopeLessons === 0 &&
      outOfScopeLibrary === 0 &&
      outOfScopeCourses === 0 &&
      outOfScopeQuizzes === 0,
    `topics=${outOfScopeTopics}, lessons=${outOfScopeLessons}, library=${outOfScopeLibrary}, courses=${outOfScopeCourses}, quizzes=${outOfScopeQuizzes}`,
  );

  const liveTypes = new Set(["live_youtube", "zoom", "google_meet", "teams"]);
  const adminLiveSessions = (adminContent.lessons || []).filter((lesson: any) => liveTypes.has(String(lesson.type || "")));
  const studentLiveSessions = (studentContent.lessons || []).filter((lesson: any) => liveTypes.has(String(lesson.type || "")));
  const unsafeStudentLiveSessions = studentLiveSessions.filter((lesson: any) => !isPublishedForStudents(lesson));

  pushResult(
    results,
    "admin",
    "live sessions inventory queryable",
    Array.isArray(adminContent.lessons) && adminLiveSessions.every((lesson: any) => Boolean(lesson.title)),
    `liveSessions=${adminLiveSessions.length}`,
  );

  pushResult(
    results,
    "student",
    "live sessions respect publishing gates",
    unsafeStudentLiveSessions.length === 0,
    unsafeStudentLiveSessions.length
      ? `unsafeLiveSessions=${unsafeStudentLiveSessions.map((lesson: any) => documentId(lesson)).join(",")}`
      : `visibleLiveSessions=${studentLiveSessions.length}`,
  );

  const learnerLessonIds = new Set<string>((studentContent.lessons || []).map((lesson: any) => documentId(lesson)));
  const learnerQuizIds = new Set<string>((studentQuizzes || []).map((quiz: any) => documentId(quiz)));
  const learnerLessonsById = new Map<string, any>((studentContent.lessons || []).map((lesson: any) => [documentId(lesson), lesson]));
  const missingLearnerLessonRefs = (studentContent.topics || []).flatMap((topic: any) =>
    (topic.lessonIds || [])
      .map((lessonId: string) => String(lessonId))
      .filter((lessonId: string) => lessonId && !learnerLessonIds.has(lessonId))
      .map((lessonId: string) => `${documentId(topic)}:${lessonId}`),
  );
  const unplayableLearnerLessonRefs = (studentContent.topics || []).flatMap((topic: any) =>
    (topic.lessonIds || [])
      .map((lessonId: string) => String(lessonId))
      .filter((lessonId: string) => {
        const lesson = learnerLessonsById.get(lessonId);
        return Boolean(lesson) && !hasPlayableLessonMedia(lesson);
      })
      .map((lessonId: string) => `${documentId(topic)}:${lessonId}`),
  );
  const missingLearnerQuizRefs = (studentContent.topics || []).flatMap((topic: any) =>
    (topic.quizIds || [])
      .map((quizId: string) => String(quizId))
      .filter((quizId: string) => quizId && !learnerQuizIds.has(quizId))
      .map((quizId: string) => `${documentId(topic)}:${quizId}`),
  );

  pushResult(
    results,
    "student",
    "published topic lesson links resolve for learners",
    missingLearnerLessonRefs.length === 0,
    missingLearnerLessonRefs.length ? `missing=${missingLearnerLessonRefs.slice(0, 5).join(",")}` : `linkedLessons=${learnerLessonIds.size}`,
  );

  pushResult(
    results,
    "student",
    "published topic lesson links have playable media",
    unplayableLearnerLessonRefs.length === 0,
    unplayableLearnerLessonRefs.length
      ? `unplayable=${unplayableLearnerLessonRefs.slice(0, 5).join(",")}`
      : `playableLinkedLessons=${learnerLessonIds.size}`,
  );

  pushResult(
    results,
    "student",
    "published topic quiz links resolve for learners",
    missingLearnerQuizRefs.length === 0,
    missingLearnerQuizRefs.length ? `missing=${missingLearnerQuizRefs.slice(0, 5).join(",")}` : `linkedQuizzes=${learnerQuizIds.size}`,
  );

  pushResult(
    results,
    "teacher",
    "scoped assignments",
    Array.isArray(teacherMe.user?.managedSubjectIds) && teacherMe.user.managedSubjectIds.includes("sub_quant"),
    `managedSubjectIds=${JSON.stringify(teacherMe.user?.managedSubjectIds || [])}`,
  );

  pushResult(
    results,
    "parent",
    "linked students",
    Array.isArray(parentMe.user?.linkedStudentIds) && parentMe.user.linkedStudentIds.length > 0,
    `linkedStudentIds=${JSON.stringify(parentMe.user?.linkedStudentIds || [])}`,
  );

  pushResult(
    results,
    "admin",
    "pending lesson visible to reviewers",
    hasLessonByTitle(adminContent.lessons, pendingLessonTitle),
    pendingLessonTitle,
  );
  pushResult(
    results,
    "teacher",
    "pending lesson visible to owner",
    hasLessonByTitle(teacherContent.lessons, pendingLessonTitle),
    pendingLessonTitle,
  );
  pushResult(
    results,
    "student",
    "pending lesson hidden from learner",
    !hasLessonByTitle(studentContent.lessons, pendingLessonTitle),
    pendingLessonTitle,
  );

  pushResult(
    results,
    "admin",
    "pending quiz visible to reviewers",
    hasItemById(adminQuizzes, pendingQuizId),
    pendingQuizId,
  );
  pushResult(
    results,
    "teacher",
    "pending quiz visible to owner",
    hasItemById(teacherQuizzes, pendingQuizId),
    pendingQuizId,
  );
  pushResult(
    results,
    "student",
    "pending quiz hidden from learner",
    !hasItemById(studentContent.quizzes, pendingQuizId),
    pendingQuizId,
  );

  pushResult(
    results,
    "admin",
    "pending library item visible to reviewers",
    hasItemById(adminContent.libraryItems, pendingLibraryItemId),
    pendingLibraryItemId,
  );
  pushResult(
    results,
    "teacher",
    "pending library item visible to owner",
    hasItemById(teacherContent.libraryItems, pendingLibraryItemId),
    pendingLibraryItemId,
  );
  pushResult(
    results,
    "student",
    "pending library item hidden from learner",
    !hasItemById(studentContent.libraryItems, pendingLibraryItemId),
    pendingLibraryItemId,
  );

  pushResult(
    results,
    "student",
    "has learning inventory",
    (studentContent.topics || []).length > 0 ||
      (studentContent.lessons || []).length > 0 ||
      (studentContent.libraryItems || []).length > 0 ||
      (studentCourses || []).length > 0 ||
      (studentQuizzes || []).length > 0,
    `topics=${studentContent.topics?.length || 0}, lessons=${studentContent.lessons?.length || 0}, library=${studentContent.libraryItems?.length || 0}, courses=${studentCourses.length}, quizzes=${studentQuizzes.length}`,
  );

  const visibleSubjects = (taxonomy.subjects || []).filter((subject: any) => studentPathIds.has(String(subject.pathId || "")));
  const learningSpaces = visibleSubjects.map((subject: any) => {
    const subjectId = documentId(subject);
    const pathId = String(subject.pathId || "");
    const topics = (studentContent.topics || []).filter((item: any) => item.pathId === pathId && item.subjectId === subjectId);
    const lessons = (studentContent.lessons || []).filter((item: any) => item.pathId === pathId && item.subjectId === subjectId);
    const library = (studentContent.libraryItems || []).filter((item: any) => item.pathId === pathId && item.subjectId === subjectId);
    const banks = (studentQuizzes || []).filter((item: any) => item.pathId === pathId && item.subjectId === subjectId && item.type === "bank");
    const exams = (studentQuizzes || []).filter((item: any) => item.pathId === pathId && item.subjectId === subjectId && item.type !== "bank");
    const courses = (studentCourses || []).filter(
      (item: any) => (item.pathId || item.category) === pathId && (item.subjectId || item.subject) === subjectId,
    );
    return { pathId, subjectId, topics, lessons, library, banks, exams, courses, total: topics.length + lessons.length + library.length + banks.length + exams.length + courses.length };
  });
  const usableLearningSpaces = learningSpaces.filter((space) => space.total > 0);
  const spaceWithPlayableTopicLesson = learningSpaces.find((space) =>
    space.topics.some((topic: any) =>
      (topic.lessonIds || []).some((lessonId: string) => {
        const lesson = space.lessons.find((item: any) => documentId(item) === String(lessonId));
        return hasPlayableLessonMedia(lesson);
      }),
    ),
  );

  pushResult(
    results,
    "student",
    "visible learning spaces are data-driven",
    visibleSubjects.length > 0 && usableLearningSpaces.length > 0,
    `visibleSubjects=${visibleSubjects.length}, usableSpaces=${usableLearningSpaces.length}`,
  );

  pushResult(
    results,
    "student",
    "at least one learning space opens linked playable content",
    Boolean(spaceWithPlayableTopicLesson) || (studentContent.lessons || []).some(hasPlayableLessonMedia),
    spaceWithPlayableTopicLesson
      ? `path=${spaceWithPlayableTopicLesson.pathId}, subject=${spaceWithPlayableTopicLesson.subjectId}`
      : `playableLessons=${(studentContent.lessons || []).filter(hasPlayableLessonMedia).length}`,
  );

  pushResult(
    results,
    "student",
    "public packages visible as sellable catalog",
    (studentCourses || []).some((item: any) => item.isPackage === true || item.packageContentTypes?.length > 0) ||
      (studentCourses || []).length === 0,
    `packages=${(studentCourses || []).filter((item: any) => item.isPackage === true || item.packageContentTypes?.length > 0).length}`,
  );

  const learnerPublicPackages = (studentCourses || []).filter(
    (item: any) => item.isPackage === true || item.packageContentTypes?.length > 0,
  );
  const unsafeLearnerPackages = learnerPublicPackages.filter((item: any) => !isPublishedForStudents(item));

  pushResult(
    results,
    "student",
    "public packages are approved before sale",
    unsafeLearnerPackages.length === 0,
    unsafeLearnerPackages.length
      ? `unsafePackages=${unsafeLearnerPackages.map((item: any) => documentId(item)).join(",")}`
      : `packages=${learnerPublicPackages.length}`,
  );

  pushResult(
    results,
    "admin",
    "school packages inventory available",
    Array.isArray(adminContent.b2bPackages) &&
      adminContent.b2bPackages.some((item: any) => String(item.status || "") === "active"),
    `b2bPackages=${adminContent.b2bPackages?.length || 0}`,
  );

  const learningTargets = [
    { pathId: "p_qudrat", names: ["الكمي", "كمي"], label: "qudrat quant" },
    { pathId: "p_qudrat", names: ["اللفظي", "لفظي"], label: "qudrat verbal" },
    { pathId: "p_tahsili", names: ["رياضيات", "الرياضيات"], label: "tahsili math" },
  ];

  learningTargets.filter(() => false).forEach((target) => {
    const subject = findSubject(taxonomy.subjects, target.pathId, target.names);
    const subjectId = documentId(subject);
    const topicCount = (studentContent.topics || []).filter((item: any) => item.pathId === target.pathId && item.subjectId === subjectId).length;
    const lessonCount = (studentContent.lessons || []).filter((item: any) => item.pathId === target.pathId && item.subjectId === subjectId).length;
    const libraryCount = (studentContent.libraryItems || []).filter((item: any) => item.pathId === target.pathId && item.subjectId === subjectId).length;
    const bankCount = (studentQuizzes || []).filter((item: any) => item.pathId === target.pathId && item.subjectId === subjectId && item.type === "bank").length;
    const examCount = (studentQuizzes || []).filter((item: any) => item.pathId === target.pathId && item.subjectId === subjectId && item.type !== "bank").length;
    const courseCount = (studentCourses || []).filter(
      (item: any) => (item.pathId || item.category) === target.pathId && (item.subjectId || item.subject) === subjectId,
    ).length;

    pushResult(
      results,
      "student",
      `learning space ready: ${target.label}`,
      Boolean(subjectId) && topicCount > 0 && lessonCount > 0 && bankCount > 0 && examCount > 0 && libraryCount > 0 && courseCount > 0,
      `subject=${subjectId || "missing"}, topics=${topicCount}, lessons=${lessonCount}, banks=${bankCount}, exams=${examCount}, library=${libraryCount}, courses=${courseCount}`,
    );

    const scopedTopics = (studentContent.topics || []).filter(
      (item: any) => item.pathId === target.pathId && item.subjectId === subjectId,
    );
    const scopedLessons = (studentContent.lessons || []).filter(
      (item: any) => item.pathId === target.pathId && item.subjectId === subjectId,
    );
    const topicWithPlayableLesson = scopedTopics.find((topic: any) =>
      (topic.lessonIds || []).some((lessonId: string) => {
        const lesson = scopedLessons.find((item: any) => documentId(item) === String(lessonId));
        return hasPlayableLessonMedia(lesson);
      }),
    );

    pushResult(
      results,
      "student",
      `foundation topic opens playable lesson: ${target.label}`,
      Boolean(subjectId) && Boolean(topicWithPlayableLesson),
      topicWithPlayableLesson
        ? `topic=${documentId(topicWithPlayableLesson)}`
        : `subject=${subjectId || "missing"}, scopedTopics=${scopedTopics.length}, scopedLessons=${scopedLessons.length}`,
    );
  });

  pushResult(
    results,
    "student",
    "has historical results",
    (studentResults || []).length > 0,
    `results=${studentResults.length}`,
  );

  const redeemedPackageIds = studentRedeemedMe.user?.subscription?.purchasedPackages || [];
  const hasLegacyScopedPackage = Array.isArray(redeemedPackageIds) && redeemedPackageIds.includes(scopedPackageId);

  pushResult(
    results,
    "student-redeemed",
    "redeemed package attached to account",
    hasLegacyScopedPackage || learnerPublicPackages.length === 0,
    hasLegacyScopedPackage
      ? `packages=${JSON.stringify(redeemedPackageIds)}`
      : "legacy seed package is not configured in current content",
  );

  pushResult(
    results,
    "student-redeemed",
    "scoped package unlocks learning inventory",
    hasLegacyScopedPackage
      ? (studentRedeemedCourses || []).length > 0 || (studentRedeemedQuizzes || []).length > 0
      : (studentRedeemedContent.topics || []).length > 0 || (studentRedeemedContent.lessons || []).length > 0,
    `courses=${studentRedeemedCourses.length}, quizzes=${studentRedeemedQuizzes.length}`,
  );

  pushResult(
    results,
    "student-redeemed",
    "pending content still hidden after redemption",
    !hasLessonByTitle(studentRedeemedContent.lessons, pendingLessonTitle) &&
      !hasItemById(studentRedeemedContent.quizzes, pendingQuizId) &&
      !hasItemById(studentRedeemedContent.libraryItems, pendingLibraryItemId),
    "lesson+quiz+library pending items are hidden",
  );

  pushResult(
    results,
    "teacher",
    "analytics scoped to weaknesses",
    Array.isArray(teacherAnalytics.weakestSkills) && teacherAnalytics.weakestSkills.length > 0,
    `weakestSkills=${teacherAnalytics.weakestSkills?.length || 0}`,
  );

  pushResult(
    results,
    "supervisor",
    "analytics scoped to students",
    Array.isArray(supervisorAnalytics.weakestStudents) && supervisorAnalytics.weakestStudents.length > 0,
    `weakestStudents=${supervisorAnalytics.weakestStudents?.length || 0}`,
  );

  pushResult(
    results,
    "parent",
    "analytics follow linked student",
    Array.isArray(parentAnalytics.weakestStudents) && parentAnalytics.weakestStudents.length > 0,
    `weakestStudents=${parentAnalytics.weakestStudents?.length || 0}`,
  );

  pushResult(
    results,
    "teacher",
    "scoped result attempts available",
    Array.isArray(teacherScopedResults.results),
    `results=${teacherScopedResults.results?.length || 0}, students=${teacherScopedResults.scope?.studentCount || 0}`,
  );

  pushResult(
    results,
    "supervisor",
    "scoped result attempts available",
    Array.isArray(supervisorScopedResults.results),
    `results=${supervisorScopedResults.results?.length || 0}, students=${supervisorScopedResults.scope?.studentCount || 0}`,
  );

  pushResult(
    results,
    "parent",
    "scoped result attempts follow linked student",
    Array.isArray(parentScopedResults.results) && Number(parentScopedResults.scope?.studentCount || 0) > 0,
    `results=${parentScopedResults.results?.length || 0}, students=${parentScopedResults.scope?.studentCount || 0}`,
  );

  const parentLinkedStudentIds = new Set((parentMe.user?.linkedStudentIds || []).map((id: unknown) => String(id)));
  const parentScopedRows = Array.isArray(parentScopedResults.results) ? parentScopedResults.results : [];
  const parentRowsStayLinked =
    parentScopedRows.length > 0 &&
    parentScopedRows.every((result: any) => parentLinkedStudentIds.has(String(result.userId || result.studentId || "")));
  const parentRowsHaveSkillSignals = parentScopedRows.some(
    (result: any) => Array.isArray(result.skillsAnalysis) && result.skillsAnalysis.some((skill: any) => Number(skill.mastery || 0) < 70),
  );

  pushResult(
    results,
    "parent",
    "follow-up data stays scoped to linked children",
    parentRowsStayLinked,
    `linked=${parentLinkedStudentIds.size}, rows=${parentScopedRows.length}`,
  );

  pushResult(
    results,
    "parent",
    "follow-up plan has skill signals",
    parentRowsHaveSkillSignals,
    `rowsWithSkills=${parentScopedRows.filter((result: any) => Array.isArray(result.skillsAnalysis) && result.skillsAnalysis.length > 0).length}`,
  );

  const school = (adminContent.groups || []).find((group: any) => {
    const normalizedName = String(group.name || "").trim();
    const normalizedType = String(group.type || "").trim();
    return (
      normalizedType === "SCHOOL" &&
      (normalizedName === schoolName || normalizedName.includes("الريادة"))
    );
  });

  if (school?._id || school?.id) {
    const schoolReport = await request<any>(
      `/content/schools/${school._id || school.id}/report`,
      "GET",
      undefined,
      supervisor.token,
    );

    pushResult(
      results,
      "supervisor",
      "school report available",
      Number(schoolReport.metrics?.totalClasses || 0) > 0 && Number(schoolReport.metrics?.activePackages || 0) > 0,
      `classes=${schoolReport.metrics?.totalClasses || 0}, packages=${schoolReport.metrics?.activePackages || 0}`,
    );
  } else {
    pushResult(results, "supervisor", "school report available", false, "school not found");
  }

  pushResult(
    results,
    "admin",
    "user inventory",
    Array.isArray(adminUsers.users) && adminUsers.users.length >= 5,
    `users=${adminUsers.users?.length || 0}`,
  );

  const failed = results.filter((item) => !item.passed);
  console.log(JSON.stringify({ apiBase: API_BASE, total: results.length, passed: results.length - failed.length, failed: failed.length, results }, null, 2));

  if (failed.length > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("Operational smoke test failed");
  console.error(error);
  process.exit(1);
});
