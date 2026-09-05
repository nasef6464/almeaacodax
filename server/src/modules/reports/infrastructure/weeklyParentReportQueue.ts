import { Queue, Worker, type JobsOptions } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../../../config/env.js";
import { isRedisConfigured } from "../../../config/redis.js";
import { runWeeklyParentReportBatch, weeklyParentReportExecutionKey } from "../application/runWeeklyParentReportBatch.js";

const WEEKLY_PARENT_REPORT_QUEUE = "weekly-parent-reports";
const WEEKLY_PARENT_REPORT_SCHEDULER = "weekly-parent-report-sunday-riyadh";
const WEEKLY_PARENT_REPORT_JOB = "generate-weekly-parent-reports";
const WEEKLY_PARENT_REPORT_OPTIONS: JobsOptions = {
  attempts: 4,
  backoff: { type: "exponential", delay: 60_000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

let queue: Queue | null = null;
let worker: Worker | null = null;

function isWeeklyReportQueueEnabled() {
  return env.NOTIFICATION_QUEUE_ENABLED && isRedisConfigured();
}

function createQueueConnection() {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      return Math.min(times * 250, 5_000);
    },
  });
}

function getQueue() {
  if (!isWeeklyReportQueueEnabled()) return null;
  if (!queue) {
    queue = new Queue(WEEKLY_PARENT_REPORT_QUEUE, {
      connection: createQueueConnection(),
      prefix: `${env.REDIS_KEY_PREFIX}:bullmq`,
      defaultJobOptions: WEEKLY_PARENT_REPORT_OPTIONS,
    });
  }
  return queue;
}

export function startWeeklyParentReportQueue() {
  const activeQueue = getQueue();
  if (!activeQueue) {
    console.warn("[weekly-report] distributed scheduler disabled; REDIS_URL and NOTIFICATION_QUEUE_ENABLED are required");
    return null;
  }

  if (!worker) {
    worker = new Worker(
      WEEKLY_PARENT_REPORT_QUEUE,
      async () => runWeeklyParentReportBatch(weeklyParentReportExecutionKey()),
      {
        connection: createQueueConnection(),
        prefix: `${env.REDIS_KEY_PREFIX}:bullmq`,
        concurrency: 1,
      },
    );
    worker.on("completed", (job) => console.info(`[weekly-report] job completed=${job.id}`));
    worker.on("failed", (job, error) => console.warn(`[weekly-report] job failed=${job?.id || "unknown"} reason=${error.message}`));
  }

  void activeQueue.upsertJobScheduler(
    WEEKLY_PARENT_REPORT_SCHEDULER,
    { pattern: "0 8 * * 0", tz: "Asia/Riyadh" },
    {
      name: WEEKLY_PARENT_REPORT_JOB,
      opts: WEEKLY_PARENT_REPORT_OPTIONS,
    },
  ).catch((error: unknown) => {
    console.error("[weekly-report] scheduler registration failed", error);
  });

  console.info("[weekly-report] distributed scheduler registered for Sunday 08:00 Asia/Riyadh");
  return activeQueue;
}

export async function closeWeeklyParentReportQueue() {
  const activeWorker = worker;
  const activeQueue = queue;
  worker = null;
  queue = null;

  await Promise.allSettled([
    activeWorker?.close(),
    activeQueue?.close(),
  ].filter(Boolean) as Array<Promise<unknown>>);
}
