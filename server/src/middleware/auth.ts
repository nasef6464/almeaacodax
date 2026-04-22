import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../utils/jwt.js";
import type { AppRole } from "../constants/roles.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "";
  const isLocalRequest =
    ip.includes("127.0.0.1") ||
    ip.includes("::1") ||
    req.hostname === "localhost" ||
    req.hostname === "127.0.0.1";

  if (env.DEV_LOCAL_ADMIN_BYPASS && isLocalRequest) {
    req.authUser = {
      id: "local-dev-admin",
      email: env.ADMIN_EMAIL,
      role: "admin",
      name: env.ADMIN_NAME,
    };
    return next();
  }

  const raw = req.headers.authorization;
  if (!raw?.startsWith("Bearer ")) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: "Authentication required",
    });
  }

  try {
    const token = raw.replace("Bearer ", "");
    req.authUser = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: "Invalid or expired token",
    });
  }
}

export function requireRole(allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.authUser.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "You do not have access to this resource",
      });
    }

    return next();
  };
}
