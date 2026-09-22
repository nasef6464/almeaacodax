import { Router } from "express";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { UserModel } from "../models/User.js";
import { ParentStudentRelationshipModel } from "../models/ParentStudentRelationship.js";
import { getAuthorizedStudentIdsForParent, syncCanonicalParentRelationships } from "../services/parentAuthorityService.js";
import { GroupModel } from "../models/Group.js";
import { AccessCodeModel } from "../models/AccessCode.js";
import { AccessGrantModel } from "../models/AccessGrant.js";
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
import { csrfGuard, issueCsrfToken } from "../middleware/csrf.js";
import { isPackageSeatAvailable } from "../services/packageSeatCapacity.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { CourseModel } from "../models/Course.js";
import { LessonModel } from "../models/Lesson.js";
import { QuestionModel } from "../models/Question.js";
import { QuizModel } from "../models/Quiz.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { LibraryItemModel } from "../models/LibraryItem.js";
import { PlatformIntegrationSettingsModel } from "../models/PlatformIntegrationSettings.js";
import { decryptIntegrationSecretsForRuntime } from "../utils/integrationSecretsCrypto.js";
import { deleteUserLifecycle } from "../modules/privacy/application/deleteUserLifecycle.js";

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
  role: z.enum(["student", "teacher", "admin", "supervisor", "school_admin", "parent"]),
  schoolId: z.string().nullable().optional(),
  groupIds: z.array(z.string()).optional(),
  linkedStudentIds: z.array(z.string()).optional(),
  managedPathIds: z.array(z.string()).optional(),
  managedSubjectIds: z.array(z.string()).optional(),
});

const adminUpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().optional(),
  role: z.enum(["student", "teacher", "admin", "supervisor", "school_admin", "parent"]).optional(),
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
  role: z.enum(["student", "teacher", "admin", "supervisor", "school_admin", "parent"]).optional(),
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
  platformTrainer: z.preprocess((value) => {
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
const adminBulkUserStatusSchema = z.object({
  userIds: z.array(z.string().trim().min(1)).min(1).max(100),
  isActive: z.boolean(),
});

const adminTrainersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
  status: z.enum(["active", "inactive", "unconfigured"]).optional(),
  pathId: z.string().trim().optional(),
  subjectId: z.string().trim().optional(),
  persona: z.enum(["platform", "hybrid"]).optional(),
});

