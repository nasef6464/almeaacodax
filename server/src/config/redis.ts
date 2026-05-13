import { Redis, type Redis as RedisClient } from "ioredis";
import { env } from "./env.js";

type RedisPurpose = "rate-limit" | "socket-pub" | "socket-sub" | "queue";

const clients = new Map<string, RedisClient>();

const buildRedisKey = (purpose: RedisPurpose) => `${purpose}:${env.REDIS_URL || "memory"}`;

export function isRedisConfigured() {
  return Boolean(env.REDIS_URL && env.REDIS_URL.trim().length > 0);
}

export function createRedisClient(purpose: RedisPurpose) {
  if (!isRedisConfigured()) {
    return null;
  }

  const key = buildRedisKey(purpose);
  const existing = clients.get(key);
  if (existing) {
    return existing;
  }

  const client = new Redis(env.REDIS_URL, {
    keyPrefix: `${env.REDIS_KEY_PREFIX}:${purpose}:`,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy(times: number) {
      return Math.min(times * 250, 5000);
    },
  });

  client.on("connect", () => {
    console.info(`[redis] ${purpose} connected`);
  });

  client.on("error", (error: unknown) => {
    console.error(`[redis] ${purpose} error`, error);
  });

  clients.set(key, client);
  return client;
}

export function createRedisDuplicate(purpose: RedisPurpose) {
  const client = createRedisClient(purpose);
  return client ? client.duplicate({ keyPrefix: `${env.REDIS_KEY_PREFIX}:${purpose}:` }) : null;
}
