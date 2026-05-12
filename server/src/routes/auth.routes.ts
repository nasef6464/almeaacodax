import { Router } from "express";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserModel } from "../models/User.js";
import { AccessCodeModel } from "../models/AccessCode.js";
import { B2BPackageModel } from "../models/B2BPackage.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { signAccessToken } from "../utils/jwt.js";
import { applyPurchaseToUser } from "../services/applyPurchaseToUser.js";
import { recordAdminAuditLog } from "../services/adminAuditLog.js";
import { createNotificationDeliveries } from "../services/notificationService.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const adminCreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["student", "teacher", "admin", "supervisor", "parent"]),
  schoolId: z.string().nullable().optional(),
  groupIds: z.array(z.string()).optional(),
  linkedStudentIds: z.array(z.string()).optional(),
  managedPathIds: z.array(z.string()).optional(),
  managedSubjectIds: z.array(z.string()).optional(),
});

const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().optional(),
  role: z.enum(["student", "teacher", "admin", "supervisor", "parent"]).optional(),
  isActive: z.boolean().optional(),
  schoolId: z.string().nullable().optional(),
  groupIds: z.array(z.string()).optional(),
  linkedStudentIds: z.array(z.string()).optional(),
  managedPathIds: z.array(z.string()).optional(),
  managedSubjectIds: z.array(z.string()).optional(),
});

const preferencesSchema = z.object({
  favorites: z.array(z.string()).optional(),
  reviewLater: z.array(z.string()).optional(),
  enrolledPaths: z.array(z.string()).optional(),
});

const redeemAccessCodeSchema = z.object({
  code: z.string().min(4),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(160),
  password: z.string().min(8).max(160),
});

const verifyEmailSchema = z.object({
  token: z.string().min(32).max(160),
});

const serializeUser = (user: any) => {
  const plain = typeof user?.toJSON === "function" ? user.toJSON() : user?.toObject?.() || user;
  const { passwordHash, emailVerificationTokenHash, passwordResetTokenHash, __v, ...safeUser } = plain;
  return safeUser;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const buildDocumentQuery = (value: string) =>
  mongoose.Types.ObjectId.isValid(value) ? { $or: [{ id: value }, { _id: value }] } : { id: value };
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const createSecureToken = () => randomBytes(32).toString("hex");
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

async function queueEmailVerification(user: any) {
  const token = createSecureToken();
  user.emailVerificationTokenHash = hashToken(token);
  user.emailVerificationExpiresAt = Date.now() + EMAIL_VERIFICATION_TTL_MS;
  await user.save();

  await createNotificationDeliveries({
    channels: ["email"],
    userIds: [String(user.id || user._id)],
    title: "Verify your email",
    subject: "Verify your email",
    body: `Use this verification token to verify your account: ${token}`,
    createdBy: "system",
  });
}

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const payload = registerSchema.parse(req.body);
    const exists = await UserModel.findOne({ email: payload.email.toLowerCase() });

    if (exists) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "Email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await UserModel.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      passwordHash,
      role: "student",
    });

    await queueEmailVerification(user);

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.status(StatusCodes.CREATED).json({
      token,
      user: serializeUser(user),
    });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const user = await UserModel.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid email or password",
      });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid email or password",
      });
    }

    if (user.isActive === false) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "Account is disabled",
      });
    }

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.json({
      token,
      user: serializeUser(user),
    });
  }),
);

authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const payload = forgotPasswordSchema.parse(req.body);
    const user = await UserModel.findOne({ email: payload.email.toLowerCase() });

    if (user && user.isActive !== false) {
      const token = createSecureToken();
      user.passwordResetTokenHash = hashToken(token);
      user.passwordResetExpiresAt = Date.now() + PASSWORD_RESET_TTL_MS;
      user.passwordResetUsedAt = null;
      await user.save();

      await createNotificationDeliveries({
        channels: ["email"],
        userIds: [String(user.id || user._id)],
        title: "Reset your password",
        subject: "Reset your password",
        body: `Use this password reset token within 60 minutes: ${token}`,
        createdBy: "system",
      });
    }

    return res.json({
      message: "If this email exists, password reset instructions will be sent.",
    });
  }),
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const payload = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(payload.token);
    const user = await UserModel.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: Date.now() },
      passwordResetUsedAt: null,
    });

    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid or expired reset token",
      });
    }

    user.passwordHash = await bcrypt.hash(payload.password, 10);
    user.passwordResetUsedAt = Date.now();
    user.passwordResetTokenHash = "";
    user.passwordResetExpiresAt = null;
    await user.save();

    await recordAdminAuditLog(req, {
      action: "auth.password_reset.completed",
      resourceType: "user",
      resourceId: String(user.id || user._id),
      metadata: { targetEmail: user.email },
    });

    return res.json({
      message: "Password has been reset.",
    });
  }),
);

authRouter.post(
  "/email/verify",
  asyncHandler(async (req, res) => {
    const payload = verifyEmailSchema.parse(req.body);
    const user = await UserModel.findOne({
      emailVerificationTokenHash: hashToken(payload.token),
      emailVerificationExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid or expired verification token",
      });
    }

    user.emailVerified = true;
    user.emailVerifiedAt = Date.now();
    user.emailVerificationTokenHash = "";
    user.emailVerificationExpiresAt = null;
    await user.save();

    return res.json({
      user: serializeUser(user),
      message: "Email has been verified.",
    });
  }),
);