const preferencesSchema = z.object({
  favorites: z.array(z.string()).optional(),
  reviewLater: z.array(z.string()).optional(),
  enrolledPaths: z.array(z.string()).optional(),
  completedLessons: z.array(z.string()).optional(),
  interactiveVideoProgress: z.array(z.object({
    courseId: z.string().min(1).max(160),
    lessonId: z.string().min(1).max(160),
    positionSeconds: z.number().finite().min(0).max(86_400),
    answeredQuestionIds: z.array(z.string().min(1).max(160)).max(100),
    updatedAt: z.number().int().positive(),
  })).max(100).optional(),
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
const buildDocumentQuery = (value: string) => {
  const trimmed = String(value || "").trim();
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    return {
      $or: [
        { id: trimmed },
        { _id: new mongoose.Types.ObjectId(trimmed) },
      ],
    };
  }
  return { id: trimmed };
};

const buildDocumentsQuery = (values: string[]) => {
  const normalized = Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
  if (!normalized.length) return { id: "__none__" };
  const objectIds = normalized
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return {
    $or: [
      { id: { $in: normalized } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};

const trainerOwnershipQuery = (trainerId: string) => ({
  $or: [
    { ownerId: trainerId },
    { createdBy: trainerId },
    { assignedTeacherId: trainerId },
  ],
});

const getTrainerPortfolioStats = async (ownership: ReturnType<typeof trainerOwnershipQuery>) => {
  const statusSummary = (model: any) => model.aggregate([
    { $match: ownership },
    { $group: { _id: { $ifNull: ["$approvalStatus", "draft"] }, count: { $sum: 1 } } },
  ]);
  const [courseCount, lessonCount, questionCount, quizCount, libraryCount, ...statusGroups] = await Promise.all([
    CourseModel.countDocuments(ownership),
    LessonModel.countDocuments(ownership),
    QuestionModel.countDocuments(ownership),
    QuizModel.countDocuments(ownership),
    LibraryItemModel.countDocuments(ownership),
    statusSummary(CourseModel),
    statusSummary(LessonModel),
    statusSummary(QuestionModel),
    statusSummary(QuizModel),
    statusSummary(LibraryItemModel),
    CourseModel.countDocuments({ ...ownership, approvalStatus: "approved", showOnPlatform: { $ne: false } }),
    LessonModel.countDocuments({ ...ownership, approvalStatus: "approved", showOnPlatform: { $ne: false } }),
    QuestionModel.countDocuments({ ...ownership, approvalStatus: "approved" }),
    QuizModel.countDocuments({ ...ownership, approvalStatus: "approved", showOnPlatform: { $ne: false } }),
    LibraryItemModel.countDocuments({ ...ownership, approvalStatus: "approved", showOnPlatform: { $ne: false } }),
    LessonModel.countDocuments({ ...ownership, type: "video" }),
  ]);
  const videos = Number(statusGroups.pop() || 0);
  const publishedCounts = statusGroups.splice(-5) as number[];
  const statuses = { draft: 0, pending_review: 0, approved: 0, rejected: 0, published: 0 };
  statusGroups.flat().forEach((group: any) => {
    const status = String(group._id || "draft") as keyof typeof statuses;
    if (status in statuses) statuses[status] += Number(group.count || 0);
  });
  statuses.published = publishedCounts.reduce((total, count) => total + Number(count || 0), 0);
  return {
    total: courseCount + lessonCount + questionCount + quizCount + libraryCount,
    courses: courseCount,
    lessons: lessonCount,
    videos,
    questions: questionCount,
    quizzes: quizCount,
    libraryItems: libraryCount,
    ...statuses,
  };
};

const getTrainerPortfolio = async (trainerId: string, includeItems = false) => {
  const ownership = trainerOwnershipQuery(trainerId);
  const statsPromise = getTrainerPortfolioStats(ownership);
  if (!includeItems) {
    return { stats: await statsPromise, items: undefined };
  }

  // The profile previews recent items only. Its summary must nevertheless stay
  // exact when a trainer owns more items than the preview limit.
  const limit = 100;
  const [courses, lessons, questions, quizzes, libraryItems, stats] = await Promise.all([
    CourseModel.find(ownership).sort({ updatedAt: -1 }).limit(limit).select("id _id title approvalStatus showOnPlatform pathId subjectId updatedAt").lean(),
    LessonModel.find(ownership).sort({ updatedAt: -1 }).limit(limit).select("id _id title type approvalStatus showOnPlatform pathId subjectId updatedAt").lean(),
    QuestionModel.find(ownership).sort({ updatedAt: -1 }).limit(limit).select("id _id text approvalStatus pathId subject updatedAt").lean(),
    QuizModel.find(ownership).sort({ updatedAt: -1 }).limit(limit).select("id _id title type approvalStatus showOnPlatform pathId subjectId updatedAt").lean(),
    LibraryItemModel.find(ownership).sort({ updatedAt: -1 }).limit(limit).select("id _id title type approvalStatus showOnPlatform pathId subjectId updatedAt").lean(),
    statsPromise,
  ]);
  return {
    stats,
    items: { courses, lessons, questions, quizzes, libraryItems },
  };
};

const getTrainerPerformance = async (trainerId: string) => {
  const courses = await CourseModel.find(trainerOwnershipQuery(trainerId)).select("_id modules").lean();
  const courseIds = courses.map((course: any) => String(course._id));
  const quizIds = (await QuizModel.find(trainerOwnershipQuery(trainerId)).select("id _id").lean())
    .map((quiz: any) => String(quiz.id || quiz._id));
  const [enrolledStudents, quizSummary] = await Promise.all([
    courseIds.length
      ? UserModel.find({ role: "student", enrolledCourses: { $in: courseIds } }).select("enrolledCourses completedLessons").lean()
      : [],
    quizIds.length
      ? QuizResultModel.aggregate([
          { $match: { quizId: { $in: quizIds } } },
          { $group: { _id: null, attempts: { $sum: 1 }, passed: { $sum: { $cond: ["$passed", 1, 0] } }, averageScore: { $avg: "$score" } } },
        ])
      : [],
  ]);
  const lessonIdsByCourse = new Map(courses.map((course: any) => [
    String(course._id),
    (course.modules || []).flatMap((module: any) => (module.lessons || []).map((lesson: any) => String(lesson.id))).filter(Boolean),
  ]));
  let measurableEnrollments = 0;
  let completedEnrollments = 0;
  for (const student of enrolledStudents as any[]) {
    const completedLessons = new Set((student.completedLessons || []).map(String));
    for (const courseId of (student.enrolledCourses || []).map(String).filter((id: string) => courseIds.includes(id))) {
      const lessonIds = lessonIdsByCourse.get(courseId) || [];
      if (!lessonIds.length) continue;
      measurableEnrollments += 1;
      if (lessonIds.every((lessonId: string) => completedLessons.has(lessonId))) completedEnrollments += 1;
    }
  }
  const results = quizSummary[0] || { attempts: 0, passed: 0, averageScore: null };
  return {
    enrolledStudents: enrolledStudents.length,
    measurableEnrollments,
    completedEnrollments,
    completionRate: measurableEnrollments ? Math.round((completedEnrollments / measurableEnrollments) * 100) : null,
    quizAttempts: Number(results.attempts || 0),
    passedQuizAttempts: Number(results.passed || 0),
    averageQuizScore: results.averageScore == null ? null : Math.round(Number(results.averageScore)),
    revenue: { available: false, reason: "لا يوجد مصدر إيراد أو دفع موثوق لحساب مستحقات المدرب." },
  };
};
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
const GOOGLE_OAUTH_STATE_COOKIE_NAME = "almeaa_google_oauth_state";
const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const googleOAuthStateCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
};

const normalizeOAuthReturnTo = (value: unknown) => {
  const candidate = typeof value === "string" ? value.trim() : "/";
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || /[\r\n]/.test(candidate)) {
    return "/";
  }
  return candidate;
};

const timingSafeStringEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

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

interface ResolvedGoogleOAuthConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const resolveGoogleOAuthConfig = async (): Promise<ResolvedGoogleOAuthConfig> => {
  try {
    const settings = await PlatformIntegrationSettingsModel.findOne({ key: "default" }).lean();
    if (settings) {
      const decrypted = decryptIntegrationSecretsForRuntime(settings as unknown as Record<string, unknown>);
      const googleProvider = (decrypted?.providers as any)?.google;
      if (googleProvider?.enabled) {
        const clientId = String(googleProvider.clientId || env.GOOGLE_CLIENT_ID || "").trim();
        const clientSecret = String(googleProvider.clientSecret || env.GOOGLE_CLIENT_SECRET || "").trim();
        const fallbackRedirectUri = `${env.CLIENT_URL.replace(/\/+$/, "")}/api/auth/google/callback`;
        const redirectUri = String(googleProvider.callbackUrl || env.GOOGLE_REDIRECT_URI || fallbackRedirectUri).trim();
        if (clientId && clientSecret && redirectUri) {
          return { enabled: true, clientId, clientSecret, redirectUri };
        }
      }
    }
  } catch (error) {
    console.warn("Failed to read Google OAuth settings from database:", error);
  }

  const enabled = Boolean(env.GOOGLE_OAUTH_ENABLED);
  const clientId = String(env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(env.GOOGLE_CLIENT_SECRET || "").trim();
  const fallbackRedirectUri = `${env.CLIENT_URL.replace(/\/+$/, "")}/api/auth/google/callback`;
  const redirectUri = String(env.GOOGLE_REDIRECT_URI || fallbackRedirectUri).trim();

  return {
    enabled: Boolean(enabled && clientId && clientSecret && redirectUri),
    clientId,
    clientSecret,
    redirectUri,
  };
};

export const authRouter = Router();
authRouter.use(csrfGuard);

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
    const oauthConfig = await resolveGoogleOAuthConfig();
    if (!oauthConfig.enabled) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Google login is disabled." });
    }
    if (!oauthConfig.clientId || !oauthConfig.clientSecret || !oauthConfig.redirectUri) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Google OAuth is not configured." });
    }
    const statePayload = {
      returnTo: normalizeOAuthReturnTo(req.query.returnTo),
      ts: Date.now(),
      nonce: createSecureToken(),
    };
    const state = Buffer.from(JSON.stringify(statePayload), "utf8").toString("base64url");
    res.cookie(GOOGLE_OAUTH_STATE_COOKIE_NAME, hashToken(state), {
      ...googleOAuthStateCookieOptions,
      maxAge: GOOGLE_OAUTH_STATE_TTL_MS,
    });
    const params = new URLSearchParams({
      client_id: oauthConfig.clientId,
      redirect_uri: oauthConfig.redirectUri,
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
  const oauthConfig = await resolveGoogleOAuthConfig();
  if (!oauthConfig.enabled || !oauthConfig.clientId || !oauthConfig.clientSecret || !oauthConfig.redirectUri) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Google login is disabled." });
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const stateRaw = typeof req.query.state === "string" ? req.query.state : "";
  const oauthError = typeof req.query.error === "string" ? req.query.error : "";

  const fallbackRedirect = `${env.CLIENT_URL}/#/login?oauth_error=google`;
  const expectedStateHash = String(req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE_NAME] || "").trim();
  res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE_NAME, googleOAuthStateCookieOptions);

  if (oauthError || !code) {
    return res.redirect(fallbackRedirect);
  }

  const actualStateHash = stateRaw ? hashToken(stateRaw) : "";
  if (!stateRaw || !expectedStateHash || !timingSafeStringEqual(actualStateHash, expectedStateHash)) {
    return res.redirect(`${fallbackRedirect}&step=state`);
  }

  let returnTo = "/";
  try {
    const parsed = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8")) as {
      returnTo?: unknown;
      ts?: unknown;
      nonce?: unknown;
    };
    const issuedAt = Number(parsed.ts || 0);
    const nonce = String(parsed.nonce || "");
    const now = Date.now();
    const stateExpired =
      !Number.isFinite(issuedAt) ||
      issuedAt <= 0 ||
      issuedAt > now + 60_000 ||
      now - issuedAt > GOOGLE_OAUTH_STATE_TTL_MS ||
      nonce.length < 32;
    if (stateExpired) {
      return res.redirect(`${fallbackRedirect}&step=state_expired`);
    }
    returnTo = normalizeOAuthReturnTo(parsed.returnTo);
  } catch {
    return res.redirect(`${fallbackRedirect}&step=state_payload`);
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.clientSecret,
      redirect_uri: oauthConfig.redirectUri,
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
  if (profile.email_verified !== true) {
    return res.redirect(`${fallbackRedirect}&step=email_unverified`);
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
      emailVerified: true,
      emailVerifiedAt: Date.now(),
    });
  } else {
    let touched = false;
    if (!user.avatar && profile.picture) {
      user.avatar = profile.picture;
      touched = true;
    }
    if (!user.emailVerified) {
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
    const isParentRole = payload.role === "parent";
    const linkedStudentCandidates = isParentRole ? (payload.linkedStudentIds || []).map(String) : [];
    const linkedStudents = linkedStudentCandidates.length
      ? await UserModel.find({
          ...buildDocumentsQuery(linkedStudentCandidates),
          role: "student",
        }).select("id _id")
      : [];
    const normalizedLinkedStudentIds = linkedStudents.map((student: any) => String(student.id || student._id || ""));

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
        linkedStudentIds: normalizedLinkedStudentIds,
        managedPathIds: payload.managedPathIds || [],
        managedSubjectIds: payload.managedSubjectIds || [],
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    await syncCanonicalParentRelationships({
      parentUserId: String(user.id || user._id),
      studentUserIds: isParentRole ? normalizedLinkedStudentIds : [],
      schoolId: isParentRole ? payload.schoolId || null : null,
      createdBy: String(req.authUser!.id),
    });

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
  "/admin/users/summary",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (_req, res) => {
    const [roles, inactive, platformTrainers] = await Promise.all([
      UserModel.aggregate([{ $group: { _id: "$role", total: { $sum: 1 } } }]),
      UserModel.countDocuments({ isActive: false }),
      UserModel.countDocuments({ role: "teacher", $or: [{ "managedPathIds.0": { $exists: true } }, { "managedSubjectIds.0": { $exists: true } }] }),
    ]);
    const byRole = Object.fromEntries(roles.map((row: any) => [String(row._id), Number(row.total || 0)]));
    return res.json({ total: Object.values(byRole).reduce((sum: number, value: any) => sum + Number(value || 0), 0), byRole, inactive, platformTrainers });
  }),
);

