import fs from "node:fs";
import path from "node:path";

const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.SCHOOL_FROM_SCRATCH_RUN_ID || `school-from-scratch-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const OUT_DIR = path.resolve("audit-artifacts", "ui-audit-exhaustive", RUN_ID);
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

const adminEmail = process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
const adminPassword = process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

const audit = {
  generatedAt: new Date().toISOString(),
  apiBaseUrl: API_BASE_URL,
  runId: RUN_ID,
  checks: [],
  cleanup: [],
};

const addCheck = (name, status, note = "", meta = {}) => audit.checks.push({ name, status, note, meta });
const docId = (item) => String(item?.id || item?._id || "").trim();
const short = (value) => {
  const text = String(value || "");
  return text.length > 10 ? `${text.slice(0, 6)}...${text.slice(-4)}` : text;
};

function extractCookie(setCookieHeader, cookieName) {
  return String(setCookieHeader || "").match(new RegExp(`${cookieName}=([^;]+)`))?.[1] || "";
}

async function login() {
  if (!adminEmail || !adminPassword) throw new Error("Missing admin credentials");

  const csrfRes = await fetch(`${API_BASE_URL}/auth/csrf-token`, { headers: { Accept: "application/json" } });
  const csrfPayload = await csrfRes.json().catch(() => ({}));
  const csrfCookie = extractCookie(csrfRes.headers.get("set-cookie"), "almeaa_csrf_token");
  const csrfToken = String(csrfPayload?.csrfToken || csrfCookie || "").trim();
  if (!csrfRes.ok || !csrfToken) throw new Error(`CSRF failed: ${csrfRes.status}`);

  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
      Cookie: csrfCookie ? `almeaa_csrf_token=${csrfCookie}` : "",
    },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  const payload = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);

  const token = String(payload?.token || extractCookie(loginRes.headers.get("set-cookie"), "almeaa_access_token") || "").trim();
  const userId = String(payload?.user?.id || payload?.user?._id || "");
  if (!token) throw new Error("Login succeeded but no auth token was returned");
  return { token, csrfToken, csrfCookie, userId };
}

async function request(session, url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const needsCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);
  const cookie = [
    session.csrfCookie ? `almeaa_csrf_token=${session.csrfCookie}` : "",
    session.token ? `almeaa_access_token=${session.token}` : "",
  ]
    .filter(Boolean)
    .join("; ");
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(needsCsrf ? { "x-csrf-token": session.csrfToken } : {}),
      Authorization: `Bearer ${session.token}`,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const error = new Error(`${options.method || "GET"} ${url} failed: ${res.status}`);
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function cleanupRequest(session, label, url, options = {}) {
  try {
    await request(session, url, options);
    audit.cleanup.push({ label, status: "PASS" });
  } catch (error) {
    audit.cleanup.push({ label, status: "REVIEW", error: error.message });
  }
}

async function loadState(session) {
  const [content, taxonomy, coursesPayload] = await Promise.all([
    request(session, "/content/bootstrap?scope=full"),
    request(session, "/taxonomy/bootstrap"),
    request(session, "/courses?limit=200"),
  ]);
  return {
    groups: Array.isArray(content?.groups) ? content.groups : [],
    packages: Array.isArray(content?.b2bPackages) ? content.b2bPackages : [],
    accessCodes: Array.isArray(content?.accessCodes) ? content.accessCodes : [],
    paths: Array.isArray(taxonomy?.paths) ? taxonomy.paths : [],
    subjects: Array.isArray(taxonomy?.subjects) ? taxonomy.subjects : [],
    courses: Array.isArray(coursesPayload?.courses) ? coursesPayload.courses : [],
  };
}

const isAuditGroup = (group) => {
  const id = docId(group);
  const name = String(group?.name || "");
  return id.startsWith("audit_school_") || id.startsWith("audit_class_") || name.includes("Temporary audit") || name.includes("تدقيق");
};

const isAuditPackage = (pkg) => {
  const id = docId(pkg);
  const name = String(pkg?.name || "");
  return id.startsWith("audit_pkg_") || name.includes("Temporary audit") || name.includes("تدقيق");
};

const isAuditAccessCode = (code) => {
  const id = docId(code);
  const value = String(code?.code || "");
  return id.startsWith("audit_code_") || value.startsWith("AUDIT-");
};

async function cleanupStaleAuditData(session) {
  const state = await loadState(session);
  const staleCodes = state.accessCodes.filter(isAuditAccessCode).map(docId).filter(Boolean);
  const stalePackages = state.packages.filter(isAuditPackage).map(docId).filter(Boolean);
  const staleGroups = state.groups.filter(isAuditGroup).sort((left, right) => {
    const leftType = String(left?.type || "");
    const rightType = String(right?.type || "");
    if (leftType === rightType) return 0;
    return leftType === "CLASS" ? -1 : 1;
  });

  for (const id of staleCodes) {
    await cleanupRequest(session, `delete stale access code ${short(id)}`, `/content/access-codes/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  for (const id of stalePackages) {
    await cleanupRequest(session, `delete stale package ${short(id)}`, `/content/b2b-packages/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  const userSearch = await request(session, "/auth/admin/users?search=audit.&limit=200").catch(() => ({ users: [] }));
  const staleUsers = (Array.isArray(userSearch?.users) ? userSearch.users : [])
    .filter((user) => String(user?.email || "").toLowerCase().includes("audit."))
    .map(docId)
    .filter(Boolean);
  for (const id of staleUsers) {
    await cleanupRequest(session, `delete stale user ${short(id)}`, `/auth/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  for (const group of staleGroups) {
    const id = docId(group);
    if (id) await cleanupRequest(session, `delete stale group ${short(id)}`, `/content/groups/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}

async function run() {
  const session = await login();
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  const created = {
    users: [],
    accessCodes: [],
    packages: [],
    groups: [],
  };

  try {
    await cleanupStaleAuditData(session);
    const state = await loadState(session);
    const paths = state.paths;
    const subjects = state.subjects;
    const courses = state.courses;
    const pathId = docId(paths[0]);
    const subjectId = docId(subjects.find((subject) => String(subject.pathId || "") === pathId) || subjects[0]);
    const courseId = docId(
      courses.find(
        (course) =>
          String(course.pathId || course.category || "") === pathId ||
          String(course.subjectId || course.subject || "") === subjectId,
      ) || courses[0],
    );

    addCheck("school bootstrap has commercial content", pathId && subjectId ? "PASS" : "FAIL", `path=${short(pathId)}, subject=${short(subjectId)}, course=${short(courseId)}`);

    const school = await request(session, "/content/groups", {
      method: "POST",
      body: {
        id: `audit_school_${suffix}`,
        name: `Temporary audit school ${suffix}`,
        type: "SCHOOL",
        parentId: null,
        ownerId: session.userId || "audit-admin",
        supervisorIds: [],
        studentIds: [],
        courseIds: courseId ? [courseId] : [],
        metadata: { description: "temporary school from scratch audit" },
      },
    });
    const schoolId = docId(school);
    created.groups.push(schoolId);
    addCheck("create temporary school", schoolId ? "PASS" : "FAIL", `school=${short(schoolId)}`);

    const classroom = await request(session, "/content/groups", {
      method: "POST",
      body: {
        id: `audit_class_${suffix}`,
        name: `Temporary audit class ${suffix}`,
        type: "CLASS",
        parentId: schoolId,
        ownerId: session.userId || "audit-admin",
        supervisorIds: [],
        studentIds: [],
        courseIds: courseId ? [courseId] : [],
      },
    });
    const classId = docId(classroom);
    created.groups.push(classId);
    addCheck("create class under school", classId && String(classroom.parentId || "") === schoolId ? "PASS" : "FAIL", `class=${short(classId)}, parent=${short(classroom.parentId)}`);

    const studentEmail = `audit.student.${suffix}@almeaa.local`;
    const importPayload = await request(session, `/content/schools/${encodeURIComponent(schoolId)}/import-students`, {
      method: "POST",
      body: {
        rows: [
          {
            name: `Temporary audit student ${suffix}`,
            email: studentEmail,
            className: classroom.name,
            password: "Audit@12345",
          },
        ],
      },
    });
    addCheck("import one student into class", importPayload?.summary?.imported === 1 && importPayload?.summary?.classesTouched >= 1 ? "PASS" : "FAIL", JSON.stringify(importPayload?.summary || {}));

    const usersAfterImport = await request(session, `/auth/admin/users?search=${encodeURIComponent(studentEmail)}&limit=5`);
    const student = (usersAfterImport?.users || []).find((user) => String(user.email || "").toLowerCase() === studentEmail);
    const studentId = docId(student);
    if (studentId) created.users.push(studentId);
    const studentLinked = studentId && String(student.schoolId || "") === schoolId && (student.groupIds || []).map(String).includes(classId);
    addCheck("student has school and class scope", studentLinked ? "PASS" : "FAIL", `student=${short(studentId)}, school=${short(student?.schoolId)}, groups=${(student?.groupIds || []).length}`);

    const parentEmail = `audit.parent.${suffix}@almeaa.local`;
    const supervisorEmail = `audit.supervisor.${suffix}@almeaa.local`;
    const relationPayload = await request(session, `/content/schools/${encodeURIComponent(schoolId)}/relations`, {
      method: "POST",
      body: {
        createMissingUsers: true,
        rows: [
          {
            studentEmail,
            parentEmail,
            parentName: `Temporary audit parent ${suffix}`,
            supervisorEmail,
            supervisorName: `Temporary audit supervisor ${suffix}`,
            className: classroom.name,
          },
        ],
      },
    });
    const relationOk = relationPayload?.summary?.linkedParents === 1 && relationPayload?.summary?.linkedSupervisors === 1 && relationPayload?.summary?.assignedClasses >= 1;
    addCheck("apply parent and class supervisor relations", relationOk ? "PASS" : "FAIL", JSON.stringify(relationPayload?.summary || {}));
    for (const user of relationPayload?.users || []) {
      if ([studentEmail, parentEmail, supervisorEmail].includes(String(user.email || "").toLowerCase())) {
        const id = docId(user);
        if (id && !created.users.includes(id)) created.users.push(id);
      }
    }

    const relationGroups = relationPayload?.groups || [];
    const updatedSchool = relationGroups.find((group) => docId(group) === schoolId);
    const updatedClass = relationGroups.find((group) => docId(group) === classId);
    const classHasStudent = (updatedClass?.studentIds || []).map(String).includes(studentId);
    const classHasSupervisor = (updatedClass?.supervisorIds || []).length > 0;
    const schoolHasStudent = (updatedSchool?.studentIds || []).map(String).includes(studentId);
    addCheck("school and class rosters updated", classHasStudent && classHasSupervisor && schoolHasStudent ? "PASS" : "FAIL", `schoolStudent=${schoolHasStudent}, classStudent=${classHasStudent}, classSupervisor=${classHasSupervisor}`, {
      studentId: short(studentId),
      classId: short(classId),
      updatedClassId: short(docId(updatedClass)),
      classStudentIds: (updatedClass?.studentIds || []).map(short),
      classSupervisorIds: (updatedClass?.supervisorIds || []).map(short),
      schoolStudentIds: (updatedSchool?.studentIds || []).map(short),
      relationGroupCount: relationGroups.length,
    });

    const packagePayload = await request(session, "/content/b2b-packages", {
      method: "POST",
      body: {
        id: `audit_pkg_${suffix}`,
        schoolId,
        name: `Temporary audit package ${suffix}`,
        courseIds: courseId ? [courseId] : [],
        contentTypes: ["foundation", "tests", "mockExams"],
        pathIds: pathId ? [pathId] : [],
        subjectIds: subjectId ? [subjectId] : [],
        type: "free_access",
        maxStudents: 25,
        status: "active",
      },
    });
    const packageId = docId(packagePayload);
    created.packages.push(packageId);
    const packageScoped = packageId && String(packagePayload.schoolId || "") === schoolId && (packagePayload.pathIds || []).map(String).includes(pathId);
    addCheck("create school package with path scope", packageScoped ? "PASS" : "FAIL", `package=${short(packageId)}, path=${short(pathId)}`);

    const codePayload = await request(session, "/content/access-codes", {
      method: "POST",
      body: {
        id: `audit_code_${suffix}`,
        code: `AUDIT-${suffix}`.slice(0, 32),
        schoolId,
        packageId,
        maxUses: 25,
        currentUses: 0,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      },
    });
    const codeId = docId(codePayload);
    created.accessCodes.push(codeId);
    addCheck("create school access code", codeId && String(codePayload.packageId || "") === packageId ? "PASS" : "FAIL", `code=${short(codeId)}, package=${short(codePayload.packageId)}`);

    const reportPayload = await request(session, `/content/schools/${encodeURIComponent(schoolId)}/report?limit=20`);
    const metrics = reportPayload?.metrics || {};
    const reportOk = metrics.totalStudents === 1 && metrics.activeStudents === 1 && metrics.totalClasses >= 1 && metrics.activePackages >= 1 && metrics.activeCodes >= 1;
    addCheck("school report sees new commercial setup", reportOk ? "PASS" : "FAIL", JSON.stringify({
      totalStudents: metrics.totalStudents,
      activeStudents: metrics.activeStudents,
      totalClasses: metrics.totalClasses,
      activePackages: metrics.activePackages,
      activeCodes: metrics.activeCodes,
    }));
  } finally {
    for (const id of created.accessCodes.reverse()) {
      if (id) await cleanupRequest(session, `delete access code ${short(id)}`, `/content/access-codes/${encodeURIComponent(id)}`, { method: "DELETE" });
    }
    for (const id of created.packages.reverse()) {
      if (id) await cleanupRequest(session, `delete package ${short(id)}`, `/content/b2b-packages/${encodeURIComponent(id)}`, { method: "DELETE" });
    }
    for (const id of created.users.reverse()) {
      if (id) await cleanupRequest(session, `delete user ${short(id)}`, `/auth/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
    }
    for (const id of created.groups.reverse()) {
      if (id) await cleanupRequest(session, `delete group ${short(id)}`, `/content/groups/${encodeURIComponent(id)}`, { method: "DELETE" });
    }
  }

  const fail = audit.checks.filter((check) => check.status === "FAIL").length;
  const cleanupReview = audit.cleanup.filter((item) => item.status !== "PASS").length;
  const summary = {
    ...audit,
    total: audit.checks.length,
    pass: audit.checks.filter((check) => check.status === "PASS").length,
    fail,
    cleanupReview,
  };
  fs.writeFileSync(path.join(OUT_DIR, "school-from-scratch-audit.json"), JSON.stringify(summary, null, 2), "utf8");
  fs.writeFileSync(
    path.join(OUT_DIR, "SUMMARY.md"),
    [
      "# School From Scratch Live Audit",
      "",
      `- Generated: ${summary.generatedAt}`,
      `- API: ${summary.apiBaseUrl}`,
      `- PASS: ${summary.pass}`,
      `- FAIL: ${summary.fail}`,
      `- Cleanup review: ${summary.cleanupReview}`,
      "",
      "## Checks",
      ...summary.checks.map((check) => `- [${check.status}] ${check.name}: ${check.note}`),
      "",
      "## Cleanup",
      ...summary.cleanup.map((item) => `- [${item.status}] ${item.label}${item.error ? `: ${item.error}` : ""}`),
    ].join("\n") + "\n",
    "utf8",
  );
  console.log(JSON.stringify({ outDir: OUT_DIR, total: summary.total, pass: summary.pass, fail: summary.fail, cleanupReview: summary.cleanupReview }, null, 2));
  if (fail > 0 || cleanupReview > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
