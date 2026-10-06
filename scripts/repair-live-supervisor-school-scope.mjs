import fs from "node:fs";
import path from "node:path";

const CREDENTIALS_FILE = process.env.ROLE_CREDENTIALS_FILE || path.resolve("audit-artifacts", "ROLE_CREDENTIALS.env");
if (fs.existsSync(CREDENTIALS_FILE)) {
  for (const line of fs.readFileSync(CREDENTIALS_FILE, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length && !process.env[key]) process.env[key] = rest.join("=").trim();
  }
}

const API_BASE_URL = String(process.env.UI_AUDIT_API_BASE_URL || "https://almeaacodax-k2ux.onrender.com/api").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

const SCHOOL_NAME = "مدرسة الريادة - تشغيل";
const QUANT_CLASS_NAME = "مجموعة القدرات الكمي - تشغيل";
const MATH_CLASS_NAME = "مجموعة التحصيلي رياضيات - تشغيل";
const SCHOOL_SUPERVISOR_EMAIL = "supervisor.school@almeaa.local";
const GROUP_SUPERVISOR_EMAIL = "supervisor.group@almeaa.local";

let cookieHeader = "";
let csrfToken = "";

function mergeSetCookie(response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) return;
  const nextCookies = new Map(
    cookieHeader
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [key, ...rest] = item.split("=");
        return [key, rest.join("=")];
      }),
  );

  for (const part of raw.split(/,(?=[^;]+?=)/)) {
    const first = part.split(";")[0]?.trim();
    if (!first || !first.includes("=")) continue;
    const [key, ...rest] = first.split("=");
    nextCookies.set(key, rest.join("="));
  }
  cookieHeader = Array.from(nextCookies.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(auth && cookieHeader ? { cookie: cookieHeader } : {}),
      ...(auth && csrfToken ? { "x-csrf-token": csrfToken } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  mergeSetCookie(response);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${text.slice(0, 500)}`);
  }
  return payload;
}

function documentId(item) {
  return String(item?.id || item?._id || "");
}

function findGroup(groups, name, type, parentId = "") {
  return groups.find((group) => {
    const sameName = String(group?.name || "").trim() === name;
    const sameType = String(group?.type || "") === type;
    const sameParent = !parentId || String(group?.parentId || "") === parentId;
    return sameName && sameType && sameParent;
  });
}

async function authenticate() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Missing admin credentials for supervisor scope repair");
  }
  const csrf = await request("/auth/csrf-token", { auth: false });
  csrfToken = String(csrf?.csrfToken || "");
  await request("/auth/login", {
    method: "POST",
    auth: true,
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
}

async function ensureUser(email, name) {
  const usersPayload = await request(`/auth/admin/users?search=${encodeURIComponent(email)}&limit=10`);
  const existing = (usersPayload.users || []).find((user) => String(user.email || "").toLowerCase() === email.toLowerCase());
  if (existing) return existing;
  const created = await request("/auth/admin/users", {
    method: "POST",
    body: {
      name,
      email,
      password: "Supervisor@123",
      role: "supervisor",
      managedPathIds: [],
      managedSubjectIds: [],
      linkedStudentIds: [],
    },
  });
  return created.user;
}

async function ensureGroup(groups, payload) {
  const existing = findGroup(groups, payload.name, payload.type, payload.parentId || "");
  if (existing) {
    return request(`/content/groups/${documentId(existing)}`, {
      method: "PATCH",
      body: { ...existing, ...payload },
    });
  }
  return request("/content/groups", { method: "POST", body: payload });
}

async function main() {
  await authenticate();
  const admin = (await request("/auth/me")).user;
  const schoolSupervisor = await ensureUser(SCHOOL_SUPERVISOR_EMAIL, "مشرف مدرسة التشغيل");
  const groupSupervisor = await ensureUser(GROUP_SUPERVISOR_EMAIL, "مشرف مجموعة التشغيل");
  const bootstrap = await request("/content/bootstrap?scope=full");
  const groups = bootstrap.groups || [];

  const school = await ensureGroup(groups, {
    name: SCHOOL_NAME,
    type: "SCHOOL",
    ownerId: documentId(admin),
    supervisorIds: [documentId(schoolSupervisor)],
    studentIds: [],
    courseIds: [],
    metadata: {
      description: "مدرسة تشغيلية لفحوصات المشرف والمدارس.",
      settings: { seedScenario: true, liveAuditScope: true },
    },
  });
  const schoolId = documentId(school);

  const refreshed = await request("/content/bootstrap?scope=full");
  const refreshedGroups = refreshed.groups || [];
  const quantClass = await ensureGroup(refreshedGroups, {
    name: QUANT_CLASS_NAME,
    type: "CLASS",
    parentId: schoolId,
    ownerId: documentId(admin),
    supervisorIds: [documentId(groupSupervisor)],
    studentIds: [],
    courseIds: [],
    metadata: {
      description: "فصل تشغيلي لفحص نطاق مشرف المجموعة.",
      settings: { seedScenario: true, liveAuditScope: true },
    },
  });
  const mathClass = await ensureGroup(refreshedGroups, {
    name: MATH_CLASS_NAME,
    type: "CLASS",
    parentId: schoolId,
    ownerId: documentId(admin),
    supervisorIds: [documentId(schoolSupervisor)],
    studentIds: [],
    courseIds: [],
    metadata: {
      description: "فصل تشغيلي لفحص نطاق مشرف المدرسة.",
      settings: { seedScenario: true, liveAuditScope: true },
    },
  });

  await request(`/auth/admin/users/${documentId(schoolSupervisor)}`, {
    method: "PATCH",
    body: {
      schoolId,
      groupIds: [schoolId, documentId(mathClass)],
      role: "supervisor",
      isActive: true,
    },
  });
  await request(`/auth/admin/users/${documentId(groupSupervisor)}`, {
    method: "PATCH",
    body: {
      schoolId,
      groupIds: [schoolId, documentId(quantClass)],
      role: "supervisor",
      isActive: true,
      managedPathIds: ["p_qudrat"],
      managedSubjectIds: ["sub_quant"],
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        apiBaseUrl: API_BASE_URL,
        school: { id: schoolId, name: school.name },
        classes: [
          { id: documentId(quantClass), name: quantClass.name },
          { id: documentId(mathClass), name: mathClass.name },
        ],
        supervisors: [
          { email: schoolSupervisor.email, id: documentId(schoolSupervisor), scope: "school" },
          { email: groupSupervisor.email, id: documentId(groupSupervisor), scope: "school-and-class" },
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
