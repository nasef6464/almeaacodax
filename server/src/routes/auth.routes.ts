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
import { PhoneOtpModel } from "../models/PhoneOtp.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { signAccessToken } from "../utils/jwt.js";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookie.js";
import { grantAccessToUser } from "../services/accessGrantService.js";
import { recordAdminAuditLog } from "../services/adminAuditLog.js";
import { createNotificationDeliveries } from "../services/notificationService.js";
import { sendExternalNotification } from "../services/notificationProviders.js";
import { buildPaginatedResponse, resolvePagination } from "../utils/pagination.js";
import { env } from "../config/env.js";
import { issueCsrfToken } from "../middleware/csrf.js";

const passwordStrengthSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(160, "Password is too long")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: "Password must include at least one letter and one number",
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(160),
});
const whatsappStartSchema = z.object({
  phone: z.string().min(8).max(24),
});
const whatsappVerifySchema = z.object({
  phone: z.string().min(8).max(24),
  code: z.string().length(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: passwordStrengthSchema,
});

const adminCreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: passwordStrengthSchema,
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

const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
  role: z.enum(["student", "teacher", "admin", "supervisor", "parent"]).optional(),
  isActive: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const lowered = value.toLowerCase();
      if (lowered === "true") return true;
      if (lowered === "false") return false;
    }

    return value;
  }, z.boolean().optional()),
});

const preferencesSchema = z.object({
  favorites: z.array(z.string()).optional(),
  reviewLater: z.array(z.string()).optional(),
  enrolledPaths: z.array(z.string()).optional(),
});
const updateMyProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  avatar: z.string().max(2_000_000).optional(),
});

const redeemAccessCodeSchema = z.object({
  code: z.string().min(4),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(160),
  password: passwordStrengthSchema,
});

const verifyEmailSchema = z.object({
  token: z.string().min(32).max(160),
});

const serializeUser = (user: any) => {
  const plain = typeof user?.toJSON === "function" ? user.toJSON() : user?.toObject?.() || user;
  const {
    passwordHash,
    failedLoginAttempts,
    lastFailedLoginAt,
    loginLockedUntil,
    emailVerificationTokenHash,
    passwordResetTokenHash,
    __v,
    ...safeUser
  } = plain;
  return safeUser;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const buildDocumentQuery = (value: string) =>
  mongoose.Types.ObjectId.isValid(value) ? { $or: [{ id: value }, { _id: value }] } : { id: value };
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const createSecureToken = () => randomBytes(32).toString("hex");
const normalizePhone = (value: string) => value.replace(/[^\d]/g, "");
const hashOtpCode = (phone: string, code: string) => hashToken(`${phone}:${code}`);
const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const WHATSAPP_OTP_TTL_MS = 10 * 60 * 1000;
const WHATSAPP_OTP_MAX_ATTEMPTS = 5;
const WHATSAPP_OTP_MAX_PER_15_MIN = 3;
const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function isLoginLocked(user: any) {
  return typeof user.loginLockedUntil === "number" && user.loginLockedUntil > Date.now();
}

async function recordFailedLogin(user: any) {
  const attempts = Number(user.failedLoginAttempts || 0) + 1;
  user.failedLoginAttempts = attempts;
  user.lastFailedLoginAt = Date.now();
  if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    user.loginLockedUntil = Date.now() + LOGIN_LOCK_MS;
  }
  await user.save();
}

async function clearFailedLoginState(user: any) {
  if (user.failedLoginAttempts || user.loginLockedUntil || user.lastFailedLoginAt) {
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.loginLockedUntil = null;
    await user.save();
  }
}

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

const ensureGoogleOAuthEnabled = (res: any) => {
  if (!env.GOOGLE_OAUTH_ENABLED) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: "Google login is disabled." });
    return false;
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: "Google OAuth env is not configured." });
    return false;
  }
  return true;
};

export const authRouter = Router();

const shouldExposeTokenInAuthResponse = env.NODE_ENV !== "production";

authRouter.get(
  "/csrf-token",
  asyncHandler(async (_req, res) => {
    const token = issueCsrfToken(res);
    return res.json({ csrfToken: token });
  }),
);

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
    setAuthCookie(res, token);

    return res.status(StatusCodes.CREATED).json({
      ...(shouldExposeTokenInAuthResponse ? { token } : {}),
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

    if (isLoginLocked(user)) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        message: "Too many login attempts. Try again later.",
      });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      await recordFailedLogin(user);
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid email or password",
      });
    }

    if (user.isActive === false) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: "Account is disabled",
      });
    }

    await clearFailedLoginState(user);

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    setAuthCookie(res, token);

    return res.json({
      ...(shouldExposeTokenInAuthResponse ? { token } : {}),
      user: serializeUser(user),
    });
  }),
);