authRouter.patch(
  "/admin/users/bulk-status",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = adminBulkUserStatusSchema.parse(req.body);
    const ids = Array.from(new Set(payload.userIds.map(String)));
    const targets = await UserModel.find(buildDocumentsQuery(ids)).select("id _id role isActive").lean();
    const byId = new Map(targets.map((item: any) => [String(item.id || item._id), item]));
    const results: Array<{ userId: string; status: "updated" | "skipped" | "not_found"; reason?: string }> = [];
    const activeAdminCount = payload.isActive === false ? await UserModel.countDocuments({ role: "admin", isActive: { $ne: false } }) : 0;
    let remainingActiveAdmins = activeAdminCount;
    for (const id of ids) {
      const target = byId.get(id);
      if (!target) { results.push({ userId: id, status: "not_found" }); continue; }
      if (String(req.authUser!.id) === id && payload.isActive === false) { results.push({ userId: id, status: "skipped", reason: "cannot_deactivate_current_admin" }); continue; }
      if (payload.isActive === false && target.role === "admin") {
        if (remainingActiveAdmins <= 1) { results.push({ userId: id, status: "skipped", reason: "cannot_deactivate_last_admin" }); continue; }
        if (target.isActive !== false) remainingActiveAdmins -= 1;
      }
      if (Boolean(target.isActive !== false) === payload.isActive) { results.push({ userId: id, status: "skipped", reason: "already_in_requested_state" }); continue; }
      await UserModel.updateOne({ _id: (target as any)._id }, { $set: { isActive: payload.isActive } });
      results.push({ userId: id, status: "updated" });
    }
    await recordAdminAuditLog(req, { action: "auth.admin_user.bulk_status", resourceType: "user", resourceId: "bulk", metadata: { isActive: payload.isActive, results } });
    return res.json({ results });
  }),
);

