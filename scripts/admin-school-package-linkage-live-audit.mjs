import fs from "node:fs";
import path from "node:path";

const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const RUN_ID = process.env.ADMIN_PACKAGE_LINKAGE_RUN_ID || `admin-package-linkage-${new Date().toISOString().replace(/[:.]/g, "-")}`;
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

const adminEmail = process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
const adminPassword = process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

const audit = {
  generatedAt: new Date().toISOString(),
  runId: RUN_ID,
  apiBaseUrl: API_BASE_URL,
  checks: [],
  restored: [],
  blocked: [],
};

const docId = (item) => String(item?.id || item?._id || "").trim();
const unique = (items) => Array.from(new Set((items || []).map(String).filter(Boolean)));
const sameSet = (a, b) => {
  const left = unique(a).sort();
  const right = unique(b).sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
};
const shortId = (value) => {
  const text = String(value || "");
  return text.length > 8 ? `...${text.slice(-8)}` : text;
};
const addCheck = (name, status, note = "", meta = {}) => audit.checks.push({ name, status, note, meta });

function extractCookie(setCookieHeader, cookieName) {
  return String(setCookieHeader || "").match(new RegExp(`${cookieName}=([^;]+)`))?.[1] || "";
}

async function login() {
  if (!adminEmail || !adminPassword) throw new Error("Missing admin credentials");

  const csrfRes = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
    headers: { Accept: "application/json" },
  });
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
  if (!token) throw new Error("Login succeeded but no auth token was returned");
  return { token, csrfToken, csrfCookie };
}

