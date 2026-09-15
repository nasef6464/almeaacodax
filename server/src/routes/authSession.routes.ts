import { Router } from "express";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserModel } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookie.js";
import { signAccessToken } from "../utils/jwt.js";
import { recordAdminAuditLog } from "../services/adminAuditLog.js";

const passwordStrengthSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(160, "Password is too long")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "Password must include at least one letter and one number",
  });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(160),
  newPassword: passwordStrengthSchema,
});

export const authSessionRouter = Router();

authSessionRouter.post(
  "/logout-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = String(req.authUser?.id || "").trim();
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication required" });
    }

    if (userId === "local-dev-admin") {
      clearAuthCookie(res);
      return res.status(StatusCodes.NO_CONTENT).send();
    }

    const invalidatedAt = Date.now();
    const result = await UserModel.updateOne(
      { _id: userId },
      { $set: { sessionInvalidBefore: invalidatedAt } },
    );
    if (result.matchedCount === 0) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication required" });
    }

    clearAuthCookie(res);
    await recordAdminAuditLog(req, {
      action: "auth.session.logout_all",
      resourceType: "user",
      resourceId: userId,
      metadata: { invalidatedAt },
    });

    return res.status(StatusCodes.NO_CONTENT).send();
  }),
);

authSessionRouter.post(
  "/me/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = changePasswordSchema.parse(req.body || {});
    const userId = String(req.authUser?.id || "").trim();
    if (!userId || userId === "local-dev-admin") {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Password change is unavailable for this session." });
    }

    const user = await UserModel.findById(userId);
    if (!user || user.isActive === false) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Authentication required" });
    }

    const currentPasswordValid = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!currentPasswordValid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Current password is incorrect" });
    }

    const passwordUnchanged = await bcrypt.compare(payload.newPassword, user.passwordHash);
    if (passwordUnchanged) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "New password must be different from the current password" });
    }

    user.passwordHash = await bcrypt.hash(payload.newPassword, 10);
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.loginLockedUntil = null;
    await user.save();

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    setAuthCookie(res, token);

    await recordAdminAuditLog(req, {
      action: "auth.password_change.completed",
      resourceType: "user",
      resourceId: String(user.id || user._id),
      metadata: { priorSessionsInvalidated: true },
    });

    return res.json({
      message: "Password updated. Other sessions have been signed out.",
    });
  }),
);
