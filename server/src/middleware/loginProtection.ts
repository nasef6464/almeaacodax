import { createHash } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";
import { createRedisClient } from "../config/redis.js";
import { memoryLoginFailureStore, redisLoginFailureStore, type LoginFailureStore } from "../modules/auth/application/loginFailureBudget.js";
import { createRateLimiter, isAdminLoginBypassRequest } from "./rateLimiters.js";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const normalizedIdentity = (value: string) => value.trim().toLowerCase().replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
const sourceKey = (req: Request) => digest(ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown"));
export const loginAccountKey = (req: Request) => {
  const body = req.body || {};
  const path = req.originalUrl.split("?")[0].replace(/\/+$/, "").toLowerCase();
  const raw = path.endsWith("/phone-password") ? body.phone : path.endsWith("/national-id") ? body.nationalId : body.email;
  const identity = typeof raw === "string" ? normalizedIdentity(raw) : "";
  const normalized = path.endsWith("/phone-password") ? identity.replace(/[^\d]/g, "") : identity;
  return digest(normalized || `missing:${sourceKey(req)}`);
};

// Count completed credential failures, not successful classmates or pending logins.
export function createLoginFailureGuard(store: LoginFailureStore, limit: number, skip: (req: Request) => boolean = () => false): RequestHandler {
  return async (req, res, next) => {
    if (skip(req)) { next(); return; }
    const key = sourceKey(req);
    const unavailable = () => {
      if (!res.headersSent) res.status(503).json({ message: "Authentication protection unavailable, please try again shortly" });
    };
    try {
      const budget = await store.read(key);
      if (budget.count >= limit) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil(budget.retryAfterMs / 1000))));
        res.status(429).json({ message: "Too many authentication attempts, please try again later" });
        return;
      }
    } catch { unavailable(); return; }
    const originalJson = res.json.bind(res);
    let counted = false;
    res.json = ((body: unknown) => {
      if (!counted && (res.statusCode === 400 || res.statusCode === 401)) {
        counted = true;
        // Record before returning the rejection, so a subsequent request sees it.
        void store.increment(key).then(() => { originalJson(body); }, () => {
          if (!res.headersSent) { res.status(503); originalJson({ message: "Authentication protection unavailable, please try again shortly" }); }
        });
        return res;
      }
      return originalJson(body);
    }) as typeof res.json;
    next();
  };
}

const redis = env.RATE_LIMIT_REDIS_ENABLED ? createRedisClient("rate-limit") : null;
// ioredis eval prefixes its KEYS arguments; pass only the namespace suffix.
const store = redis
  ? redisLoginFailureStore((script, keys, ...args) => redis.eval(script, keys, ...args), "login-failures:", env.RATE_LIMIT_AUTH_WINDOW_MS)
  : memoryLoginFailureStore(env.RATE_LIMIT_AUTH_WINDOW_MS);
const message = { message: "Too many authentication attempts, please try again later" };
const loginAccountLimiter = createRateLimiter({ keyPrefix: "login-account", windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS, limit: env.RATE_LIMIT_LOGIN_ACCOUNT_LIMIT, message, keyGenerator: loginAccountKey, skipSuccessfulRequests: true, passOnStoreError: false, skip: isAdminLoginBypassRequest });

// Only call after a valid, unexpired reset token proves ownership. Clear that
// account's identifiers and this recovery source, never all accounts/sources.
export async function clearRecoveredLoginProtection(req: Request, user: { email: string; nationalId?: string | null; phone?: string | null }) {
  const identities = [normalizedIdentity(user.email), user.nationalId ? normalizedIdentity(user.nationalId) : "", user.phone ? normalizedIdentity(user.phone).replace(/[^\d]/g, "") : ""].filter(Boolean);
  for (const identity of new Set(identities)) await loginAccountLimiter.resetKey(digest(identity));
  await store.clear(sourceKey(req));
}
export const loginProtection = [
  createRateLimiter({ keyPrefix: "login-burst", windowMs: 60000, limit: env.RATE_LIMIT_LOGIN_BURST_LIMIT, message, passOnStoreError: false, skip: isAdminLoginBypassRequest }),
  createLoginFailureGuard(store, env.RATE_LIMIT_LOGIN_SOURCE_FAILURE_LIMIT, isAdminLoginBypassRequest),
  loginAccountLimiter,
];
