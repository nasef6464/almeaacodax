const API_BASE = process.env.SMOKE_API_BASE_URL || process.env.SEED_API_BASE_URL || "https://almeaacodax-api.onrender.com/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nasef64@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Nn@0120110367";

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
    aiStatus,
    publicPaymentSettings,
    adminPaymentSettings,
    adminPaymentRequests,
    studentPaymentRequests,
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
    request<any>("/ai/status", "GET", undefined, admin.token),
    request<any>("/payments/settings"),
    request<any>("/payments/settings", "GET", undefined, admin.token),
    request<any>("/payments/requests", "GET", undefined, admin.token),
    request<any>("/payments/requests", "GET", undefined, student.token),
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
    ["gemini", "ollama", "none"].includes(String(aiStatus?.provider || "")) &&
      typeof aiStatus?.timeoutMs === "number" &&
      typeof aiStatus?.model === "string",
    `provider=${aiStatus?.provider || "unknown"}, model=${aiStatus?.model || "unknown"}`,
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
    (studentCourses || []).length > 0 && (studentQuizzes || []).length > 0,
    `courses=${studentCourses.length}, quizzes=${studentQuizzes.length}`,
  );

  pushResult(
    results,
    "student",
    "public packages visible as sellable catalog",
    (studentCourses || []).some((item: any) => item.isPackage === true || item.packageContentTypes?.length > 0),
    `packages=${(studentCourses || []).filter((item: any) => item.isPackage === true || item.packageContentTypes?.length > 0).length}`,
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

  learningTargets.forEach((target) => {
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
  });

  pushResult(
    results,
    "student",
    "has historical results",
    (studentResults || []).length > 0,
    `results=${studentResults.length}`,
  );

  pushResult(
    results,
    "student-redeemed",
    "redeemed package attached to account",
    Array.isArray(studentRedeemedMe.user?.subscription?.purchasedPackages) &&
      studentRedeemedMe.user.subscription.purchasedPackages.includes(scopedPackageId),
    `packages=${JSON.stringify(studentRedeemedMe.user?.subscription?.purchasedPackages || [])}`,
  );

  pushResult(
    results,
    "student-redeemed",
    "scoped package unlocks learning inventory",
    (studentRedeemedCourses || []).length > 0 && (studentRedeemedQuizzes || []).length > 0,
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
