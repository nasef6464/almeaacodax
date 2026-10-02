import { API_BASE } from "./helpers.mjs";
import fs from "fs";

if (fs.existsSync("server/.env")) {
  const envContent = fs.readFileSync("server/.env", "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

const csrfRes = await fetch(`${API_BASE}/auth/csrf-token`);
const csrfCookie = (csrfRes.headers.get("set-cookie")?.match(/almeaa_csrf_token=([^;]+)/) || [])[1] || "";
const csrfData = await csrfRes.json();
const csrfToken = csrfData.csrfToken || csrfCookie;

const loginRes = await fetch(`${API_BASE}/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-csrf-token": csrfToken,
    Cookie: `almeaa_csrf_token=${csrfCookie}`,
  },
  body: JSON.stringify({ email: adminEmail, password: adminPassword }),
});

const loginData = await loginRes.json();
const adminId = loginData.user.id || loginData.user._id;
console.log("Logged in Admin ID:", adminId);

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${loginData.token}`,
  "x-csrf-token": csrfToken,
  "Cookie": `almeaa_access_token=${loginData.token}; almeaa_csrf_token=${csrfCookie}`,
};

// 1. Create ALMEAA UAT School
const schoolPayload = {
  name: "ALMEAA UAT School",
  type: "SCHOOL",
  ownerId: adminId,
  supervisorIds: [],
  studentIds: [],
  courseIds: [],
  metadata: {
    code: "UAT-2026-ALMEAA-01",
    city: "الرياض",
    curriculum: "المنهج السعودي",
    status: "active",
  },
};

console.log("Creating School with valid payload...");
const schoolRes = await fetch(`${API_BASE}/content/groups`, {
  method: "POST",
  headers,
  body: JSON.stringify(schoolPayload),
});
console.log("School creation status:", schoolRes.status);
const schoolData = await schoolRes.json();
console.log("School created:", schoolData);
const schoolId = schoolData.id || schoolData._id;

// 2. Create Classes
const classes = ["UAT Class 101", "UAT Class 102", "UAT Class 201"];
const createdClasses = {};
for (const c of classes) {
  const classRes = await fetch(`${API_BASE}/content/groups`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: c,
      type: "CLASS",
      parentId: schoolId,
      ownerId: adminId,
      supervisorIds: [],
      studentIds: [],
      courseIds: [],
    }),
  });
  const classData = await classRes.json();
  console.log(`Class created (${c}): status ${classRes.status}`, classData.id || classData._id);
  createdClasses[c] = classData.id || classData._id;
}

// 3. Upsert Users
const PERSONAS = [
  { name: "UAT Supervisor", email: "uat.supervisor@almeaa.local", role: "supervisor", schoolId, groupIds: [schoolId] },
  { name: "UAT Math Teacher", email: "uat.teacher.math@almeaa.local", role: "teacher", schoolId, groupIds: [createdClasses["UAT Class 101"], createdClasses["UAT Class 102"]], subject: "Math" },
  { name: "UAT Verbal Teacher", email: "uat.teacher.verbal@almeaa.local", role: "teacher", schoolId, groupIds: [createdClasses["UAT Class 101"], createdClasses["UAT Class 102"]], subject: "Verbal" },
  { name: "UAT Tahsili Teacher", email: "uat.teacher.tahsili@almeaa.local", role: "teacher", schoolId, groupIds: [createdClasses["UAT Class 201"]], subject: "Tahsili" },
  { name: "UAT Student 01", email: "uat.student01@almeaa.local", role: "student", schoolId, groupIds: [createdClasses["UAT Class 101"]] },
  { name: "UAT Student 02", email: "uat.student02@almeaa.local", role: "student", schoolId, groupIds: [createdClasses["UAT Class 101"]] },
  { name: "UAT Student 03", email: "uat.student03@almeaa.local", role: "student", schoolId, groupIds: [createdClasses["UAT Class 102"]] },
  { name: "UAT Student 04", email: "uat.student04@almeaa.local", role: "student", schoolId, groupIds: [createdClasses["UAT Class 102"]] },
  { name: "UAT Student 05", email: "uat.student05@almeaa.local", role: "student", schoolId, groupIds: [createdClasses["UAT Class 201"]] },
  { name: "UAT Independent Student", email: "uat.independent@almeaa.local", role: "student", schoolId: null, groupIds: [] },
];

for (const p of PERSONAS) {
  const userRes = await fetch(`${API_BASE}/auth/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: p.name,
      email: p.email,
      password: "UatPass@2026",
      role: p.role,
      schoolId: p.schoolId,
      groupIds: p.groupIds,
    }),
  });
  console.log(`Synced user ${p.name} (${p.email}): status ${userRes.status}`);
}

// 4. Create Contract
const contractRes = await fetch(`${API_BASE}/school-access/contracts`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    schoolId,
    status: "active",
    modules: ["core", "assessments", "smart_classroom", "reports"],
  }),
});
console.log("Contract status:", contractRes.status);
