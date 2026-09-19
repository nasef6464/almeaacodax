import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../server/src/app.ts", import.meta.url), "utf8");
const guardSource = await readFile(new URL("../server/src/middleware/aiStudentTargetGuard.ts", import.meta.url), "utf8");
const authzSource = await readFile(new URL("../server/src/modules/ai/application/aiStudentTargetAuthorization.ts", import.meta.url), "utf8");

const required = [
  [appSource, 'app.use("/api/ai/generate-mock-exam", requireAuth, requireActiveAuth, aiStudentTargetGuard)'],
  [guardSource, "canTargetStudentForAi(actor, targetStudentId)"],
  [authzSource, 'actor.role === "student"'],
  [authzSource, 'actor.role === "parent"'],
  [authzSource, 'actor.role === "school_admin" || actor.role === "supervisor"'],
  [authzSource, 'actor.role === "teacher"'],
  [authzSource, "resolveSchoolContexts"],
  [authzSource, "TeachingAssignmentModel.find"],
  [authzSource, "GroupModel.exists"],
];

const missing = required.filter(([source, fragment]) => !source.includes(fragment)).map(([, fragment]) => fragment);
if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2));
  process.exit(1);
}

console.log(`AI target scope contract passed (${required.length} checks).`);
