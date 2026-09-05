import { readFile, writeFile } from 'node:fs/promises';

const files = {
  builder: new URL('../dashboards/admin/UnifiedQuizBuilder.tsx', import.meta.url),
  dashboard: new URL('../dashboards/admin/SupervisorDashboard.tsx', import.meta.url),
  quizModel: new URL('../server/src/models/Quiz.ts', import.meta.url),
  contract: new URL('./smoke-supervisor-dashboard-contract.mjs', import.meta.url),
  audit: new URL('./live-assessment-commercial-audit.mjs', import.meta.url),
};

async function replaceExact(path, before, after, label) {
  const source = await readFile(path, 'utf8');
  if (source.includes(after)) return false;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one source block, found ${count}`);
  await writeFile(path, source.replace(before, after), 'utf8');
  return true;
}

let changed = false;

changed = (await replaceExact(
  files.builder,
  `import React, { useState, useMemo, useEffect } from "react";`,
  `import React, { useState, useMemo, useEffect, useRef } from "react";`,
  'UnifiedQuizBuilder target group ref import',
)) || changed;

changed = (await replaceExact(
  files.builder,
  `  const [targetGroupIds, setTargetGroupIds] = useState<string[]>(editingQuiz?.targetGroupIds ?? initialTargetGroupIds ?? []);\n  const [targetUserIds] = useState<string[]>(editingQuiz?.targetUserIds ?? initialTargetUserIds ?? []);`,
  `  const initialTargetGroups = editingQuiz?.targetGroupIds ?? initialTargetGroupIds ?? [];\n  const [targetGroupIds, setTargetGroupIds] = useState<string[]>(initialTargetGroups);\n  const targetGroupIdsRef = useRef<string[]>(initialTargetGroups);\n  const [targetUserIds] = useState<string[]>(editingQuiz?.targetUserIds ?? initialTargetUserIds ?? []);`,
  'UnifiedQuizBuilder target group ref state',
)) || changed;

changed = (await replaceExact(
  files.builder,
  `        targetGroupIds,\n        targetUserIds,`,
  `        targetGroupIds: targetGroupIdsRef.current,\n        targetUserIds,`,
  'UnifiedQuizBuilder target group save payload',
)) || changed;

changed = (await replaceExact(
  files.builder,
  `onChange={(e) => {\n                          if (e.target.checked) setTargetGroupIds([...targetGroupIds, g.id]);\n                          else setTargetGroupIds(targetGroupIds.filter((id) => id !== g.id));\n                        }}`,
  `onChange={(e) => {\n                          const checked = e.target.checked;\n                          setTargetGroupIds((current) => checked\n                            ? Array.from(new Set([...current, g.id]))\n                            : current.filter((id) => id !== g.id));\n                        }}`,
  'UnifiedQuizBuilder target group state',
)) || changed;

changed = (await replaceExact(
  files.builder,
  `onChange={(e) => {\n                          const checked = e.target.checked;\n                          setTargetGroupIds((current) => checked\n                            ? Array.from(new Set([...current, g.id]))\n                            : current.filter((id) => id !== g.id));\n                        }}`,
  `onChange={(e) => {\n                          const checked = e.target.checked;\n                          const next = checked\n                            ? Array.from(new Set([...targetGroupIdsRef.current, g.id]))\n                            : targetGroupIdsRef.current.filter((id) => id !== g.id);\n                          targetGroupIdsRef.current = next;\n                          setTargetGroupIds(next);\n                        }}`,
  'UnifiedQuizBuilder synchronous target group selection',
)) || changed;

changed = (await replaceExact(
  files.dashboard,
  `await apiService.sendNotifications({\n                        title: 'اختبار جديد من مشرفك',\n                        body: config.message || \`تم تكليفك باختبار: \${pickedQuiz.title}\`,\n                        channels: ['in_app'],\n                        userIds: [assignToStudentId],\n                        variables: { link: '/dashboard?tab=quizzes' },\n                      });`,
  `await apiService.sendStudentAlert({\n                        studentIds: [assignToStudentId],\n                        title: 'اختبار جديد من مشرفك',\n                        body: config.message || \`تم تكليفك باختبار: \${pickedQuiz.title}\`,\n                        channels: ['in_app'],\n                      });`,
  'SupervisorDashboard individual assessment notification',
)) || changed;

changed = (await replaceExact(
  files.quizModel,
  `    dueDate: { type: String, default: null },\n    isPublished: { type: Boolean, default: false },`,
  `    dueDate: { type: String, default: null },\n    supervisorMessage: { type: String, default: null },\n    isPublished: { type: Boolean, default: false },`,
  'Quiz supervisorMessage persistence',
)) || changed;

changed = (await replaceExact(
  files.contract,
  `const quizPage = await read("pages/QuizPage.tsx");`,
  `const quizPage = await read("pages/QuizPage.tsx");\nconst quizBuilder = await read("dashboards/admin/UnifiedQuizBuilder.tsx");`,
  'Supervisor contract quiz builder source',
)) || changed;

changed = (await replaceExact(
  files.contract,
  `const quizPage = await read("pages/QuizPage.tsx");\nconst quizBuilder = await read("dashboards/admin/UnifiedQuizBuilder.tsx");\nconst quizModel = await read("server/src/models/Quiz.ts");`,
  `const quizPage = await read("pages/QuizPage.tsx");\nconst quizBuilder = await read("dashboards/admin/UnifiedQuizBuilder.tsx");\nconst quizModel = await read("server/src/models/Quiz.ts");`,
  'Supervisor contract builder/model ordering',
)) || changed;

changed = (await replaceExact(
  files.contract,
  `const quizPage = await read("pages/QuizPage.tsx");\nconst quizModel = await read("server/src/models/Quiz.ts");`,
  `const quizPage = await read("pages/QuizPage.tsx");\nconst quizBuilder = await read("dashboards/admin/UnifiedQuizBuilder.tsx");\nconst quizModel = await read("server/src/models/Quiz.ts");`,
  'Supervisor contract quiz model source',
)) || changed;

changed = (await replaceExact(
  files.contract,
  `  assertIncludes(dashboard, "api.sendStudentAlert");\n  assertIncludes(dashboard, "openStudentReport");`,
  `  assertIncludes(dashboard, "api.sendStudentAlert");\n  assertIncludes(dashboard, "apiService.sendStudentAlert");\n  assertNotIncludes(dashboard, "apiService.sendNotifications");\n  assertIncludes(dashboard, "openStudentReport");`,
  'Supervisor dashboard notification contract',
)) || changed;

changed = (await replaceExact(
  files.contract,
  `  assertIncludes(notificationRoutes, 'channels: ["in_app"]');\n});`,
  `  assertIncludes(notificationRoutes, 'channels: ["in_app"]');\n  assertIncludes(quizModel, 'supervisorMessage: { type: String, default: null }');\n});`,
  'Supervisor message persistence contract',
)) || changed;

changed = (await replaceExact(
  files.contract,
  `check("post-test workflow supports weak and absent student follow-up", () => {`,
  `check("directed assessment builder preserves an immediately selected audience on save", () => {\n  assertIncludes(quizBuilder, "const targetGroupIdsRef = useRef<string[]>(initialTargetGroups);");\n  assertIncludes(quizBuilder, "targetGroupIdsRef.current = next;");\n  assertIncludes(quizBuilder, "targetGroupIds: targetGroupIdsRef.current");\n});\n\ncheck("post-test workflow supports weak and absent student follow-up", () => {`,
  'Directed assessment immediate-save race contract',
)) || changed;

changed = (await replaceExact(
  files.audit,
  `    const createResponsePromise = admin.page.waitForResponse(\n      (response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/quizzes"),\n      { timeout: 30000 },\n    );\n    await admin.page.getByTestId("assessment-builder-save").click();\n    const createResponse = await createResponsePromise;`,
  `    const createRequestPromise = admin.page.waitForRequest(\n      (request) => request.method() === "POST" && new URL(request.url()).pathname.endsWith("/api/quizzes"),\n      { timeout: 30000 },\n    );\n    const createResponsePromise = admin.page.waitForResponse(\n      (response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/api/quizzes"),\n      { timeout: 30000 },\n    );\n    await admin.page.getByTestId("assessment-builder-save").click();\n    const createRequest = await createRequestPromise;\n    const createRequestPayload = createRequest.postDataJSON();\n    assertStringSet(createRequestPayload?.targetGroupIds, [String(targetGroup.id || targetGroup._id)], "builder request explicit group target");\n    const createResponse = await createResponsePromise;`,
  'Directed assessment request payload proof',
)) || changed;

console.log(changed ? 'Focused supervisor-student E2E fixes applied.' : 'Focused fixes already applied.');
