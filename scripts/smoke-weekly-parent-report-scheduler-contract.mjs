import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const files = {
  scheduler: await read("server/src/modules/reports/infrastructure/weeklyParentReportQueue.ts"),
  batch: await read("server/src/modules/reports/application/runWeeklyParentReportBatch.ts"),
  facade: await read("server/src/modules/reports/application/startWeeklyParentReportSchedule.ts"),
  service: await read("server/src/services/notificationService.ts"),
  shutdown: await read("server/src/app/bootstrap/registerGracefulShutdown.ts"),
};

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", message: error.message }); }
};
const includes = (source, value) => { if (!source.includes(value)) throw new Error(`missing: ${value}`); };
const excludes = (source, value) => { if (source.includes(value)) throw new Error(`unexpected: ${value}`); };

check("scheduler is distributed and Riyadh-time based", () => {
  includes(files.scheduler, "upsertJobScheduler");
  includes(files.scheduler, 'pattern: "0 8 * * 0"');
  includes(files.scheduler, 'tz: "Asia/Riyadh"');
  includes(files.scheduler, "concurrency: 1");
  excludes(files.scheduler, "setInterval");
});
check("batch has deterministic idempotency and retry visibility", () => {
  includes(files.batch, "weeklyParentReportExecutionKey");
  includes(files.batch, "campaignId");
  includes(files.batch, "deliveredKeys");
  includes(files.batch, "partial_failure");
});
check("weekly parent reads are batched before per-parent delivery", () => {
  includes(files.batch, "allLinkedIds");
  includes(files.batch, "weeklyResults");
  includes(files.batch, "resultsByStudent");
  includes(files.batch, "existingDeliveries");
  excludes(files.batch, "NotificationDeliveryModel.exists");
  const quizFindCount = (files.batch.match(/QuizResultModel\.find\(/g) || []).length;
  if (quizFindCount !== 1) throw new Error(`expected exactly one weekly QuizResult query, found ${quizFindCount}`);
});
check("existing bootstrap facade and shutdown are preserved", () => {
  includes(files.facade, "startWeeklyParentReportQueue");
  includes(files.shutdown, "closeWeeklyParentReportQueue");
});
check("notification campaign id remains backward compatible", () => {
  includes(files.service, "campaignId?: string");
  includes(files.service, "input.campaignId || randomUUID()");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed, checks }, null, 2));
if (failed.length) process.exit(1);
