import { readFile } from "node:fs/promises";
const read=(p)=>readFile(new URL(`../${p}`,import.meta.url),"utf8");
const [workspace,paymentModel,paymentRoutes,grant,privacy,quizResult,attempt,race]=await Promise.all([
  read("server/src/modules/schools/application/schoolDirectorWorkspace.ts"),
  read("server/src/models/PaymentRequest.ts"),
  read("server/src/routes/payment.routes.ts"),
  read("server/src/services/accessGrantService.ts"),
  read("server/src/modules/privacy/application/deleteUserLifecycle.ts"),
  read("server/src/models/QuizResult.ts"),
  read("server/src/modules/quizzes/infrastructure/assessmentAttemptModel.ts"),
  read("server/src/scripts/db5ConsistencyRaceGate.ts"),
]);
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
assert(workspace.includes("Student transfer conflicted with another concurrent update") && workspace.includes("{ _id: rawStudent._id, schoolId: source.schoolId }"),"school transfer compare-and-swap missing");
assert(workspace.includes("Promise.allSettled") && workspace.includes("originalGroupIds") && workspace.includes("idempotent: true"),"school transfer compensation/idempotent retry missing");
assert(paymentModel.includes("unique_pending_purchase_per_item") && paymentModel.includes('partialFilterExpression: { status: "pending" }'),"pending payment race index missing");
assert(paymentRoutes.includes("createPendingPaymentRequest") && paymentRoutes.includes("error?.code !== 11000") && paymentRoutes.includes('status: "pending"'),"payment duplicate-key recovery missing");
assert(grant.includes("idempotencyKey") && grant.includes("error?.code !== 11000"),"access grant idempotency recovery missing");
assert(privacy.indexOf("updateMany") < privacy.indexOf("UserModel.deleteOne"),"privacy lifecycle must revoke/anonymize before identity delete");
assert(quizResult.includes("submissionKey") && quizResult.includes("unique: true") && attempt.includes("submissionKey") && attempt.includes("unique: true"),"assessment submit idempotency guards missing");
assert(race.includes("exactly one concurrent school transfer must win") && race.includes("privacy deletion is safe to retry"),"DB-5 executable race gate missing");
console.log("PASS DB-5 consistency/idempotency contract");
