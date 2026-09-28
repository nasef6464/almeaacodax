import { readFile } from "node:fs/promises";

const lessonModel = await readFile(new URL("../server/src/models/LessonProgress.ts", import.meta.url), "utf8");
const mirror = await readFile(new URL("../server/src/services/lessonProgressMirror.ts", import.meta.url), "utf8");
const auth = await readFile(new URL("../server/src/routes/auth.routes.ts", import.meta.url), "utf8");
const parity = await readFile(new URL("../server/src/scripts/plan4LessonProgressParity.ts", import.meta.url), "utf8");
const revision = await readFile(new URL("../server/src/services/questionRevision.ts", import.meta.url), "utf8");
const quizRoutes = await readFile(new URL("../server/src/routes/quiz.routes.ts", import.meta.url), "utf8");

const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};

assert(lessonModel.includes('lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true })'), "missing unique user/lesson guard");
assert(mirror.includes("bulkWrite"), "mirror must be idempotent bulk upsert");
assert(!mirror.includes("LessonProgressModel.updateMany"), "additive phase must not infer destructive completion removals");
assert(auth.includes('"/me/preferences"') && auth.includes("mirrorLessonProgress({"), "preference writes must mirror normalized progress");
assert(parity.includes('"verify-only"') && parity.includes('"apply-and-verify"'), "migration must support dry verification and explicit apply");
assert(parity.includes("mismatchedUsers === 0"), "parity gate missing");
assert(auth.includes("normalizedProgress = await LessonProgressModel.find"), "normalized progress read cutover missing");
assert(auth.includes("legacy User write remains authoritative"), "dual-write rollback containment missing");
assert(revision.includes('createHash("sha256")') && revision.includes("$setOnInsert"), "immutable deduplicated question revision guard missing");
assert(quizRoutes.includes("question revision mirror failed; preserving legacy result path"), "question revision compatibility containment missing");

console.log("PASS PLAN 4 LessonProgress additive/dual-write/parity contract");
