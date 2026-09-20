import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const files = {
  realtime: await read("server/src/modules/notifications/infrastructure/notificationRealtime.ts"),
  stream: await read("server/src/modules/notifications/http/openNotificationSseStream.ts"),
  service: await read("server/src/services/notificationService.ts"),
  bootstrap: await read("server/src/app/bootstrap/bootstrapServer.ts"),
  shutdown: await read("server/src/app/bootstrap/registerGracefulShutdown.ts"),
  queue: await read("server/src/queues/notificationQueue.ts"),
  health: await read("server/src/routes/health.routes.ts"),
};

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", message: error.message }); }
};
const includes = (source, value) => { if (!source.includes(value)) throw new Error(`missing: ${value}`); };
const excludes = (source, value) => { if (source.includes(value)) throw new Error(`unexpected: ${value}`); };

check("SSE uses event subscription and one initial unread query", () => {
  includes(files.stream, "subscribeToNotificationEvents");
  includes(files.stream, "countDocuments");
  excludes(files.stream, "setInterval(poll");
  excludes(files.stream, "NotificationDeliveryModel.find({");
});
check("realtime bridge supports Redis and local fallback", () => {
  includes(files.realtime, "createRedisClient(\"notification-realtime-pub\")");
  includes(files.realtime, "createRedisDuplicate(\"notification-realtime-sub\")");
  includes(files.realtime, "publishInAppNotificationEvents");
  includes(files.realtime, "using local fan-out fallback");
});
check("delivery creation publishes only persisted in-app events", () => {
  includes(files.service, "publishInAppNotificationEvents(inAppEvents)");
  includes(files.service, 'item.channel === "in_app"');
});
check("scale metrics expose bounded queue and realtime counts without scanning deliveries", () => {
  includes(files.queue, "getNotificationQueueMetrics");
  includes(files.queue, "getJobCounts");
  includes(files.queue, 'status: "unavailable" as const');
  includes(files.queue, "workerConcurrency: env.NOTIFICATION_QUEUE_CONCURRENCY");
  includes(files.queue, "catch {");
  includes(files.realtime, "getNotificationRealtimeMetrics");
  includes(files.realtime, "subscribedUsers");
  includes(files.health, 'healthRouter.get("/scale-metrics"');
  includes(files.health, "notificationQueue");
  includes(files.health, "notificationRealtime");
});

check("lifecycle starts and closes the realtime bridge", () => {
  includes(files.bootstrap, "startNotificationRealtime()");
  includes(files.shutdown, "closeNotificationRealtime()");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed, checks }, null, 2));
if (failed.length) process.exit(1);
