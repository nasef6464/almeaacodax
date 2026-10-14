import type { Request, RequestHandler } from "express";
import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env.js";
import { createRedisClient, isRedisConfigured } from "../config/redis.js";
import { rateLimitActorId, skipPublicRateLimitRead } from "./rateLimitIdentity.js";

type RateLimitOptions = Pick<Options, "windowMs" | "limit" | "message"> & {
  keyPrefix: string;
  skip?: NonNullable<Options["skip"]>;
  passOnStoreError?: boolean;
  keyGenerator?: Options["keyGenerator"];
  skipSuccessfulRequests?: boolean;
};

const resolveRequestKey = (req: Request) => {
  const authId = req.authUser?.id || rateLimitActorId(req);
  if (authId) {
    return `user:${authId}`;
  }
  return `source:${resolveRequestSourceKey(req)}`;
};

export const resolveRequestSourceKey = (req: Request) =>
  ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");

const normalizeIp = (value: string) =>
  String(value || "")
    .trim()
    .replace(/^::ffff:/i, "");

const getRequestIp = (req: Request) => normalizeIp(req.ip || req.socket.remoteAddress || "");

const parseAdminBypassIps = () =>
  new Set(
    String(env.ADMIN_LOGIN_BYPASS_IPS || "")
      .split(",")
      .map((ip) => normalizeIp(ip))
      .filter(Boolean),
  );

export const isAdminLoginBypassRequest = (req: Request) => {
  if (!env.ADMIN_LOGIN_BYPASS_ENABLED) return false;

  const bypassEmail = String(env.ADMIN_LOGIN_BYPASS_EMAIL || "").trim().toLowerCase();
  if (!bypassEmail) return false;

  const allowedIps = parseAdminBypassIps();
  if (allowedIps.size === 0) return false;

  const requestPath = String(req.originalUrl || req.path || "").toLowerCase();
  if (!requestPath.endsWith("/api/auth/login")) return false;

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const loginEmail = String((body as Record<string, unknown>).email || "").trim().toLowerCase();
  if (!loginEmail || loginEmail !== bypassEmail) return false;

  const requestIp = getRequestIp(req);
  return allowedIps.has(requestIp);
};

export function createRateLimiter(options: RateLimitOptions) {
  const redis = env.RATE_LIMIT_REDIS_ENABLED ? createRedisClient("rate-limit") : null;
  const useRedis = Boolean(redis && isRedisConfigured());

  if (!useRedis && env.NODE_ENV === "production") {
    const reason = !env.RATE_LIMIT_REDIS_ENABLED
      ? "RATE_LIMIT_REDIS_ENABLED=false"
      : !isRedisConfigured()
        ? "REDIS_URL is not configured"
        : "Redis client is unavailable";
    console.warn(`[rate-limit] ${options.keyPrefix} is using in-memory limits because ${reason}`);
  }

  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator ?? resolveRequestKey,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    // Global traffic may fail open for availability, but auth/sensitive actions
    // fail closed when the distributed Redis limiter is configured and unavailable.
    passOnStoreError: options.passOnStoreError ?? true,
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

// Bound total work before parsing/verifying any access token. Per-account limits
// below still prevent one account from spending the entire school's allowance.
export const sharedSourceRateLimiter = createRateLimiter({
  keyPrefix: "shared-source",
  windowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
  limit: env.RATE_LIMIT_SHARED_SOURCE_LIMIT,
  keyGenerator: resolveRequestSourceKey,
  skip: skipPublicRateLimitRead,
  message: { message: "Too many requests from this network, please try again shortly" },
});

export const globalRateLimiter = createRateLimiter({
  keyPrefix: "global",
  windowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
  limit: env.RATE_LIMIT_GLOBAL_LIMIT,
  message: { message: "Too many requests, please try again shortly" },
  skip: skipPublicRateLimitRead,
});

export const authRateLimiter = createRateLimiter({
  keyPrefix: "auth",
  passOnStoreError: false,
  keyGenerator: resolveRequestSourceKey,
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  limit: env.RATE_LIMIT_AUTH_LIMIT,
  message: { message: "Too many authentication attempts, please try again later" },
  skip: isAdminLoginBypassRequest,
});

const sensitiveAccountRateLimiter = createRateLimiter({
  keyPrefix: "sensitive",
  passOnStoreError: false,
  windowMs: env.RATE_LIMIT_SENSITIVE_WINDOW_MS,
  limit: env.RATE_LIMIT_SENSITIVE_LIMIT,
  message: { message: "Too many requests, please slow down" },
});

const sensitiveSourceRateLimiter = createRateLimiter({
  keyPrefix: "sensitive-source",
  passOnStoreError: false,
  windowMs: env.RATE_LIMIT_SENSITIVE_WINDOW_MS,
  limit: env.RATE_LIMIT_SENSITIVE_SOURCE_LIMIT,
  keyGenerator: resolveRequestSourceKey,
  message: { message: "Too many sensitive requests from this network, please slow down" },
});

// Reused by app-level and classroom route-level consumers, keeping both layers.
export const sensitiveActionRateLimiter: RequestHandler = (req, res, next) =>
  sensitiveSourceRateLimiter(req, res, (error?: unknown) => {
    if (error) return next(error);
    return sensitiveAccountRateLimiter(req, res, next);
  });
