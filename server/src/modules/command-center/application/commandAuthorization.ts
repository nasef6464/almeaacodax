import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { env } from "../../../config/env.js";
import { requireAuth, requireRole } from "../../../middleware/auth.js";

export type CommandPrincipal = {
  id: string;
  type: "admin_session" | "api_key";
  source: "admin_ui" | "mcp" | "external_agent";
  scopes: string[];
};

const parseScopes = (value: string) =>
  value.split(",").map((item) => item.trim()).filter(Boolean);

const safeEquals = (left: string, right: string) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const getCommandPrincipal = (res: Response): CommandPrincipal | null =>
  (res.locals.commandPrincipal as CommandPrincipal | undefined) || null;

export function requireCommandPrincipal(req: Request, res: Response, next: NextFunction) {
  const providedKey = String(req.headers["x-almeaa-command-key"] || "").trim();
  const configuredKey = String(env.ALMEAA_COMMAND_API_KEY || "").trim();

  if (providedKey && configuredKey && safeEquals(providedKey, configuredKey)) {
    res.locals.commandPrincipal = {
      id: "command-api-key",
      type: "api_key",
      source: "external_agent",
      scopes: parseScopes(env.ALMEAA_COMMAND_API_SCOPES),
    } satisfies CommandPrincipal;
    return next();
  }

  return requireAuth(req, res, () =>
    requireRole(["admin"])(req, res, () => {
      res.locals.commandPrincipal = {
        id: String(req.authUser?.id || "admin"),
        type: "admin_session",
        source: "admin_ui",
        scopes: ["*"],
      } satisfies CommandPrincipal;
      return next();
    }),
  );
}

export function requireCommandScope(scope: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const principal = getCommandPrincipal(res);
    if (!principal) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Command Center authentication required",
      });
    }
    if (principal.scopes.includes("*") || principal.scopes.includes(scope)) {
      return next();
    }
    return res.status(StatusCodes.FORBIDDEN).json({
      message: "Command Center scope denied",
      requiredScope: scope,
    });
  };
}