authRouter.post(
  "/email/resend-verification",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.authUser?.id);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.json({
        user: serializeUser(user),
        message: "Email is already verified.",
      });
    }

    await queueEmailVerification(user);

    return res.json({
      message: "Verification email has been queued.",
    });
  }),
);

authRouter.post(
  "/admin/users",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = adminCreateUserSchema.parse(req.body);
    const email = payload.email.toLowerCase();
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await UserModel.findOneAndUpdate(
      { email },
      {
        name: payload.name,
        email,
        passwordHash,
        role: payload.role,
        isActive: true,
        schoolId: payload.schoolId || null,
        groupIds: payload.groupIds || [],
        linkedStudentIds: payload.linkedStudentIds || [],
        managedPathIds: payload.managedPathIds || [],
        managedSubjectIds: payload.managedSubjectIds || [],
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    await recordAdminAuditLog(req, {
      action: "auth.admin_user.upsert",
      resourceType: "user",
      resourceId: String(user.id || user._id),
      metadata: {
        targetEmail: user.email,
        targetRole: user.role,
      },
    });

    return res.status(StatusCodes.CREATED).json({
      user: serializeUser(user),
    });
  }),
);

authRouter.get(
  "/admin/users",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    const users = await UserModel.find().sort({ createdAt: -1 });

    return res.json({
      users: users.map(serializeUser),
    });
  }),
);

authRouter.patch(
  "/admin/users/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = adminUpdateUserSchema.parse(req.body);
    const updated = await UserModel.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    await recordAdminAuditLog(req, {
      action: "auth.admin_user.update",
      resourceType: "user",
      resourceId: String(updated.id || updated._id),
      metadata: {
        changedKeys: Object.keys(payload),
        targetEmail: updated.email,
        targetRole: updated.role,
      },
    });

    return res.json({
      user: serializeUser(updated),
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.authUser?.id);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    return res.json({
      user: serializeUser(user),
    });
  }),
);

authRouter.patch(
  "/me/preferences",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = preferencesSchema.parse(req.body);
    const update: Record<string, string[]> = {};

    if (payload.favorites) {
      update.favorites = Array.from(new Set(payload.favorites));
    }

    if (payload.reviewLater) {
      update.reviewLater = Array.from(new Set(payload.reviewLater));
    }

    if (payload.enrolledPaths) {
      update.enrolledPaths = Array.from(new Set(payload.enrolledPaths));
    }

    const user = await UserModel.findByIdAndUpdate(
      req.authUser?.id,
      update,
      { new: true },
    );

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    return res.json({
      user: serializeUser(user),
    });
  }),
);

authRouter.post(
  "/me/purchase",
  requireAuth,
  asyncHandler(async (req, res) => {
    await recordAdminAuditLog(req, {
      action: "auth.direct_purchase.blocked",
      resourceType: "purchase",
      status: "blocked",
      metadata: { bodyKeys: Object.keys(req.body || {}) },
    });

    return res.status(StatusCodes.GONE).json({
      message: "Direct purchase unlock is disabled. Use payment requests, admin approval, verified webhooks, or access-code redemption.",
    });
  }),
);

authRouter.post(
  "/me/redeem-access-code",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = redeemAccessCodeSchema.parse(req.body);
    const normalizedCode = payload.code.trim().toUpperCase();

    const user = await UserModel.findById(req.authUser?.id);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    const codeLookup = { $regex: new RegExp(`^${escapeRegExp(normalizedCode)}$`, "i") };
    const accessCode = await AccessCodeModel.findOne({
      code: codeLookup,
    });

    if (!accessCode) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "كود التفعيل غير موجود",
      });
    }

    if (accessCode.expiresAt <= Date.now()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "انتهت صلاحية كود التفعيل",
      });
    }

    if ((accessCode.currentUses || 0) >= (accessCode.maxUses || 0)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "تم استهلاك عدد التفعيلات المتاح لهذا الكود",
      });
    }

    const linkedPackage = await B2BPackageModel.findOne(buildDocumentQuery(accessCode.packageId));

    if (!linkedPackage || linkedPackage.status !== "active") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "الباقة المرتبطة بهذا الكود غير متاحة الآن",
      });
    }

    if ((user.subscription?.purchasedPackages || []).includes(String(linkedPackage.id || linkedPackage._id))) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "تم تفعيل هذه الباقة على الحساب بالفعل",
      });
    }

    const reservedAccessCode = await AccessCodeModel.findOneAndUpdate(
      {
        code: codeLookup,
        expiresAt: { $gt: Date.now() },
        $expr: { $lt: ["$currentUses", "$maxUses"] },
      },
      { $inc: { currentUses: 1 } },
      { new: true },
    );

    if (!reservedAccessCode) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Activation code has no remaining uses",
      });
    }

    const updatedUser = await applyPurchaseToUser(String(user._id), {
      packageId: String(linkedPackage.id || linkedPackage._id),
      includedCourseIds: Array.isArray(linkedPackage.courseIds) ? linkedPackage.courseIds.map(String) : [],
    });

    return res.json({
      user: serializeUser(updatedUser),
      accessCode: reservedAccessCode,
      package: linkedPackage,
    });
  }),
);