authRouter.get(
  "/admin/users",
  requireAuth,
  requireRole(["admin", "supervisor", "teacher"]),
  asyncHandler(async (req, res) => {
    const query = adminUsersQuerySchema.parse(req.query);
    const authUser = req.authUser!;
    const maxLimit = authUser.role === "admin" ? 100 : 2000;
    
    const pagination = resolvePagination(
      { page: query.page, limit: Math.min(query.limit || 50, maxLimit) },
      { limit: 50 },
    );

    const search = query.search?.trim();
    const mongoQuery: Record<string, unknown> = {};

    if (query.platformTrainer) {
      if (authUser.role !== "admin") {
        return res.status(StatusCodes.FORBIDDEN).json({
          message: "Only platform administrators can browse the platform trainer directory.",
        });
      }

      mongoQuery.role = "teacher";
      mongoQuery.isActive = true;
    }

    if (query.role && !query.platformTrainer) {
      mongoQuery.role = query.role;
    }

    if (typeof query.isActive === "boolean" && !query.platformTrainer) {
      mongoQuery.isActive = query.isActive;
    }

    const andConditions: Record<string, unknown>[] = [];
    if (search) {
      const escapedSearch = escapeRegExp(search);
      andConditions.push({ $or: [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ] });
    }

    if (query.platformTrainer) {
      andConditions.push({
        $or: [
          { "managedPathIds.0": { $exists: true } },
          { "managedSubjectIds.0": { $exists: true } },
        ],
      });
    }

    if (andConditions.length === 1) {
      Object.assign(mongoQuery, andConditions[0]);
    } else if (andConditions.length > 1) {
      mongoQuery.$and = andConditions;
    }

    if (authUser.role !== "admin") {
      const authUserIdStr = String(authUser.id || (authUser as any)._id || "");
      const fullAuthUser = await UserModel.findById(authUser.id || (authUser as any)._id).lean();
      const userGroupIds = Array.isArray((fullAuthUser as any)?.groupIds)
        ? (fullAuthUser as any).groupIds.map(String)
        : Array.isArray((authUser as any).groupIds)
        ? (authUser as any).groupIds.map(String)
        : [];
      const userSchoolId = String((fullAuthUser as any)?.schoolId || authUser.schoolId || "").trim();

      const groupOrConditions: any[] = [
        { supervisorIds: authUserIdStr },
      ];
      if (userGroupIds.length > 0) {
        groupOrConditions.push(buildDocumentsQuery(userGroupIds));
      }
      if (userSchoolId) {
        groupOrConditions.push({
          $or: [
            { id: userSchoolId },
            ...(mongoose.Types.ObjectId.isValid(userSchoolId) ? [{ _id: userSchoolId }] : []),
            { parentId: userSchoolId },
          ],
        });
      }

      const supervisedGroups = await GroupModel.find({ $or: groupOrConditions }).lean();

      const scopedSchoolIds = new Set<string>();
      if (userSchoolId) scopedSchoolIds.add(userSchoolId);
      supervisedGroups.forEach((g: any) => {
        const gId = String(g.id || g._id || "");
        if (g.type === "SCHOOL") scopedSchoolIds.add(gId);
        if (g.parentId) scopedSchoolIds.add(String(g.parentId));
      });

      let childClasses: any[] = [];
      if (scopedSchoolIds.size > 0) {
        childClasses = await GroupModel.find({ parentId: { $in: Array.from(scopedSchoolIds) } }).lean();
      }

      const allSupervisedGroups = [...supervisedGroups, ...childClasses];
      const scopedGroupIds = Array.from(new Set(allSupervisedGroups.map((g: any) => String(g.id || g._id || ""))));
      const explicitStudentIds = Array.from(
        new Set(allSupervisedGroups.flatMap((g: any) => (g.studentIds || []).map(String))),
      );

      const scopeOr: any[] = [
        buildDocumentQuery(authUserIdStr),
        { groupIds: { $in: scopedGroupIds } },
      ];
      if (scopedSchoolIds.size > 0) {
        scopeOr.push({ schoolId: { $in: Array.from(scopedSchoolIds) } });
      }
      if (explicitStudentIds.length > 0) {
        scopeOr.push(buildDocumentsQuery(explicitStudentIds));
      }
      mongoQuery.$and = [{ $or: scopeOr }];
    }

    const [users, total] = await Promise.all([
      UserModel.find(mongoQuery).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
      UserModel.countDocuments(mongoQuery),
    ]);
    const pageUserIds = users.map((user: any) => String(user.id || user._id));
    const pageMemberships = authUser.role === "admin" && pageUserIds.length
      ? await SchoolMembershipModel.find({ userId: { $in: pageUserIds }, status: "active" }).select("userId schoolId role permissions").limit(2_000).lean()
      : [];
    const contextsByUser = new Map<string, any[]>();
    pageMemberships.forEach((membership: any) => {
      const key = String(membership.userId); const current = contextsByUser.get(key) || [];
      current.push({ schoolId: String(membership.schoolId), role: String(membership.role), permissions: (membership.permissions || []).map(String) }); contextsByUser.set(key, current);
    });

    return res.json({
      users: users.map((user: any) => ({ ...serializeUser(user), schoolContexts: contextsByUser.get(String(user.id || user._id)) || [] })),
      pagination: buildPaginatedResponse(users, pagination, total),
    });
  }),
);