async function request(session, url, options = {}) {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json", "x-csrf-token": session.csrfToken } : {}),
      Authorization: `Bearer ${session.token}`,
      ...(session.csrfCookie ? { Cookie: `almeaa_csrf_token=${session.csrfCookie}` } : {}),
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

async function loadState(session) {
  const [bootstrap, coursesPayload] = await Promise.all([
    request(session, "/content/bootstrap?scope=full"),
    request(session, "/courses?limit=200"),
  ]);
  return {
    groups: Array.isArray(bootstrap?.groups) ? bootstrap.groups : [],
    packages: Array.isArray(bootstrap?.b2bPackages) ? bootstrap.b2bPackages : [],
    accessCodes: Array.isArray(bootstrap?.accessCodes) ? bootstrap.accessCodes : [],
    courses: Array.isArray(coursesPayload?.courses) ? coursesPayload.courses : [],
  };
}

async function patchGroup(session, groupId, data) {
  return request(session, `/content/groups/${encodeURIComponent(groupId)}`, {
    method: "PATCH",
    body: data,
  });
}

async function patchPackage(session, packageId, data) {
  return request(session, `/content/b2b-packages/${encodeURIComponent(packageId)}`, {
    method: "PATCH",
    body: data,
  });
}

async function verifySchoolPackageLinkage(session, state) {
  const courses = state.courses.map(docId).filter(Boolean);
  const packages = state.packages.filter((pkg) => docId(pkg) && String(pkg.schoolId || "").trim());
  const schools = state.groups.filter((group) => group.type === "SCHOOL");

  if (!courses.length || !packages.length || !schools.length) {
    addCheck("school package prerequisites", "BLOCKED", "missing courses, packages, or schools", {
      courses: courses.length,
      packages: packages.length,
      schools: schools.length,
    });
    return;
  }

  let target = null;
  for (const pkg of packages) {
    const school = schools.find((group) => docId(group) === String(pkg.schoolId || ""));
    if (school) {
      target = { pkg, school };
      break;
    }
  }

  if (!target) {
    addCheck("school package target", "BLOCKED", "no package matched an existing school");
    return;
  }

  const packageId = docId(target.pkg);
  const schoolId = docId(target.school);
  const originalPackageCourseIds = unique(target.pkg.courseIds);
  const originalSchoolCourseIds = unique(target.school.courseIds);
  const addCourseId = courses.find((courseId) => !originalPackageCourseIds.includes(courseId));
  const mode = addCourseId ? "add-and-restore" : "remove-and-restore";
  const testedCourseId = addCourseId || originalPackageCourseIds[0];

  if (!testedCourseId) {
    addCheck("school package course linkage", "BLOCKED", "package has no course and no course is available");
    return;
  }

  let schoolTouched = false;
  try {
    if (mode === "add-and-restore" && !originalSchoolCourseIds.includes(testedCourseId)) {
      await patchGroup(session, schoolId, {
        courseIds: unique([...originalSchoolCourseIds, testedCourseId]),
        totalCourses: unique([...originalSchoolCourseIds, testedCourseId]).length,
      });
      schoolTouched = true;
    }

    const nextPackageCourseIds =
      mode === "add-and-restore"
        ? unique([...originalPackageCourseIds, testedCourseId])
        : originalPackageCourseIds.filter((courseId) => courseId !== testedCourseId);
    await patchPackage(session, packageId, { courseIds: nextPackageCourseIds });

    const afterPatch = await loadState(session);
    const patchedPackage = afterPatch.packages.find((pkg) => docId(pkg) === packageId);
    const patchedSchool = afterPatch.groups.find((group) => docId(group) === schoolId);
    const packageVerified = sameSet(patchedPackage?.courseIds, nextPackageCourseIds);
    const schoolVerified = mode === "remove-and-restore" || unique(patchedSchool?.courseIds).includes(testedCourseId);

    addCheck(
      "school package course selection persists",
      packageVerified && schoolVerified ? "PASS" : "FAIL",
      `mode=${mode}, packageVerified=${packageVerified}, schoolVerified=${schoolVerified}`,
      {
        schoolId: shortId(schoolId),
        packageId: shortId(packageId),
        testedCourseId: shortId(testedCourseId),
        originalPackageCourses: originalPackageCourseIds.length,
        patchedPackageCourses: nextPackageCourseIds.length,
      },
    );

    const codesPayload = await request(session, `/content/access-codes?packageId=${encodeURIComponent(packageId)}&limit=5`);
    const codeRows = Array.isArray(codesPayload?.data) ? codesPayload.data : [];
    const filterValid = codeRows.every((code) => String(code.packageId || "") === packageId);
    addCheck("school package access-code filter", filterValid ? "PASS" : "FAIL", `rows=${codeRows.length}`);

    const reportPayload = await request(session, `/content/schools/${encodeURIComponent(schoolId)}/report?limit=10`);
    const metrics = reportPayload?.metrics || {};
    addCheck("school package report metrics", typeof metrics.activePackages === "number" ? "PASS" : "FAIL", "school report returned package metrics", {
      activePackages: metrics.activePackages,
      activeCodes: metrics.activeCodes,
    });
  } finally {
    await patchPackage(session, packageId, { courseIds: originalPackageCourseIds }).catch((error) => {
      audit.blocked.push({ restore: "package", id: shortId(packageId), error: error.message });
    });
    audit.restored.push({ type: "package", id: shortId(packageId), field: "courseIds", count: originalPackageCourseIds.length });

    if (schoolTouched) {
      await patchGroup(session, schoolId, {
        courseIds: originalSchoolCourseIds,
        totalCourses: originalSchoolCourseIds.length,
      }).catch((error) => {
        audit.blocked.push({ restore: "school", id: shortId(schoolId), error: error.message });
      });
      audit.restored.push({ type: "school", id: shortId(schoolId), field: "courseIds", count: originalSchoolCourseIds.length });
    }

    const restored = await loadState(session);
    const restoredPackage = restored.packages.find((pkg) => docId(pkg) === packageId);
    const restoredSchool = restored.groups.find((group) => docId(group) === schoolId);
    const packageRestored = sameSet(restoredPackage?.courseIds, originalPackageCourseIds);
    const schoolRestored = sameSet(restoredSchool?.courseIds, originalSchoolCourseIds);
    addCheck("school package temporary change restored", packageRestored && schoolRestored ? "PASS" : "FAIL", `packageRestored=${packageRestored}, schoolRestored=${schoolRestored}`);
  }
}

async function verifyGroupCourseLinkage(session, state) {
  const courses = state.courses.map(docId).filter(Boolean);
  const groups = state.groups.filter((group) => group.type === "CLASS" || group.type === "PRIVATE_GROUP");

  if (!courses.length || !groups.length) {
    addCheck("group course prerequisites", "BLOCKED", "missing courses or groups", {
      courses: courses.length,
      groups: groups.length,
    });
    return;
  }

  const targetGroup =
    groups.find((group) => courses.some((courseId) => !unique(group.courseIds).includes(courseId))) || groups[0];
  const groupId = docId(targetGroup);
  const originalCourseIds = unique(targetGroup.courseIds);
  const addCourseId = courses.find((courseId) => !originalCourseIds.includes(courseId));
  const mode = addCourseId ? "add-and-restore" : "remove-and-restore";
  const testedCourseId = addCourseId || originalCourseIds[0];

  if (!groupId || !testedCourseId) {
    addCheck("group course selection", "BLOCKED", "no editable group/course target");
    return;
  }

  try {
    const nextCourseIds =
      mode === "add-and-restore"
        ? unique([...originalCourseIds, testedCourseId])
        : originalCourseIds.filter((courseId) => courseId !== testedCourseId);
    await patchGroup(session, groupId, { courseIds: nextCourseIds, totalCourses: nextCourseIds.length });

    const afterPatch = await loadState(session);
    const patchedGroup = afterPatch.groups.find((group) => docId(group) === groupId);
    const groupVerified = sameSet(patchedGroup?.courseIds, nextCourseIds);
    addCheck("group course selection persists", groupVerified ? "PASS" : "FAIL", `mode=${mode}, groupVerified=${groupVerified}`, {
      groupId: shortId(groupId),
      testedCourseId: shortId(testedCourseId),
      originalCourses: originalCourseIds.length,
      patchedCourses: nextCourseIds.length,
    });
  } finally {
    await patchGroup(session, groupId, { courseIds: originalCourseIds, totalCourses: originalCourseIds.length }).catch((error) => {
      audit.blocked.push({ restore: "group", id: shortId(groupId), error: error.message });
    });
    audit.restored.push({ type: "group", id: shortId(groupId), field: "courseIds", count: originalCourseIds.length });

    const restored = await loadState(session);
    const restoredGroup = restored.groups.find((group) => docId(group) === groupId);
    const groupRestored = sameSet(restoredGroup?.courseIds, originalCourseIds);
    addCheck("group course temporary change restored", groupRestored ? "PASS" : "FAIL", `groupRestored=${groupRestored}`);
  }
}

async function main() {
  const session = await login();
  const state = await loadState(session);

  addCheck("admin operational data loaded", "PASS", "loaded groups, packages, codes, and courses", {
    groups: state.groups.length,
    packages: state.packages.length,
    accessCodes: state.accessCodes.length,
    courses: state.courses.length,
  });

  await verifySchoolPackageLinkage(session, state);
  const refreshed = await loadState(session);
  await verifyGroupCourseLinkage(session, refreshed);

  const summary = {
    ...audit,
    total: audit.checks.length,
    pass: audit.checks.filter((check) => check.status === "PASS").length,
    fail: audit.checks.filter((check) => check.status === "FAIL").length,
    blockedCount: audit.checks.filter((check) => check.status === "BLOCKED").length + audit.blocked.length,
  };

  fs.writeFileSync(path.join(OUT_DIR, "admin-school-package-linkage-live-audit.json"), JSON.stringify(summary, null, 2), "utf8");
  const lines = [
    "# Admin School Package Linkage Live Audit",
    "",
    `- Generated: ${summary.generatedAt}`,
    `- API: ${summary.apiBaseUrl}`,
    `- Total: ${summary.total}`,
    `- PASS: ${summary.pass}`,
    `- FAIL: ${summary.fail}`,
    `- BLOCKED: ${summary.blockedCount}`,
    `- Restored changes: ${summary.restored.length}`,
    "",
    "## Checks",
    ...summary.checks.map((check) => `- ${check.status}: ${check.name}${check.note ? ` - ${check.note}` : ""}`),
    "",
    "## Restore",
    ...summary.restored.map((item) => `- restored ${item.type} ${item.id} ${item.field} count=${item.count}`),
  ];
  fs.writeFileSync(path.join(OUT_DIR, "SUMMARY.md"), `${lines.join("\n")}\n`, "utf8");

  console.log(JSON.stringify({ outDir: OUT_DIR, total: summary.total, pass: summary.pass, fail: summary.fail, blocked: summary.blockedCount }, null, 2));
  if (summary.fail > 0 || summary.blocked.length > 0) process.exit(1);
}

main().catch((error) => {
  audit.blocked.push({ step: "main", error: error.message });
  fs.writeFileSync(path.join(OUT_DIR, "admin-school-package-linkage-live-audit.json"), JSON.stringify(audit, null, 2), "utf8");
  console.error(error.message);
  process.exit(1);
});
