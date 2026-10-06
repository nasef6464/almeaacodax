import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthUser } from "../modules/auth/domain/auth-user.js";

export function signAccessToken(payload: AuthUser) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthUser;
}