authRouter.get(
  "/admin/trainers",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const query = adminTrainersQuerySchema.parse(req.query);
    const pagination = resolvePagination({ page: query.page, limit: query.limit || 25 }, { limit: 25 });
    const filters: Record<string, unknown>[] = [{ role: "teacher" }];
    if (query.status === "active") filters.push({ isActive: { $ne: false } });
    if (query.status === "inactive") filters.push({ isActive: false });
    if (query.status === "unconfigured") {
      filters.push({ managedPathIds: { $size: 0 }, managedSubjectIds: { $size: 0 } });
    }
    if (query.pathId) filters.push({ managedPathIds: query.pathId });
    if (query.subjectId) filters.push({ managedSubjectIds: query.subjectId });
    if (query.persona === "platform") {
      filters.push({ schoolId: { $in: [null, ""] }, groupIds: { $size: 0 } });
    }
    if (query.persona === "hybrid") {
      filters.push({ $or: [{ schoolId: { $nin: [null, ""] } }, { "groupIds.0": { $exists: true } }] });
    }
    if (query.search) {
      const escaped = escapeRegExp(query.search);
      filters.push({ $or: [{ name: { $regex: escaped, $options: "i" } }, { email: { $regex: escaped, $options: "i" } }] });
    }
    const mongoQuery = filters.length === 1 ? filters[0] : { $and: filters };
    const [trainers, total] = await Promise.all([
      UserModel.find(mongoQuery).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit).lean(),
      UserModel.countDocuments(mongoQuery),
    ]);
    const records = await Promise.all(trainers.map(async (trainer: any) => {
      const id = String(trainer.id || trainer._id);
      const [portfolio, schoolContexts] = await Promise.all([
        getTrainerPortfolio(id),
        SchoolMembershipModel.find({ userId: id, status: "active" }).select("schoolId role permissions").lean(),
      ]);
      const hasPlatformScope = Boolean(trainer.managedPathIds?.length || trainer.managedSubjectIds?.length);
      const hasSchoolContext = Boolean(trainer.schoolId || trainer.groupIds?.length || schoolContexts.length);
      return {
        ...serializeUser(trainer),
        persona: hasPlatformScope && hasSchoolContext ? "hybrid" : hasPlatformScope ? "platform" : "unconfigured",
        schoolContexts,
        portfolio: portfolio.stats,
      };
    }));
    return res.json({ trainers: records, pagination: buildPaginatedResponse(trainers, pagination, total) });
  }),
);

