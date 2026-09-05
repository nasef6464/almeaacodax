import fs from "node:fs";

const files = {
  auth: "server/src/routes/auth.routes.ts",
  users: "dashboards/admin/UsersManager.tsx",
  live: "scripts/live-supervisor-school-command-audit.mjs",
  smoke: "scripts/smoke-admin-user-role-transition-contract.mjs",
};

const read = (file) => fs.readFileSync(file, "utf8");
const write = (file, content) => fs.writeFileSync(file, content, "utf8");
const replaceOnce = (source, before, after, label) => {
  if (source.includes(after)) return source;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one source match, found ${count}`);
  return source.replace(before, after);
};

let auth = read(files.auth);
auth = replaceOnce(
  auth,
  '    const targetUser = await UserModel.findOne(buildDocumentQuery(targetId)).select("role");',
  '    const targetUser = await UserModel.findOne(buildDocumentQuery(targetId)).select("role schoolId groupIds");',
  "load role-transition scope",
);
auth = replaceOnce(
  auth,
  '    const nextPayload: Record<string, unknown> = { ...payload };\n    const effectiveRole = String(payload.role || targetUser.role || "").trim();',
  '    const nextPayload: Record<string, unknown> = { ...payload };\n    const previousRole = String(targetUser.role || "").trim();\n    const effectiveRole = String(payload.role || targetUser.role || "").trim();\n    const roleChanged = Boolean(payload.role && effectiveRole !== previousRole);\n\n    // School/group membership is role-specific. Never inherit a Student or Supervisor\n    // relationship into a different role; the Admin must explicitly assign the new scope.\n    if (roleChanged) {\n      nextPayload.schoolId = null;\n      nextPayload.groupIds = [];\n    }',
  "normalize role-transition user scope",
);
auth = replaceOnce(
  auth,
  '    const updated = await UserModel.findOneAndUpdate(buildDocumentQuery(targetId), nextPayload, { new: true });',
  '    if (roleChanged) {\n      const membershipUserId = String(targetUser.id || targetUser._id || targetId);\n      const staleMembershipUpdates = [];\n      if (previousRole === "student") {\n        staleMembershipUpdates.push(\n          GroupModel.updateMany({ studentIds: membershipUserId }, { $pull: { studentIds: membershipUserId } }),\n        );\n      }\n      if (previousRole === "supervisor") {\n        staleMembershipUpdates.push(\n          GroupModel.updateMany({ supervisorIds: membershipUserId }, { $pull: { supervisorIds: membershipUserId } }),\n        );\n      }\n      if (staleMembershipUpdates.length > 0) {\n        await Promise.all(staleMembershipUpdates);\n      }\n    }\n\n    const updated = await UserModel.findOneAndUpdate(buildDocumentQuery(targetId), nextPayload, { new: true });',
  "remove stale role memberships",
);
write(files.auth, auth);

let users = read(files.users);
users = replaceOnce(
  users,
  '    const handleRoleChange = (userId: string, newRole: Role) => updateUser(userId, { role: newRole });',
  `    const handleRoleChange = (currentUser: User, newRole: Role) => {\n        if (currentUser.role === newRole) return;\n        setRelationshipActionUserId(currentUser.id);\n        setRelationshipActionError('');\n        void api.updateAdminUser(currentUser.id, { role: newRole })\n            .then((response) => {\n                const persistedPayload = (response as { user?: AdminUserPayload })?.user;\n                if (!persistedPayload) throw new Error('لم يُرجع الخادم بيانات المستخدم بعد تغيير الدور.');\n                const persistedUser = buildStoreUser(persistedPayload);\n                hydrateUsers(users.map((item) => item.id === currentUser.id ? persistedUser : item));\n            })\n            .catch((error) => {\n                const message = error instanceof Error ? error.message : 'تعذر تغيير دور المستخدم الآن.';\n                console.error('Failed to persist user role change:', error);\n                setRelationshipActionError(message);\n                window.alert(message);\n            })\n            .finally(() => {\n                setRelationshipActionUserId((current) => current === currentUser.id ? null : current);\n            });\n    };`,
  "persist role transition before repaint",
);
users = replaceOnce(
  users,
  'value={currentUser.role} onChange={(event) => handleRoleChange(currentUser.id, event.target.value as Role)}',
  'disabled={isSavingRelationship} value={currentUser.role} onChange={(event) => handleRoleChange(currentUser, event.target.value as Role)}',
  "wire persisted role change",
);
write(files.users, users);

let live = read(files.live);
const journeyFunction = `\nasync function verifyAdminUserRoleRelationshipJourney(page) {\n  const adminEmail = process.env.ROLE_ADMIN_EMAIL || process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_EMAIL;\n  const adminPassword = process.env.ROLE_ADMIN_PASSWORD || process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;\n  const targetEmail = process.env.ROLE_STUDENT_EMAIL || process.env.SMOKE_STUDENT_EMAIL || "student.a@almeaa.local";\n  if (!adminEmail || !adminPassword) throw new Error("Missing admin credentials for user relationship journey");\n\n  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });\n  const loginResult = await page.evaluate(async ({ apiBaseUrl, email, password }) => {\n    const csrfResponse = await fetch(\`${'${apiBaseUrl}'}/auth/csrf-token\`, { credentials: "include", cache: "no-store" });\n    const csrfPayload = await csrfResponse.json().catch(() => ({}));\n    const csrfToken = csrfPayload?.csrfToken || "";\n    const loginResponse = await fetch(\`${'${apiBaseUrl}'}/auth/login\`, {\n      method: "POST", credentials: "include",\n      headers: { "content-type": "application/json", "x-csrf-token": csrfToken },\n      body: JSON.stringify({ email, password }),\n    });\n    const payload = await loginResponse.json().catch(() => ({}));\n    if (!loginResponse.ok) return { ok: false, status: loginResponse.status, message: payload?.message || "" };\n    const user = payload?.user;\n    sessionStorage.setItem("the-hundred-auth-profile", JSON.stringify({\n      id: String(user?.id || user?._id || user?.email || ""),\n      email: user?.email || "", displayName: user?.name || "", photoURL: user?.avatar || "", role: user?.role || "",\n    }));\n    if (csrfToken) sessionStorage.setItem("almeaa:csrf-token", csrfToken);\n    return { ok: true, role: user?.role };\n  }, { apiBaseUrl: API_BASE_URL, email: adminEmail, password: adminPassword });\n  if (!loginResult.ok || loginResult.role !== "admin") throw new Error(\`Admin login failed for user relationship journey: ${'${JSON.stringify(loginResult)}'}\`);\n\n  const readPersistedState = async () => page.evaluate(async ({ apiBaseUrl, targetEmail }) => {\n    const csrfResponse = await fetch(\`${'${apiBaseUrl}'}/auth/csrf-token\`, { credentials: "include", cache: "no-store" });\n    const csrfPayload = await csrfResponse.json().catch(() => ({}));\n    const csrfToken = csrfPayload?.csrfToken || "";\n    if (csrfToken) sessionStorage.setItem("almeaa:csrf-token", csrfToken);\n    const [usersResponse, groupsResponse] = await Promise.all([\n      fetch(\`${'${apiBaseUrl}'}/auth/admin/users?search=${'${encodeURIComponent(targetEmail)}'}&page=1&limit=20\`, { credentials: "include", cache: "no-store" }),\n      fetch(\`${'${apiBaseUrl}'}/content/groups\`, { credentials: "include", cache: "no-store" }),\n    ]);\n    const usersPayload = await usersResponse.json().catch(() => ({}));\n    const groupsPayload = await groupsResponse.json().catch(() => ([]));\n    const user = (usersPayload?.users || []).find((item) => String(item.email || "").toLowerCase() === targetEmail.toLowerCase());\n    const groups = Array.isArray(groupsPayload) ? groupsPayload : (groupsPayload?.groups || []);\n    return { user, groups, usersStatus: usersResponse.status, groupsStatus: groupsResponse.status };\n  }, { apiBaseUrl: API_BASE_URL, targetEmail });\n\n  const before = await readPersistedState();\n  if (!before.user || before.user.role !== "student") throw new Error(\`Expected seeded student before role transition: ${'${JSON.stringify(before.user)}'}\`);\n  const targetId = String(before.user.id || before.user._id || "");\n  const hadStudentMembership = before.groups.some((group) => Array.isArray(group.studentIds) && group.studentIds.map(String).includes(targetId));\n  if (!hadStudentMembership) throw new Error("Seeded target student has no Group.studentIds membership to prove cleanup");\n\n  await page.goto(\`${'${BASE_URL}'}/admin-dashboard?tab=users\`, { waitUntil: "domcontentloaded", timeout: 60000 });\n  const search = page.getByPlaceholder("ابحث بالاسم أو البريد الإلكتروني...");\n  await search.waitFor({ state: "visible", timeout: 15000 });\n  await search.fill(targetEmail);\n  await page.waitForTimeout(700);\n\n  let row = page.locator("tbody tr").filter({ hasText: targetEmail }).first();\n  await row.waitFor({ state: "visible", timeout: 15000 });\n  await row.locator("button").nth(1).click();\n  const roleSelect = row.locator("select").first();\n  await roleSelect.selectOption("supervisor");\n  await page.waitForFunction((email) => {\n    const rows = Array.from(document.querySelectorAll("tbody tr"));\n    const row = rows.find((item) => (item.textContent || "").includes(email));\n    const select = row?.querySelector("select");\n    return select instanceof HTMLSelectElement && select.value === "supervisor" && !select.disabled;\n  }, targetEmail, { timeout: 15000 });\n\n  row = page.locator("tbody tr").filter({ hasText: targetEmail }).first();\n  const supervisorGroups = row.locator("select[multiple]").first();\n  await supervisorGroups.waitFor({ state: "visible", timeout: 10000 });\n  const options = await supervisorGroups.locator("option").evaluateAll((nodes) => nodes.map((node) => ({ value: node.value, label: node.textContent || "" })));\n  const school = options.find((option) => option.label.startsWith("مدرسة -"));\n  const klass = options.find((option) => option.label.startsWith("فصل -"));\n  if (!school || !klass) throw new Error(\`Missing school/class options for supervisor assignment: ${'${JSON.stringify(options)}'}\`);\n  await supervisorGroups.selectOption([school.value, klass.value]);\n  await page.waitForTimeout(1000);\n\n  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });\n  const searchAfterReload = page.getByPlaceholder("ابحث بالاسم أو البريد الإلكتروني...");\n  await searchAfterReload.waitFor({ state: "visible", timeout: 15000 });\n  await searchAfterReload.fill(targetEmail);\n  await page.waitForTimeout(700);\n  row = page.locator("tbody tr").filter({ hasText: targetEmail }).first();\n  await row.waitFor({ state: "visible", timeout: 15000 });\n  await row.locator("button").nth(1).click();\n  const reloadedRole = await row.locator("select").first().inputValue();\n  const reloadedGroups = await row.locator("select[multiple]").first().evaluate((select) =>\n    Array.from(select.selectedOptions).map((option) => option.value),\n  );\n  if (reloadedRole !== "supervisor") throw new Error(\`Role did not persist after reload: ${'${reloadedRole}'}\`);\n  if (!reloadedGroups.includes(school.value) || !reloadedGroups.includes(klass.value)) {\n    throw new Error(\`Supervisor school/class assignment did not persist after reload: ${'${JSON.stringify(reloadedGroups)}'}\`);\n  }\n\n  const after = await readPersistedState();\n  const afterId = String(after.user?.id || after.user?._id || "");\n  if (!after.user || after.user.role !== "supervisor") throw new Error("Persisted user role is not supervisor");\n  if ((after.user.groupIds || []).some((id) => ![school.value, klass.value].includes(String(id))) || ![school.value, klass.value].every((id) => (after.user.groupIds || []).map(String).includes(id))) {\n    throw new Error(\`Persisted supervisor groupIds mismatch: ${'${JSON.stringify(after.user.groupIds || [])}'}\`);\n  }\n  if (after.groups.some((group) => Array.isArray(group.studentIds) && group.studentIds.map(String).includes(afterId))) {\n    throw new Error("Stale Group.studentIds membership survived Student → Supervisor transition");\n  }\n  for (const groupId of [school.value, klass.value]) {\n    const group = after.groups.find((item) => String(item.id || item._id || "") === groupId);\n    if (!group || !Array.isArray(group.supervisorIds) || !group.supervisorIds.map(String).includes(afterId)) {\n      throw new Error(\`Supervisor membership missing from assigned group ${'${groupId}'}\`);\n    }\n  }\n\n  return { status: "PASS", targetEmail, targetId: afterId, assignedGroupIds: [school.value, klass.value] };\n}\n`;
live = replaceOnce(live, "\nasync function main() {", `${journeyFunction}\nasync function main() {`, "add admin user relationship journey");
live = replaceOnce(
  live,
  "  const results = [];\n  let loginResult = null;",
  "  const results = [];\n  let loginResult = null;\n  let adminUserRoleRelationship = null;",
  "track admin user relationship result",
);
live = replaceOnce(
  live,
  "    for (const viewport of VIEWPORTS) {\n      for (const routeSpec of ROUTES) {\n        results.push(await inspectRoute(page, viewport, routeSpec));\n      }\n    }",
  "    for (const viewport of VIEWPORTS) {\n      for (const routeSpec of ROUTES) {\n        results.push(await inspectRoute(page, viewport, routeSpec));\n      }\n    }\n    adminUserRoleRelationship = await verifyAdminUserRoleRelationshipJourney(page);",
  "execute admin user relationship journey",
);
live = replaceOnce(
  live,
  "    login: loginResult,\n    total: results.length,",
  "    login: loginResult,\n    adminUserRoleRelationship,\n    total: results.length,",
  "report admin user relationship journey",
);
write(files.live, live);

const smoke = `import fs from "node:fs";\n\nconst read = (file) => fs.readFileSync(file, "utf8");\nconst auth = read("server/src/routes/auth.routes.ts");\nconst users = read("dashboards/admin/UsersManager.tsx");\nconst live = read("scripts/live-supervisor-school-command-audit.mjs");\nconst required = (source, fragments, label) => {\n  for (const fragment of fragments) {\n    if (!source.includes(fragment)) throw new Error(\`${'${label}'} missing contract fragment: ${'${fragment}'}\`);\n  }\n};\n\nrequired(auth, [\n  'select("role schoolId groupIds")',\n  'const roleChanged = Boolean(payload.role && effectiveRole !== previousRole);',\n  'nextPayload.schoolId = null;',\n  'nextPayload.groupIds = [];',\n  'GroupModel.updateMany({ studentIds: membershipUserId }, { $pull: { studentIds: membershipUserId } })',\n  'GroupModel.updateMany({ supervisorIds: membershipUserId }, { $pull: { supervisorIds: membershipUserId } })',\n], "auth role transition");\nrequired(users, [\n  'api.updateAdminUser(currentUser.id, { role: newRole })',\n  'const persistedUser = buildStoreUser(persistedPayload);',\n  'handleRoleChange(currentUser, event.target.value as Role)',\n], "UsersManager role transition");\nrequired(live, [\n  'verifyAdminUserRoleRelationshipJourney',\n  'Stale Group.studentIds membership survived Student → Supervisor transition',\n  'Supervisor school/class assignment did not persist after reload',\n], "live role relationship journey");\nconsole.log("Admin user role transition contract: PASS");\n`;
write(files.smoke, smoke);

console.log("Applied bounded Admin user role-transition + school/class relationship patch.");