authRouter.get(
  "/google/start",
  asyncHandler(async (req, res) => {
    if (!ensureGoogleOAuthEnabled(res)) return;
    const statePayload = {
      returnTo: typeof req.query.returnTo === "string" ? req.query.returnTo : "/",
      ts: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(statePayload), "utf8").toString("base64url");
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
      include_granted_scopes: "true",
      prompt: "select_account",
      state,
    });
    return res.redirect(`${GOOGLE_AUTH_BASE}?${params.toString()}`);
  }),
);

const handleGoogleCallback = asyncHandler(async (req, res) => {
  if (!ensureGoogleOAuthEnabled(res)) return;

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const stateRaw = typeof req.query.state === "string" ? req.query.state : "";
  const oauthError = typeof req.query.error === "string" ? req.query.error : "";

  const fallbackRedirect = `${env.CLIENT_URL}/#/login?oauth_error=google`;
  if (oauthError || !code) {
    return res.redirect(fallbackRedirect);
  }

  let returnTo = "/";
  if (stateRaw) {
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8")) as { returnTo?: string };
      if (parsed?.returnTo && parsed.returnTo.startsWith("/")) {
        returnTo = parsed.returnTo;
      }
    } catch {
      returnTo = "/";
    }
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return res.redirect(`${fallbackRedirect}&step=token`);
  }

  const tokenJson = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return res.redirect(`${fallbackRedirect}&step=access_token`);
  }

  const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileResponse.ok) {
    return res.redirect(`${fallbackRedirect}&step=profile`);
  }

  const profile = (await profileResponse.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    sub?: string;
  };

  const email = String(profile.email || "").toLowerCase().trim();
  if (!email) {
    return res.redirect(`${fallbackRedirect}&step=email`);
  }

  let user = await UserModel.findOne({ email });
  if (!user) {
    const randomPassword = createSecureToken();
    user = await UserModel.create({
      name: profile.name || email.split("@")[0] || "Student",
      email,
      passwordHash: await bcrypt.hash(randomPassword, 10),
      role: "student",
      avatar: profile.picture || "",
      emailVerified: Boolean(profile.email_verified),
      emailVerifiedAt: profile.email_verified ? Date.now() : null,
    });
  } else {
    let touched = false;
    if (!user.avatar && profile.picture) {
      user.avatar = profile.picture;
      touched = true;
    }
    if (!user.emailVerified && profile.email_verified) {
      user.emailVerified = true;
      user.emailVerifiedAt = Date.now();
      touched = true;
    }
    if (touched) await user.save();
  }

  if (user.isActive === false) {
    return res.redirect(`${fallbackRedirect}&step=disabled`);
  }

  const token = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  setAuthCookie(res, token);

  const returnUrl = encodeURIComponent(returnTo || "/");
  return res.redirect(
    `${env.CLIENT_URL}/#/login?oauth_provider=google&oauth_return=${returnUrl}`,
  );
});