authRouter.get(
  "/admin/trainers/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const trainer = await UserModel.findOne(buildDocumentQuery(String(req.params.id || "").trim())).lean();
    if (!trainer || trainer.role !== "teacher") {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Trainer not found" });
    }
    const trainerId = String((trainer as any).id || (trainer as any)._id);
    const [portfolio, schoolContexts, performance] = await Promise.all([
      getTrainerPortfolio(trainerId, true),
      SchoolMembershipModel.find({ userId: trainerId, status: "active" }).select("schoolId role permissions").lean(),
      getTrainerPerformance(trainerId),
    ]);
    const hasPlatformScope = Boolean((trainer as any).managedPathIds?.length || (trainer as any).managedSubjectIds?.length);
    const hasSchoolContext = Boolean((trainer as any).schoolId || (trainer as any).groupIds?.length || schoolContexts.length);
    return res.json({
      trainer: {
        ...serializeUser(trainer),
        persona: hasPlatformScope && hasSchoolContext ? "hybrid" : hasPlatformScope ? "platform" : "unconfigured",
        schoolContexts,
        portfolio,
        performance,
      },
    });
  }),
);

authRouter.get(
  "/trainer/performance",
  requireAuth,
  requireRole(["teacher"]),
  asyncHandler(async (req, res) => {
    return res.json({ performance: await getTrainerPerformance(String(req.authUser!.id)) });
  }),
);

authRouter.patch(
  "/admin/users/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = adminUpdateUserSchema.parse(req.body);
    const targetId = String(req.params.id || "").trim();
    if (!targetId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "User id is required",
      });
    }

    const targetUser = await UserModel.findOne(buildDocumentQuery(targetId)).select("role schoolId groupIds");
    if (!targetUser) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    const nextPayload: Record<string, unknown> = { ...payload };
    const previousRole = String(targetUser.role || "").trim();
    const effectiveRole = String(payload.role || targetUser.role || "").trim();
    const roleChanged = Boolean(payload.role && effectiveRole !== previousRole);

    // School/group membership is role-specific. Never inherit a Student or Supervisor
    // relationship into a different role; the Admin must explicitly assign the new scope.
    if (roleChanged) {
      nextPayload.schoolId = null;
      nextPayload.groupIds = [];
      if (effectiveRole !== "parent" || previousRole !== "parent") {
        nextPayload.linkedStudentIds = [];
      }
    }
    if (Array.isArray(payload.linkedStudentIds)) {
      if (effectiveRole !== "parent") {
        nextPayload.linkedStudentIds = [];
      } else {
        const linkedStudents = await UserModel.find({
          ...buildDocumentsQuery(payload.linkedStudentIds.map(String)),
          role: "student",
        }).select("id _id");
        nextPayload.linkedStudentIds = linkedStudents.map((student: any) => String(student.id || student._id || ""));
      }
    }

    if (roleChanged) {
      const membershipUserId = String(targetUser.id || targetUser._id || targetId);
      const staleMembershipUpdates = [];
      if (previousRole === "student") {
        staleMembershipUpdates.push(
          GroupModel.updateMany({ studentIds: membershipUserId }, { $pull: { studentIds: membershipUserId } }),
        );
      }
      if (previousRole === "supervisor") {
        staleMembershipUpdates.push(
          GroupModel.updateMany({ supervisorIds: membershipUserId }, { $pull: { supervisorIds: membershipUserId } }),
        );
      }
      if (["student", "teacher", "supervisor", "school_admin", "parent"].includes(previousRole)) {
        staleMembershipUpdates.push(
          SchoolMembershipModel.updateMany(
            { userId: membershipUserId, role: previousRole, status: "active" },
            { $set: { status: "inactive" } },
          ),
        );
      }
      if (previousRole === "teacher") {
        staleMembershipUpdates.push(
          TeachingAssignmentModel.updateMany(
            { teacherId: membershipUserId, status: "active" },
            { $set: { status: "inactive" } },
          ),
        );
      }
      if (staleMembershipUpdates.length > 0) {
        await Promise.all(staleMembershipUpdates);
      }
    }

    const updated = await UserModel.findOneAndUpdate(buildDocumentQuery(targetId), nextPayload, { new: true });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
    }

    const shouldSyncParentRelationships =
      Array.isArray(payload.linkedStudentIds) ||
      (roleChanged && (previousRole === "parent" || effectiveRole === "parent"));
    if (shouldSyncParentRelationships) {
      await syncCanonicalParentRelationships({
        parentUserId: String(updated.id || updated._id),
        studentUserIds:
          effectiveRole === "parent" && Array.isArray(updated.linkedStudentIds)
            ? updated.linkedStudentIds.map(String)
            : [],
        schoolId: effectiveRole === "parent" ? String(updated.schoolId || "") : null,
        createdBy: String(req.authUser!.id),
      });
    }

    if (Array.isArray(payload.groupIds) && effectiveRole === "supervisor") {
      const membershipUserId = String(updated.id || updated._id || targetId);
      const desiredGroupIds = Array.from(new Set(payload.groupIds.map(String).filter(Boolean)));
      await GroupModel.updateMany({ supervisorIds: membershipUserId }, { $pull: { supervisorIds: membershipUserId } });
      if (desiredGroupIds.length > 0) {
        await GroupModel.updateMany(buildDocumentsQuery(desiredGroupIds), { $addToSet: { supervisorIds: membershipUserId } });
      }
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
    const authId = String(req.authUser?.id || "").trim();
    if (!authId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Authentication required",
      });
    }

    const user = await UserModel.findOne(buildDocumentQuery(authId));

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

    const authId = String(req.authUser?.id || "").trim();
    if (!authId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Authentication required",
      });
    }

    const user = await UserModel.findOneAndUpdate(buildDocumentQuery(authId), update, { new: true });
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

