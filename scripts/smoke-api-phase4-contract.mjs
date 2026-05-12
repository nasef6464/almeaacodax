import { readFile } from "node:fs/promises";

const files = {
  accessGrantService: await readFile(new URL("../server/src/services/accessGrantService.ts", import.meta.url), "utf8"),
  applyPurchaseToUser: await readFile(new URL("../server/src/services/applyPurchaseToUser.ts", import.meta.url), "utf8"),
  authRoutes: await readFile(new URL("../server/src/routes/auth.routes.ts", import.meta.url), "utf8"),
  paymentRoutes: await readFile(new URL("../server/src/routes/payment.routes.ts", import.meta.url), "utf8"),
  quizRoutes: await readFile(new URL("../server/src/routes/quiz.routes.ts", import.meta.url), "utf8"),
  courseRoutes: await readFile(new URL("../server/src/routes/course.routes.ts", import.meta.url), "utf8"),
  notificationRoutes: await readFile(new URL("../server/src/routes/notification.routes.ts", import.meta.url), "utf8"),
  operationsRoutes: await readFile(new URL("../server/src/routes/operations.routes.ts", import.meta.url), "utf8"),
  apiClient: await readFile(new URL("../services/api.ts", import.meta.url), "utf8"),
};

const checks = [];

function check(name, fn) {
  checks.push([name, fn]);
}

function assertIncludes(source, expected) {
  if (!source.includes(expected)) {
    throw new Error(`Expected to find: ${expected}`);
  }
}

check("access grant service uses idempotent grant creation and addToSet mirroring", () => {
  assertIncludes(files.accessGrantService, "grantAccessToUser");
  assertIncludes(files.accessGrantService, "idempotencyKey");
  assertIncludes(files.accessGrantService, "$addToSet");
  assertIncludes(files.applyPurchaseToUser, "mirrorGrantToUserSubscription");
});

check("access-code redemption creates AccessGrant and reserves use atomically", () => {
  assertIncludes(files.authRoutes, 'sourceType: "access_code"');
  assertIncludes(files.authRoutes, "AccessCodeModel.findOneAndUpdate");
  assertIncludes(files.authRoutes, "$expr: { $lt: [\"$currentUses\", \"$maxUses\"] }");
  assertIncludes(files.authRoutes, "grantAccessToUser");
});

check("payment approval and webhook use atomic status transition before grant", () => {
  assertIncludes(files.paymentRoutes, "PaymentRequestModel.findOneAndUpdate");
  assertIncludes(files.paymentRoutes, '{ _id: requestDoc._id, status: "pending" }');
  assertIncludes(files.paymentRoutes, "grantApprovedPaymentAccess");
  assertIncludes(files.paymentRoutes, 'sourceType: review.gatewayEventId ? "payment_webhook" : "payment_request"');
});

check("large list endpoints expose pagination metadata", () => {
  for (const source of [
    files.authRoutes,
    files.paymentRoutes,
    files.quizRoutes,
    files.courseRoutes,
    files.notificationRoutes,
    files.operationsRoutes,
  ]) {
    assertIncludes(source, "resolvePagination");
    assertIncludes(source, "buildPaginatedResponse");
  }
});

check("frontend service client safely unwraps paginated list payloads", () => {
  assertIncludes(files.apiClient, "extractList");
  assertIncludes(files.apiClient, 'extractList(await request<unknown>("/quizzes?limit=200"), "quizzes")');
  assertIncludes(files.apiClient, 'extractList(await request<unknown>("/courses?limit=200"), "courses")');
  assertIncludes(files.apiClient, 'extractList(await request<unknown>("/quizzes/results?limit=200"), "results")');
});

for (const [name, fn] of checks) {
  try {
    fn();
  } catch (error) {
    console.error(`API phase 4 contract failed: ${name}`);
    console.error(error);
    process.exit(1);
  }
}

console.log(`API phase 4 contract passed (${checks.length} checks).`);
