import type { Request, RequestHandler } from "express";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const skipPublicRateLimitRead = (req: Request) => {
  if ((req.method || "GET").toUpperCase() !== "GET") return false;
  const path = req.path || "";
  return path === "/" || path.startsWith("/api/health") ||
    path === "/api/content/bootstrap" || path === "/api/taxonomy/bootstrap";
};

// Budget partition only: never populate authUser or authorize a route here.
// Weak keys keep this request-local without retaining tokens or user documents.
const verifiedBudgetActors = new WeakMap<Request, string>();

export const identifyRateLimitActor: RequestHandler = (req, _res, next) => {
  if (skipPublicRateLimitRead(req)) { next(); return; }
  const raw = req.headers.authorization;
  const bearer = typeof raw === "string" && raw.startsWith("Bearer ") ? raw.replace("Bearer ", "") : "";
  const cookie = typeof req.cookies?.[AUTH_COOKIE_NAME] === "string" ? req.cookies[AUTH_COOKIE_NAME] : "";
  // Preserve authentication's bearer-over-cookie precedence, including invalid bearers.
  const token = bearer || cookie;
  if (token) {
    try {
      const claims = verifyAccessToken(token);
      if (typeof claims?.id === "string" && claims.id.length > 0 && claims.id.length <= 160) {
        verifiedBudgetActors.set(req, claims.id);
      }
    } catch {
      // Anonymous, expired and forged tokens all retain the source-IP allowance.
    }
  }
  next();
};

export const rateLimitActorId = (req: Request) => verifiedBudgetActors.get(req);