authRouter.delete(
  "/admin/users/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const targetId = String(req.params.id || "").trim();
    if (!targetId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "User id is required" });
    }

    if (String(req.authUser?.id || "") === targetId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "You cannot delete your current account." });
    }

    const target = await UserModel.findOne(buildDocumentQuery(targetId));
    if (!target) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
    }

    if (String(target.role || "") === "admin") {
      const adminsCount = await UserModel.countDocuments({ role: "admin" });
      if (adminsCount <= 1) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Cannot delete the last admin account." });
      }
    }

    const targetUserId = String(target.id || target._id);

    const lifecycle = await deleteUserLifecycle({
      targetUserId,
      targetMongoId: String(target._id),
      actorUserId: String(req.authUser!.id),
    });

    await recordAdminAuditLog(req, {
      action: "auth.admin_user.delete",
      resourceType: "user",
      resourceId: targetUserId,
      metadata: {
        targetRole: target.role,
        lifecycle,
      },
    });

    return res.json({ ok: true });
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
    const update: Record<string, unknown> = {};

    if (payload.favorites) {
      update.favorites = Array.from(new Set(payload.favorites));
    }

    if (payload.reviewLater) {
      update.reviewLater = Array.from(new Set(payload.reviewLater));
    }

    if (payload.enrolledPaths) {
      update.enrolledPaths = Array.from(new Set(payload.enrolledPaths));
    }

    if (payload.completedLessons) {
      update.completedLessons = Array.from(new Set(payload.completedLessons));
    }

    if (payload.interactiveVideoProgress) {
      const newestByLesson = new Map<string, typeof payload.interactiveVideoProgress[number]>();
      for (const item of payload.interactiveVideoProgress) {
        const key = `${item.courseId}:${item.lessonId}`;
        const previous = newestByLesson.get(key);
        if (!previous || item.updatedAt >= previous.updatedAt) newestByLesson.set(key, item);
      }
      update.interactiveVideoProgress = Array.from(newestByLesson.values())
        .sort((first, second) => second.updatedAt - first.updatedAt)
        .slice(0, 100)
        .map((item) => ({ ...item, answeredQuestionIds: Array.from(new Set(item.answeredQuestionIds)) }));
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

    if (Number(linkedPackage.maxStudents || 0) > 0) {
      const activeStudentGrants = await AccessGrantModel.countDocuments({
        packageId: String(linkedPackage.id || linkedPackage._id),
        status: "active",
        $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: Date.now() } }],
      });
      if (!isPackageSeatAvailable(linkedPackage.maxStudents, activeStudentGrants)) {
        return res.status(StatusCodes.CONFLICT).json({
          message: "اكتمل عدد المقاعد المتاحة لهذه الباقة",
        });
      }
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
      expiresAt: Number(reservedAccessCode.expiresAt || 0) || null,
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

    let resolvedUser = grantResult.user;
    const schoolId = String(accessCode.schoolId || linkedPackage.schoolId || "").trim();
    if (schoolId && String(user.role || "") === "student") {
      await Promise.all([
        UserModel.findByIdAndUpdate(user._id, {
          $set: { schoolId },
          $addToSet: { groupIds: schoolId },
        }),
        GroupModel.findOneAndUpdate(buildDocumentQuery(schoolId), {
          $addToSet: { studentIds: String(user.id || user._id) },
        }),
      ]);

      const schoolStudentCount = await UserModel.countDocuments({ schoolId, role: "student" });
      await GroupModel.findOneAndUpdate(buildDocumentQuery(schoolId), {
        $set: { totalStudents: schoolStudentCount },
      });
      resolvedUser = await UserModel.findById(user._id);
    }

    return res.json({
      user: serializeUser(resolvedUser),
      accessCode: reservedAccessCode,
      package: linkedPackage,
      accessGrant: grantResult.grant,
    });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// National ID Login — POST /api/auth/login/national-id
// Allows login using Saudi National ID (رقم الهوية) + password
// ─────────────────────────────────────────────────────────────────────────────
const nationalIdLoginSchema = z.object({
  nationalId: z.string().regex(/^[12]\d{9}$/, "National ID must be 10 digits starting with 1 or 2"),
  password: z.string().min(1).max(160),
});

authRouter.post(
  "/login/national-id",
  asyncHandler(async (req, res) => {
    const payload = nationalIdLoginSchema.parse(req.body);
    const user = await UserModel.findOne({ nationalId: payload.nationalId });

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "رقم الهوية أو كلمة المرور غير صحيحة" });
    }

    if (isLoginLocked(user)) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({ message: "تم تجاوز عدد المحاولات. حاول مجدداً بعد قليل." });
    }

    if (user.isActive === false) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "الحساب موقوف. تواصل مع الإدارة." });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      await recordFailedLogin(user);
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "رقم الهوية أو كلمة المرور غير صحيحة" });
    }

    await clearFailedLoginState(user);
    const token = signAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name });
    setAuthCookie(res, token);
    return res.json({
      ...(shouldExposeTokenInAuthResponse ? { token } : {}),
      user: serializeUser(user),
    });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Update National ID / Phone — PATCH /api/auth/me/identity
// Allows a logged-in user to set their nationalId and/or phone
// ─────────────────────────────────────────────────────────────────────────────
const identityUpdateSchema = z.object({
  nationalId: z.string().regex(/^[12]\d{9}$/).optional().nullable(),
  phone: z.string().min(8).max(24).optional().nullable(),
});