authRouter.get("/google/callback", handleGoogleCallback);
authRouter.get("/google/call", handleGoogleCallback);

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    clearAuthCookie(res);
    return res.status(StatusCodes.NO_CONTENT).send();
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
    user.failedLoginAttempts = 0;
    user.lastFailedLoginAt = null;
    user.loginLockedUntil = null;
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
  asyncHandler(async (req, res) => {
    const query = adminUsersQuerySchema.parse(req.query);
    const pagination = resolvePagination(
      { page: query.page, limit: Math.min(query.limit || 50, 100) },
      { limit: 50 },
    );

    const search = query.search?.trim();
    const mongoQuery: Record<string, unknown> = {};

    if (query.role) {
      mongoQuery.role = query.role;
    }

    if (typeof query.isActive === "boolean") {
      mongoQuery.isActive = query.isActive;
    }

    if (search) {
      const escapedSearch = escapeRegExp(search);
      mongoQuery.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(mongoQuery).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
      UserModel.countDocuments(mongoQuery),
    ]);

    return res.json({
      users: users.map(serializeUser),
      pagination: buildPaginatedResponse(users, pagination, total),
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
  "/me/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = updateMyProfileSchema.parse(req.body || {});
    const update: Record<string, unknown> = {};

    if (typeof payload.name === "string") {
      update.name = payload.name.trim();
    }
    if (typeof payload.avatar === "string") {
      update.avatar = payload.avatar.trim();
    }

    if (Object.keys(update).length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "No profile fields provided",
      });
    }

    const user = await UserModel.findByIdAndUpdate(req.authUser?.id, update, { new: true });
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
  "/whatsapp/start",
  asyncHandler(async (req, res) => {
    const payload = whatsappStartSchema.parse(req.body);
    const phone = normalizePhone(payload.phone);
    if (phone.length < 8) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid phone number" });
    }

    const since = new Date(Date.now() - 15 * 60 * 1000);
    const recentCount = await PhoneOtpModel.countDocuments({
      phone,
      createdAt: { $gte: since },
    });
    if (recentCount >= WHATSAPP_OTP_MAX_PER_15_MIN) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        message: "Too many OTP requests. Try again in 15 minutes.",
      });
    }

    const code = generateOtpCode();
    await PhoneOtpModel.create({
      phone,
      codeHash: hashOtpCode(phone, code),
      expiresAt: Date.now() + WHATSAPP_OTP_TTL_MS,
      attempts: 0,
      channel: "whatsapp",
    });

    const result = await sendExternalNotification({
      channel: "whatsapp",
      id: `otp_${phone}_${Date.now()}`,
      recipientPhone: phone,
      title: "Almeaa OTP",
      subject: "Almeaa OTP",
      body: `رمز الدخول لمنصة المئة هو: ${code}. صالح لمدة 10 دقائق.`,
    });

    if (!result.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.info(`[whatsapp-otp] fallback-code phone=${phone} code=${code}`);
      }
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "WhatsApp OTP provider is not configured.",
      });
    }

    return res.json({
      message: "OTP sent to WhatsApp.",
      expiresInSeconds: Math.floor(WHATSAPP_OTP_TTL_MS / 1000),
    });
  }),
);

authRouter.post(
  "/whatsapp/verify",
  asyncHandler(async (req, res) => {
    const payload = whatsappVerifySchema.parse(req.body);
    const phone = normalizePhone(payload.phone);
    const code = String(payload.code || "").trim();
    if (phone.length < 8 || !/^\d{6}$/.test(code)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid phone or code" });
    }

    const otp = await PhoneOtpModel.findOne({
      phone,
      usedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!otp || Number(otp.expiresAt || 0) < Date.now()) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "OTP is invalid or expired" });
    }

    if (Number(otp.attempts || 0) >= WHATSAPP_OTP_MAX_ATTEMPTS) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({ message: "Too many failed attempts" });
    }

    const otpMatches = hashOtpCode(phone, code) === String(otp.codeHash || "");
    if (!otpMatches) {
      await PhoneOtpModel.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid OTP code" });
    }

    await PhoneOtpModel.updateOne({ _id: otp._id }, { $set: { usedAt: Date.now() } });

    const userEmail = `wa_${phone}@otp.almeaa.local`;
    let user = await UserModel.findOne({ email: userEmail });
    if (!user) {
      const randomPassword = createSecureToken();
      user = await UserModel.create({
        name: `طالب واتساب ${phone.slice(-4)}`,
        email: userEmail,
        passwordHash: await bcrypt.hash(randomPassword, 10),
        role: "student",
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: Date.now(),
      });
    }

    if (user.isActive === false) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Account is disabled" });
    }

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    setAuthCookie(res, token);

    return res.json({
      ...(shouldExposeTokenInAuthResponse ? { token } : {}),
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

    const packageId = String(linkedPackage.id || linkedPackage._id);
    const courseIds = Array.isArray(linkedPackage.courseIds) ? linkedPackage.courseIds.map(String) : [];
    const grantResult = await grantAccessToUser({
      userId: String(user._id),
      sourceType: "access_code",
      sourceId: `${String(accessCode._id)}:${String(user._id)}`,
      packageId,
      courseIds,
      contentTypes: Array.isArray(linkedPackage.contentTypes) ? linkedPackage.contentTypes.map(String) : ["all"],
      pathIds: Array.isArray(linkedPackage.pathIds) ? linkedPackage.pathIds.map(String) : [],
      subjectIds: Array.isArray(linkedPackage.subjectIds) ? linkedPackage.subjectIds.map(String) : [],
      grantedBy: "access-code",
      idempotencyKey: `access_code:${String(accessCode._id)}:${String(user._id)}`,
      metadata: {
        accessCodeId: String(accessCode._id),
        accessCode: reservedAccessCode.code,
        packageName: linkedPackage.name,
      },
    });

    if (!grantResult.created) {
      await AccessCodeModel.findByIdAndUpdate(reservedAccessCode._id, {
        $inc: { currentUses: -1 },
      });
    }

    return res.json({
      user: serializeUser(grantResult.user),
      accessCode: reservedAccessCode,
      package: linkedPackage,
      accessGrant: grantResult.grant,
    });
  }),
);
