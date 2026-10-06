import type { AuthUser } from "../modules/auth/domain/auth-user.js";

export type { AuthUser } from "../modules/auth/domain/auth-user.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      requestId?: string;
    }
  }
}

export {};