authRouter.patch(
  "/me/identity",
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const payload = identityUpdateSchema.parse(req.body);
    const update: Record<string, unknown> = {};

    if (payload.nationalId !== undefined) {
      // Check uniqueness
      if (payload.nationalId) {
        const conflict = await UserModel.findOne({ nationalId: payload.nationalId, _id: { $ne: req.user._id } });
        if (conflict) {
          return res.status(StatusCodes.CONFLICT).json({ message: "رقم الهوية مرتبط بحساب آخر" });
        }
      }
      update.nationalId = payload.nationalId || null;
    }

    if (payload.phone !== undefined) {
      update.phone = payload.phone ? normalizePhone(payload.phone) : "";
    }

    const user = await UserModel.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
    return res.json({ user: serializeUser(user) });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Parent ↔ Student Linking — POST /api/auth/parent/link-student
// Parent links a student via their nationalId OR phone number
// ─────────────────────────────────────────────────────────────────────────────
const linkStudentSchema = z.object({
  nationalId: z.string().regex(/^[12]\d{9}$/).optional(),
  phone: z.string().min(8).max(24).optional(),
}).refine((d) => d.nationalId || d.phone, { message: "يجب تقديم رقم الهوية أو رقم الجوال" });

authRouter.post(
  "/parent/link-student",
  requireAuth,
  asyncHandler(async (req: any, res) => {
    if (req.authUser?.role !== "parent") {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "هذا الإجراء متاح لأولياء الأمور فقط" });
    }

    const payload = linkStudentSchema.parse(req.body);
    void payload;

    // National ID or phone possession alone does not prove guardianship. Keep the
    // route stable but fail closed until a verified consent/approval flow exists.
    // Administrators can maintain linkedStudentIds through the audited admin route.
    return res.status(StatusCodes.FORBIDDEN).json({
      message: "ربط الطالب يتطلب اعتمادًا موثقًا من إدارة المدرسة أو موافقة الطالب.",
    });
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Unlink Student — DELETE /api/auth/parent/link-student/:studentId
// ─────────────────────────────────────────────────────────────────────────────
authRouter.delete(
  "/parent/link-student/:studentId",
  requireAuth,
  asyncHandler(async (req: any, res) => {
    if (req.authUser?.role !== "parent") {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "هذا الإجراء متاح لأولياء الأمور فقط" });
    }
    const { studentId } = req.params;
    const parentUserId = String(req.authUser!.id);
    await Promise.all([
      ParentStudentRelationshipModel.findOneAndUpdate(
        { parentUserId, studentUserId: String(studentId), status: "active" },
        { $set: { status: "revoked", revokedAt: Date.now(), revokedBy: parentUserId } },
      ),
      UserModel.findByIdAndUpdate(parentUserId, { $pull: { linkedStudentIds: studentId } }),
    ]);
    return res.json({ message: "تم إلغاء ربط الطالب" });
  }),
);

// ──────────────────────────────────────────────────────────────────────────────
// Get Linked Students — GET /api/auth/parent/linked-students
// ──────────────────────────────────────────────────────────────────────────────
authRouter.get(
  "/parent/linked-students",
  requireAuth,
  asyncHandler(async (req: any, res) => {
    if (req.authUser?.role !== "parent") {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "هذا الإجراء متاح لأولياء الأمور فقط" });
    }
    const ids = await getAuthorizedStudentIdsForParent(String(req.authUser!.id));
    if (ids.length === 0) return res.json({ students: [] });

    const students = await UserModel.find({ $or: [{ _id: { $in: ids } }, { id: { $in: ids } }] })
      .select("_id name role schoolId")
      .lean();

    return res.json({
      students: students.map((s: any) => ({
        id: s._id.toString(),
        name: s.name,
        role: s.role,
        schoolId: s.schoolId ?? null,
      })),
    });
  }),
);

// ──────────────────────────────────────────────────────────────────────────────
// Phone + Password Login — POST /api/auth/login/phone-password
// Allows login using registered phone number + password (alternative to OTP)
// ──────────────────────────────────────────────────────────────────────────────
const phonePasswordLoginSchema = z.object({
  phone: z.string().min(8).max(24),
  password: z.string().min(1).max(160),
});

authRouter.post(
  "/login/phone-password",
  asyncHandler(async (req, res) => {
    const payload = phonePasswordLoginSchema.parse(req.body);
    const normalized = normalizePhone(payload.phone);

    const user = await UserModel.findOne({ phone: normalized });
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "رقم الجوال أو كلمة المرور غير صحيحة" });
    }

    if (isLoginLocked(user)) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({ message: "تم تجاوز عدد المحاولات. حاول مجدداً بعد قليل." });
    }

    if (user.isActive === false) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "الحساب موقوف. تواصل مع الإدارة." });
    }

    if (!user.passwordHash) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "لا توجد كلمة مرور مضبوطة لهذا الحساب — استخدم رمز واتساب بدلاً" });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      await recordFailedLogin(user);
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "رقم الجوال أو كلمة المرور غير صحيحة" });
    }

    await clearFailedLoginState(user);
    const token = signAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name });
    setAuthCookie(res, token);
    return res.json({
      ...(shouldExposeTokenInAuthResponse ? { token } : {}),
      user: serializeUser(user),
    });
  }),
);

