import type { Request } from "express";
import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env.js";
import { createRedisClient, isRedisConfigured } from "../config/redis.js";

type RateLimitOptions = Pick<Options, "windowMs" | "limit" | "message"> & {
  keyPrefix: string;
  skip?: NonNullable<Options["skip"]>;
};

const resolveRequestKey = (req: Request) => {
  const authId = req.authUser?.id;
  if (authId) {
    return `user:${authId}`;
  }
  return ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
};

export function createRateLimiter(options: RateLimitOptions) {
  const redis = env.RATE_LIMIT_REDIS_ENABLED ? createRedisClient("rate-limit") : null;
  const useRedis = Boolean(redis && isRedisConfigured());

  if (!useRedis && env.NODE_ENV === "production") {
    console.warn(`[rate-limit] ${options.keyPrefix} is using in-memory limits because REDIS_URL is not configured`);
  }

  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: resolveRequestKey,
    passOnStoreError: true,
    ...(options.skip ? { skip: options.skip } : {}),
    ...(useRedis && redis
      ? {
          store: new RedisStore({
            sendCommand: (...args: string[]) => (redis.call as (...commandArgs: string[]) => Promise<any>)(...args),
            prefix: `${env.REDIS_KEY_PREFIX}:rl:${options.keyPrefix}:`,
          }),
        }
      : {}),
    message: options.message,
  });
}

export const globalRateLimiter = createRateLimiter({
  keyPrefix: "global",
  windowMs: 60 * 1000,
  limit: 600,
  message: { message: "Too many requests, please try again shortly" },
  skip: (req) => {
    const path = req.path || "";
    const method = (req.method || "GET").toUpperCase();
    if (method !== "GET") return false;

    // Keep public health and bootstrap reads responsive under burst traffic.
    return (
      path === "/" ||
      path.startsWith("/api/health") ||
      path === "/api/content/bootstrap" ||
      path === "/api/taxonomy/bootstrap"
    );
  },
});

export const authRateLimiter = createRateLimiter({
  keyPrefix: "auth",
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { message: "Too many authentication attempts, please try again later" },
});

export const sensitiveActionRateLimiter = createRateLimiter({
  keyPrefix: "sensitive",
  windowMs: 60 * 1000,
  limit: 60,
  message: { message: "Too many requests, please slow down" },
});
