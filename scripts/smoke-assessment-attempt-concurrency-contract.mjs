import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const helper = readFileSync("server/src/modules/quizzes/application/getOrCreateAssessmentAttempt.ts", "utf8");
const handler = readFileSync("server/src/modules/quizzes/http/liveExamStartHandler.ts", "utf8");
const root = readFileSync("server/src/routes/liveExamsRoot.routes.ts", "utf8");
const routes = readFileSync("server/src/routes/index.ts", "utf8");
const migration = readFileSync("server/src/scripts/ensureLiveAssessmentIndexes.ts", "utf8");

assert.match(helper, /status: "in_progress"/, "attempt helper must reuse an active canonical attempt");
assert.match(helper, /countDocuments\(ownerFilter\)/, "attempt limit must count attempts already started");
assert.match(helper, /attemptNumber: -1/, "attempt numbering must derive from the latest persisted attempt, not count+1");
assert.match(helper, /code\) === 11000/, "attempt helper must recognize duplicate-key races");
assert.match(helper, /for \(let retry = 0; retry < 5;/, "attempt helper must retry concurrent inserts");
assert.match(helper, /concurrentWinner/, "attempt-limit boundary must re-read a concurrent active winner");

assert.match(handler, /getOrCreateAssessmentAttempt/, "live-exam start must use the canonical attempt helper");
assert.match(handler, /getOrCreateLiveSession/, "live-exam start must converge on one active session");
assert.match(handler, /if \(!isDuplicateKeyError\(error\)\) throw error;/, "upsert races must recover only from duplicate-key conflicts");
assert.match(handler, /Not authorized to start this assessment/, "directed-assessment authorization must stay before attempt creation");
assert.ok(
  handler.indexOf("canStartDirectedQuiz") < handler.indexOf("getOrCreateAssessmentAttempt({"),
  "authorization must execute before a canonical attempt can be created",
);

assert.match(root, /req\.method !== "POST" \|\| req\.path !== "\/start"/, "only POST /start should move to the canonical start handler");
assert.match(root, /requireAuth\(req, res/, "canonical start must refresh the authenticated principal");
assert.match(root, /liveExamStartHandler\(req, res\)/, "POST /start must terminate at the canonical start handler");
const liveMount = 'apiRouter.use("/live-exams", liveExamsRouter);';
assert.equal(routes.split(liveMount).length - 1, 1, "architecture must keep exactly one /live-exams mount");
assert.match(routes, /liveExamsRouter from "\.\/liveExamsRoot\.routes\.js"/, "canonical mount must point at the concurrency root adapter");

assert.match(migration, /ALLOW_LIVE_ASSESSMENT_INDEX_MIGRATION/, "production migration must require explicit approval");
assert.match(migration, /findDuplicateActiveAttempts/, "migration must preflight duplicate active attempts");
assert.match(migration, /findDuplicateActiveSessions/, "migration must preflight duplicate active sessions");
assert.match(migration, /uniq_active_assessment_attempt/, "migration must create the active-attempt unique index");
assert.match(migration, /partialFilterExpression: \{ status: "in_progress" \}/, "attempt uniqueness must apply only to in-progress rows");
assert.match(migration, /uniq_active_live_exam_session/, "migration must create the active-session unique index");
assert.match(migration, /partialFilterExpression: \{ status: "active" \}/, "session uniqueness must apply only to active rows");
assert.ok(
  migration.indexOf("findDuplicateActiveAttempts()") < migration.indexOf('createIndex(\n      { assignmentId: 1, studentId: 1 }'),
  "duplicate preflight must run before unique-index creation",
);

console.log("assessment attempt concurrency contract PASS");
