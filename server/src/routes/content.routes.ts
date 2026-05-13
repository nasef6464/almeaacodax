import { Router } from "express";
import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { z } from "zod";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { TopicModel } from "../models/Topic.js";
import { LessonModel } from "../models/Lesson.js";
import { LibraryItemModel } from "../models/LibraryItem.js";
import { GroupModel } from "../models/Group.js";
import { B2BPackageModel } from "../models/B2BPackage.js";
import { AccessCodeModel } from "../models/AccessCode.js";
import { UserModel } from "../models/User.js";
import { QuizResultModel } from "../models/QuizResult.js";
import { HomepageSettingsModel } from "../models/HomepageSettings.js";
import { PlatformFontSettingsModel } from "../models/PlatformFontSettings.js";
import { StudyPlanModel } from "../models/StudyPlan.js";
import { AnnouncementAdModel } from "../models/AnnouncementAd.js";
import { getActivePathIds, isStaffRole } from "../services/visibility.js";
import { buildPaginatedResponse, resolvePagination } from "../utils/pagination.js";

const topicSchema = z.object({
  id: z.string().optional(),
  pathId: z.string().min(1),
  subjectId: z.string().min(1),
  sectionId: z.string().nullable().optional(),
  title: z.string().min(1),
  parentId: z.string().nullable().optional(),
  order: z.number().default(0),
  showOnPlatform: z.boolean().default(true),
  isLocked: z.boolean().default(false),
  lessonIds: z.array(z.string()).default([]),
  quizIds: z.array(z.string()).default([]),
  libraryItemIds: z.array(z.string()).default([]),
});

const topicUpdateSchema = z.object({
  id: z.string().optional(),
  pathId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  sectionId: z.string().nullable().optional(),
  title: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().optional(),
  showOnPlatform: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  lessonIds: z.array(z.string()).optional(),
  quizIds: z.array(z.string()).optional(),
  libraryItemIds: z.array(z.string()).optional(),
});

const lessonSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  pathId: z.string().min(1),
  subjectId: z.string().min(1),
  sectionId: z.string().nullable().optional(),
  type: z.enum(["video", "quiz", "file", "assignment", "text", "live_youtube", "zoom", "google_meet", "teams"]),
  duration: z.string().default(""),
  content: z.string().optional(),
  videoUrl: z.string().optional(),
  videoSource: z.enum(["upload", "youtube", "vimeo"]).optional(),
  interactiveQuestions: z
    .array(
      z.object({
        id: z.string().min(1),
        timestamp: z.number().min(0),
        questionId: z.string().optional(),
        inlineQuestion: z
          .object({
            text: z.string().min(1),
            options: z.array(z.string()).min(2),
            correctOptionIndex: z.number().min(0),
          })
          .optional(),
        mustPass: z.boolean().default(false),
        actionOnFail: z.enum(["rewatch", "continue"]).default("continue"),
        rewatchTimestamp: z.number().min(0).optional(),
      }),
    )
    .default([]),
  fileUrl: z.string().optional(),
  meetingUrl: z.string().optional(),
  meetingDate: z.string().optional(),
  recordingUrl: z.string().optional(),
  joinInstructions: z.string().optional(),
  showRecordingOnPlatform: z.boolean().optional(),
  showOnPlatform: z.boolean().default(true),
  quizId: z.string().nullable().optional(),
  order: z.number().default(0),
  isLocked: z.boolean().default(false),
  skillIds: z.array(z.string()).min(1),
  ownerType: z.enum(["platform", "teacher", "school"]).optional(),
  ownerId: z.string().optional(),
  createdBy: z.string().optional(),
  assignedTeacherId: z.string().optional(),
  approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.number().nullable().optional(),
  reviewerNotes: z.string().optional(),
  revenueSharePercentage: z.number().nullable().optional(),
});

const sanitizeVideoUrl = (rawUrl?: string | null) => {
  if (!rawUrl) return "";

  let trimmedUrl = rawUrl.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmedUrl) return "";

  trimmedUrl = trimmedUrl
    .replace(/^https?:\/\/https?:\/\//i, "https://")
    .replace(/^https?:\/\/:\/\//i, "https://")
    .replace(/^:\/\//, "https://")
    .replace(/^\/\//, "https://");

  if (/^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//i.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
};

const sanitizeLessonPayload = <T extends { videoUrl?: string; meetingUrl?: string; recordingUrl?: string; fileUrl?: string }>(payload: T): T => ({
  ...payload,
  ...(payload.videoUrl !== undefined ? { videoUrl: sanitizeVideoUrl(payload.videoUrl) } : {}),
  ...(payload.meetingUrl !== undefined ? { meetingUrl: sanitizeVideoUrl(payload.meetingUrl) } : {}),
  ...(payload.recordingUrl !== undefined ? { recordingUrl: sanitizeVideoUrl(payload.recordingUrl) } : {}),
  ...(payload.fileUrl !== undefined ? { fileUrl: sanitizeVideoUrl(payload.fileUrl) } : {}),
});

const buildDocumentQuery = (value: string) => {
  if (mongoose.Types.ObjectId.isValid(value)) {
    return { $or: [{ id: value }, { _id: value }] };
  }

  return { id: value };
};

const announcementAdSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  body: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  ctaLabel: z.string().optional().default(""),
  ctaUrl: z.string().optional().default(""),
  audience: z.enum(["all", "guest", "student", "parent", "staff"]).default("all"),
  displayMode: z.enum(["modal", "top-banner"]).default("modal"),
  frequency: z.enum(["always", "session", "once"]).default("session"),
  imageFit: z.enum(["cover", "contain"]).default("cover"),
  delaySeconds: z.number().min(0).max(30).default(0),
  isActive: z.boolean().default(true),
  priority: z.number().default(0),
  startsAt: z.number().nullable().optional(),
  endsAt: z.number().nullable().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

const announcementAdUpdateSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  imageUrl: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
  audience: z.enum(["all", "guest", "student", "parent", "staff"]).optional(),
  displayMode: z.enum(["modal", "top-banner"]).optional(),
  frequency: z.enum(["always", "session", "once"]).optional(),
  imageFit: z.enum(["cover", "contain"]).optional(),
  delaySeconds: z.number().min(0).max(30).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().optional(),
  startsAt: z.number().nullable().optional(),
  endsAt: z.number().nullable().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

const platformFontUploadSchema = z.object({
  name: z.string().max(80).optional().default(""),
  dataUrl: z
    .string()
    .max(700_000)
    .regex(/^data:font\/(woff2?|ttf|otf);base64,[A-Za-z0-9+/=]+$/)
    .optional()
    .or(z.literal("")),
  fileName: z.string().max(160).optional().default(""),
  mimeType: z.string().max(80).optional().default(""),
  size: z.number().min(0).max(500_000).optional().default(0),
});

const platformFontFamilySchema = z
  .enum([
    "tajawal",
    "cairo",
    "almarai",
    "readex-pro",
    "ibm-plex-sans-arabic",
    "noto-naskh-arabic",
    "noto-kufi-arabic",
    "system",
    "custom",
  ])
  .default("tajawal");
const platformFontSizeSchema = z.string().regex(/^\d{1,2}(\.\d)?(px|rem)$/).optional().or(z.literal(""));
const platformFontWeightSchema = z
  .enum(["300", "400", "500", "600", "700", "800", "900", "normal", "bold"])
  .optional()
  .or(z.literal(""));
const platformFontColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal(""));

const platformFontSettingsSchema = z.object({
  bodyFont: platformFontFamilySchema,
  headingFont: platformFontFamilySchema,
  navigationFont: platformFontFamilySchema,
  buttonFont: platformFontFamilySchema,
  bodySize: platformFontSizeSchema,
  headingSize: platformFontSizeSchema,
  navigationSize: platformFontSizeSchema,
  buttonSize: platformFontSizeSchema,
  bodyWeight: platformFontWeightSchema,
  headingWeight: platformFontWeightSchema,
  navigationWeight: platformFontWeightSchema,
  buttonWeight: platformFontWeightSchema,
  bodyColor: platformFontColorSchema,
  headingColor: platformFontColorSchema,
  navigationColor: platformFontColorSchema,
  buttonColor: platformFontColorSchema,
  bodyCustomFont: platformFontUploadSchema.optional(),
  headingCustomFont: platformFontUploadSchema.optional(),
});

const CONTENT_BOOTSTRAP_CACHE_TTL_MS = 45 * 1000;
const PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT = 8;
type PublicContentBootstrapPayload = {
  topics: unknown[];
  lessons: unknown[];
  libraryItems: unknown[];
  groups: unknown[];
  b2bPackages: unknown[];
  accessCodes: unknown[];
  announcementAds: unknown[];
  studyPlans: unknown[];
};
let publicContentBootstrapCache:
  | {
      expiresAt: number;
      payload: PublicContentBootstrapPayload;
    }
  | null = null;
let publicContentBootstrapPromise: Promise<PublicContentBootstrapPayload> | null = null;

const clearContentBootstrapCache = () => {
  publicContentBootstrapCache = null;
  publicContentBootstrapPromise = null;
};

const scopeFilterToActivePaths = <T extends Record<string, unknown>>(baseFilter: T, activePathIds: string[], pathField = "pathId") => ({
  $and: [
    baseFilter,
    {
      $or: [
        { [pathField]: { $in: activePathIds } },
        { [pathField]: { $exists: false } },
        { [pathField]: "" },
        { [pathField]: null },
      ],
    },
  ],
});

const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];

const getModelDocumentId = (document: { id?: unknown; _id?: unknown }) => String(document.id || document._id || "");

const buildDocumentsByIdsQuery = (values: string[]) => {
  const ids = uniqueStrings(values.map((value) => String(value || "").trim()));
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return {
    $or: [
      { id: { $in: ids } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};

const buildOwnedDocumentQuery = (
  value: string,
  authUser: { id: string; role: string; schoolId?: string | null },
) => {
  const baseQuery = buildDocumentQuery(value);

  if (authUser.role === "admin") {
    return baseQuery;
  }

  const ownershipConditions: Array<Record<string, string>> = [
    { ownerId: authUser.id },
    { createdBy: authUser.id },
    { assignedTeacherId: authUser.id },
  ];

  if (authUser.schoolId) {
    ownershipConditions.push({ ownerId: authUser.schoolId }, { createdBy: authUser.schoolId });
  }

  return { $and: [baseQuery, { $or: ownershipConditions }] };
};

const getScopedOperationalData = async (authUser?: { id: string; role: string; schoolId?: string | null }) => {
  if (authUser?.role === "admin") {
    const [groups, b2bPackages, accessCodes, announcementAds] = await Promise.all([
      GroupModel.find().sort({ createdAt: -1 }),
      B2BPackageModel.find().sort({ createdAt: -1 }),
      AccessCodeModel.find().sort({ createdAt: -1 }),
      AnnouncementAdModel.find().sort({ priority: 1, createdAt: -1 }),
    ]);

    return { groups, b2bPackages, accessCodes, announcementAds };
  }

  if (!authUser) {
    const announcementAds = await AnnouncementAdModel.find({ isActive: true })
      .sort({ priority: 1, createdAt: -1 })
      .limit(PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT)
      .lean();
    return { groups: [], b2bPackages: [], accessCodes: [], announcementAds };
  }

  const user = await UserModel.findById(authUser.id).select("schoolId groupIds linkedStudentIds role");
  if (!user) {
    const announcementAds = await AnnouncementAdModel.find({ isActive: true })
      .sort({ priority: 1, createdAt: -1 })
      .limit(PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT);
    return { groups: [], b2bPackages: [], accessCodes: [], announcementAds };
  }

  const managedGroups =
    user.role === "teacher" || user.role === "supervisor"
      ? await GroupModel.find({
          $or: [
            { ownerId: authUser.id },
            { supervisorIds: authUser.id },
            ...(authUser.schoolId ? [{ parentId: authUser.schoolId }, { _id: authUser.schoolId }, { id: authUser.schoolId }] : []),
          ],
        }).select("id _id parentId type")
      : [];

  const linkedStudents =
    user.role === "parent" && Array.isArray(user.linkedStudentIds) && user.linkedStudentIds.length
      ? await UserModel.find(buildDocumentsByIdsQuery(user.linkedStudentIds.map(String))).select("schoolId groupIds")
      : [];

  const seedGroupIds = uniqueStrings([
    String(user.schoolId || ""),
    ...(user.groupIds || []).map(String),
    ...managedGroups.flatMap((group) => [String(group.id || group._id), String(group.parentId || "")]),
    ...linkedStudents.flatMap((student) => [String(student.schoolId || ""), ...(student.groupIds || []).map(String)]),
  ]);

  if (seedGroupIds.length === 0) {
    const announcementAds = await AnnouncementAdModel.find({ isActive: true })
      .sort({ priority: 1, createdAt: -1 })
      .limit(PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT);
    return { groups: [], b2bPackages: [], accessCodes: [], announcementAds };
  }

  const seedGroups = await GroupModel.find(buildDocumentsByIdsQuery(seedGroupIds)).sort({ createdAt: -1 });
  const schoolIds = uniqueStrings([
    String(user.schoolId || ""),
    ...linkedStudents.map((student) => String(student.schoolId || "")),
    ...seedGroups
      .filter((group) => group.type === "SCHOOL")
      .map((group) => String(group.id || group._id)),
    ...seedGroups.map((group) => String(group.parentId || "")),
  ]);
  const visibleGroupIds = uniqueStrings([...seedGroupIds, ...schoolIds]);
  const groups = visibleGroupIds.length
    ? await GroupModel.find(buildDocumentsByIdsQuery(visibleGroupIds)).sort({ createdAt: -1 })
    : [];
  const [b2bPackages, accessCodes, announcementAds] = await Promise.all([
    schoolIds.length ? B2BPackageModel.find({ schoolId: { $in: schoolIds } }).sort({ createdAt: -1 }) : Promise.resolve([]),
    user.role === "supervisor" && schoolIds.length
      ? AccessCodeModel.find({ schoolId: { $in: schoolIds } }).sort({ createdAt: -1 })
      : Promise.resolve([]),
    AnnouncementAdModel.find({ isActive: true })
      .sort({ priority: 1, createdAt: -1 })
      .limit(PUBLIC_ANNOUNCEMENT_ADS_BOOTSTRAP_LIMIT),
  ]);

  return { groups, b2bPackages, accessCodes, announcementAds };
};

const getWorkflowDefaults = (authUser?: { id: string; role: string; schoolId?: string | null }) => {
  if (!authUser) {
    return {};
  }

  if (authUser.role === "admin") {
    return {
      ownerType: "platform",
      ownerId: authUser.id,
      createdBy: authUser.id,
      approvalStatus: "approved",
      approvedBy: authUser.id,
      approvedAt: Date.now(),
    };
  }

  if (authUser.role === "teacher") {
    return {
      ownerType: "teacher",
      ownerId: authUser.id,
      createdBy: authUser.id,
      assignedTeacherId: authUser.id,
      approvalStatus: "pending_review",
      approvedBy: "",
      approvedAt: null,
    };
  }

  return {
    ownerType: "school",
    ownerId: authUser.schoolId || authUser.id,
    createdBy: authUser.id,
    approvalStatus: "pending_review",
    approvedBy: "",
    approvedAt: null,
  };
};

const sanitizeWorkflowUpdate = (
  payload: Record<string, unknown>,
  authUser: { id: string; role: string; schoolId?: string | null },
) => {
  const nextPayload = { ...payload };

  if (authUser.role !== "admin") {
    delete nextPayload.ownerType;
    delete nextPayload.ownerId;
    delete nextPayload.createdBy;
    delete nextPayload.approvedBy;
    delete nextPayload.approvedAt;
    delete nextPayload.reviewerNotes;
    delete nextPayload.revenueSharePercentage;
    if (typeof nextPayload.approvalStatus === "string" && nextPayload.approvalStatus === "approved") {
      nextPayload.approvalStatus = "pending_review";
    }
  } else if (typeof nextPayload.approvalStatus === "string") {
    if (nextPayload.approvalStatus === "approved") {
      nextPayload.approvedBy = authUser.id;
      nextPayload.approvedAt = Date.now();
    } else if (nextPayload.approvalStatus === "rejected" || nextPayload.approvalStatus === "pending_review") {
      nextPayload.approvedBy = "";
      nextPayload.approvedAt = null;
    }
  }

  return nextPayload;
};

const librarySchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  size: z.string().default(""),
  downloads: z.number().default(0),
  type: z.enum(["pdf", "doc", "video"]).default("pdf"),
  pathId: z.string().min(1),
  subjectId: z.string().min(1),
  sectionId: z.string().nullable().optional(),
  skillIds: z.array(z.string()).min(1),
  url: z.string().optional(),
  showOnPlatform: z.boolean().default(true),
  isLocked: z.boolean().default(false),
  ownerType: z.enum(["platform", "teacher", "school"]).optional(),
  ownerId: z.string().optional(),
  createdBy: z.string().optional(),
  assignedTeacherId: z.string().optional(),
  approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.number().nullable().optional(),
  reviewerNotes: z.string().optional(),
  revenueSharePercentage: z.number().nullable().optional(),
});

const libraryUpdateSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).optional(),
  size: z.string().optional(),
  downloads: z.number().optional(),
  type: z.enum(["pdf", "doc", "video"]).optional(),
  pathId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  sectionId: z.string().nullable().optional(),
  skillIds: z.array(z.string()).min(1).optional(),
  url: z.string().optional(),
  showOnPlatform: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  ownerType: z.enum(["platform", "teacher", "school"]).optional(),
  ownerId: z.string().optional(),
  createdBy: z.string().optional(),
  assignedTeacherId: z.string().optional(),
  approvalStatus: z.enum(["draft", "pending_review", "approved", "rejected"]).optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.number().nullable().optional(),
  reviewerNotes: z.string().optional(),
  revenueSharePercentage: z.number().nullable().optional(),
});

const groupSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["SCHOOL", "CLASS", "PRIVATE_GROUP"]),
  parentId: z.string().nullable().optional(),
  ownerId: z.string().min(1),
  supervisorIds: z.array(z.string()).default([]),
  studentIds: z.array(z.string()).default([]),
  courseIds: z.array(z.string()).default([]),
  totalStudents: z.number().optional(),
  totalSupervisors: z.number().optional(),
  totalCourses: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

const b2bPackageSchema = z.object({
  id: z.string().optional(),
  schoolId: z.string().min(1),
  name: z.string().min(1),
  assignedTeacherId: z.string().optional(),
  revenueSharePercentage: z.number().nullable().optional(),
  courseIds: z.array(z.string()).default([]),
  contentTypes: z.array(z.enum(["courses", "foundation", "banks", "tests", "library", "all"])).default(["all"]),
  pathIds: z.array(z.string()).default([]),
  subjectIds: z.array(z.string()).default([]),
  type: z.enum(["free_access", "discounted"]).default("free_access"),
  discountPercentage: z.number().nullable().optional(),
  maxStudents: z.number().min(0).default(0),
  status: z.enum(["active", "expired"]).default("active"),
  createdAt: z.number().optional(),
});

const accessCodeSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1),
  schoolId: z.string().min(1),
  packageId: z.string().min(1),
  maxUses: z.number().min(1).default(1),
  currentUses: z.number().min(0).default(0),
  expiresAt: z.number(),
  createdAt: z.number().optional(),
});

const studyPlanSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  name: z.string().min(1),
  pathId: z.string().min(1),
  subjectIds: z.array(z.string()).default([]),
  courseIds: z.array(z.string()).default([]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  skipCompletedQuizzes: z.boolean().default(true),
  offDays: z.array(z.enum(["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"])).default([]),
  dailyMinutes: z.number().min(15).default(90),
  preferredStartTime: z.string().optional(),
  status: z.enum(["active", "archived"]).default("active"),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

const schoolImportRowSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  classId: z.string().optional(),
  className: z.string().optional(),
  password: z.string().min(6).optional(),
});

const schoolImportSchema = z.object({
  rows: z.array(schoolImportRowSchema).min(1),
});

const homepageStatSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  mode: z.enum(["dynamic", "manual"]).default("dynamic"),
  source: z.enum(["students", "courses", "assets", "rating"]).default("students"),
  manualValue: z.string().optional(),
});

const homepageTestimonialSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  degree: z.string().optional(),
  text: z.string().min(1),
  image: z.string().optional(),
});

const homepageSettingsSchema = z.object({
  hero: z
    .object({
      badgeText: z.string().optional(),
      titlePrefix: z.string().optional(),
      titleHighlight: z.string().optional(),
      titleSuffix: z.string().optional(),
      description: z.string().optional(),
      primaryCtaLabel: z.string().optional(),
      primaryCtaLink: z.string().optional(),
      secondaryCtaLabel: z.string().optional(),
      secondaryCtaLink: z.string().optional(),
      imageUrl: z.string().optional(),
      imageAlt: z.string().optional(),
      floatingCardTitle: z.string().optional(),
      floatingCardSubtitle: z.string().optional(),
      floatingCardProgressLabel: z.string().optional(),
      floatingCardProgressValue: z.string().optional(),
    })
    .optional(),
  stats: z.array(homepageStatSchema).optional(),
  testimonials: z.array(homepageTestimonialSchema).optional(),
  sections: z
    .object({
      featuredCoursesTitle: z.string().optional(),
      featuredCoursesSubtitle: z.string().optional(),
      featuredArticlesTitle: z.string().optional(),
      featuredArticlesSubtitle: z.string().optional(),
      whyChooseTitle: z.string().optional(),
      whyChooseDescription: z.string().optional(),
      testimonialsTitle: z.string().optional(),
      testimonialsSubtitle: z.string().optional(),
    })
    .optional(),
  typography: z
    .object({
      headingFont: z.enum(["tajawal", "system", "serif"]).optional(),
      bodyFont: z.enum(["tajawal", "system", "serif"]).optional(),
      headingWeight: z.enum(["bold", "black"]).optional(),
    })
    .optional(),
  featuredPathIds: z.array(z.string()).optional(),
  featuredCourseIds: z.array(z.string()).optional(),
  featuredArticleLessonIds: z.array(z.string()).optional(),
});

const defaultHomepageSettings = {
  key: "default",
  hero: {
    badgeText: "المنصة الأولى للقدرات والتحصيلي",
    titlePrefix: "حقق",
    titleHighlight: "المئة",
    titleSuffix: "في اختباراتك",
    description:
      "رحلة تعليمية ذكية تجمع بين التدريب المكثف، الشروحات التفاعلية، والتحليل الدقيق لنقاط ضعفك لضمان أعلى الدرجات.",
    primaryCtaLabel: "ابدأ التدريب مجانًا",
    primaryCtaLink: "/dashboard",
    secondaryCtaLabel: "تصفح الدورات",
    secondaryCtaLink: "/courses",
    imageUrl: "/images/homepage-hero-boy-platform.jpg?v=20260512",
    imageAlt: "طالب يستخدم منصة المئة",
    floatingCardTitle: "منصة المئة",
    floatingCardSubtitle: "مستواك: متقدم",
    floatingCardProgressLabel: "التقدم",
    floatingCardProgressValue: "75%",
  },
  stats: [
    { id: "students", label: "طالب وطالبة", mode: "dynamic", source: "students", manualValue: "" },
    { id: "courses", label: "دورة تدريبية", mode: "dynamic", source: "courses", manualValue: "" },
    { id: "assets", label: "مواد تعليمية", mode: "dynamic", source: "assets", manualValue: "" },
    { id: "rating", label: "تقييم عام", mode: "dynamic", source: "rating", manualValue: "" },
  ],
  sections: {
    featuredCoursesTitle: "الدورات الأكثر طلبًا",
    featuredCoursesSubtitle: "اختر دورتك وابدأ رحلة التفوق اليوم",
    whyChooseTitle: "لماذا يختار الطلاب منصة المئة؟",
    whyChooseDescription:
      "نحن لا نقدم مجرد دورات، بل نقدم نظامًا بيئيًا متكاملًا يضمن لك الفهم العميق والتدريب المستمر.",
    testimonialsTitle: "قصص نجاح نعتز بها",
    testimonialsSubtitle: "انضم لآلاف الطلاب الذين حققوا أحلامهم معنا",
  },
  testimonials: [
    {
      id: "t1",
      name: "سارة العتيبي",
      degree: "98% قدرات",
      text: "المنصة غيرت طريقة مذاكرتي تمامًا. تحليل نقاط الضعف ساعدني أركز جهدي في المكان الصح.",
      image: "https://i.pravatar.cc/100?img=5",
    },
    {
      id: "t2",
      name: "فهد الشمري",
      degree: "96% تحصيلي",
      text: "شروحات الفيزياء والكيمياء بسطت لي المعلومات بشكل عجيب. شكرًا لكل القائمين على المنصة.",
      image: "https://i.pravatar.cc/100?img=11",
    },
    {
      id: "t3",
      name: "نورة السالم",
      degree: "99% قدرات",
      text: "اختبارات المحاكاة كانت مطابقة جدًا للاختبار الحقيقي، دخلت الاختبار وأنا واثقة جدًا.",
      image: "https://i.pravatar.cc/100?img=9",
    },
  ],
  typography: {
    headingFont: "tajawal",
    bodyFont: "tajawal",
    headingWeight: "black",
  },
  featuredPathIds: [],
  featuredCourseIds: [],
  featuredArticleLessonIds: [],
};

const defaultPlatformFontSettings = {
  key: "default",
  bodyFont: "tajawal",
  headingFont: "tajawal",
  navigationFont: "tajawal",
  buttonFont: "tajawal",
  bodySize: "",
  headingSize: "",
  navigationSize: "",
  buttonSize: "",
  bodyWeight: "",
  headingWeight: "",
  navigationWeight: "",
  buttonWeight: "",
  bodyColor: "",
  headingColor: "",
  navigationColor: "",
  buttonColor: "",
  bodyCustomFont: {},
  headingCustomFont: {},
};

export const contentRouter = Router();

contentRouter.use((req, _res, next) => {
  if (req.method !== "GET") {
    clearContentBootstrapCache();
  }
  next();
});

contentRouter.get(
  "/homepage-settings",
  optionalAuth,
  asyncHandler(async (_req, res) => {
    let settings = await HomepageSettingsModel.findOne({ key: "default" });
    if (!settings) {
      settings = await HomepageSettingsModel.create(defaultHomepageSettings);
    }

    return res.json(settings);
  }),
);

contentRouter.patch(
  "/homepage-settings",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = homepageSettingsSchema.parse(req.body);
    const settings = await HomepageSettingsModel.findOneAndUpdate(
      { key: "default" },
      { $set: payload, $setOnInsert: { key: "default" } },
      { new: true, upsert: true },
    );

    return res.json(settings);
  }),
);

contentRouter.get(
  "/platform-font-settings",
  optionalAuth,
  asyncHandler(async (_req, res) => {
    let settings = await PlatformFontSettingsModel.findOne({ key: "default" });
    if (!settings) {
      settings = await PlatformFontSettingsModel.create(defaultPlatformFontSettings);
    }

    return res.json(settings);
  }),
);

contentRouter.patch(
  "/platform-font-settings",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = platformFontSettingsSchema.parse(req.body);
    const settings = await PlatformFontSettingsModel.findOneAndUpdate(
      { key: "default" },
      { $set: payload, $setOnInsert: { key: "default" } },
      { new: true, upsert: true },
    );

    return res.json(settings);
  }),
);

contentRouter.get(
  "/bootstrap",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const canUsePublicCache = !req.authUser;
    if (canUsePublicCache && publicContentBootstrapCache && publicContentBootstrapCache.expiresAt > Date.now()) {
      res.setHeader("Cache-Control", "private, max-age=45");
      res.setHeader("X-Content-Cache", "hit");
      return res.json(publicContentBootstrapCache.payload);
    }

    if (canUsePublicCache && publicContentBootstrapPromise) {
      const payload = await publicContentBootstrapPromise;
      res.setHeader("Cache-Control", "private, max-age=45");
      res.setHeader("X-Content-Cache", "shared");
      return res.json(payload);
    }

    const loadBootstrapPayload = async (): Promise<PublicContentBootstrapPayload> => {
      const canSeeAllContent = isStaffRole(req.authUser?.role);
      const lessonFilter = isStaffRole(req.authUser?.role)
        ? {}
        : {
            showOnPlatform: { $ne: false },
            $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }, { approvalStatus: null }],
          };
      const topicFilter = isStaffRole(req.authUser?.role) ? {} : { showOnPlatform: { $ne: false } };
      const libraryFilter = isStaffRole(req.authUser?.role)
        ? {}
        : {
            showOnPlatform: { $ne: false },
            $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }, { approvalStatus: null }],
          };
      const activePathIds = canSeeAllContent ? [] : await getActivePathIds();
      const finalTopicFilter = canSeeAllContent ? topicFilter : scopeFilterToActivePaths(topicFilter, activePathIds);
      const finalLessonFilter = canSeeAllContent ? lessonFilter : scopeFilterToActivePaths(lessonFilter, activePathIds);
      const finalLibraryFilter = canSeeAllContent ? libraryFilter : scopeFilterToActivePaths(libraryFilter, activePathIds);

      const [topics, lessons, libraryItems, operationalData, studyPlans] = await Promise.all([
        TopicModel.find(finalTopicFilter).sort({ subjectId: 1, order: 1 }).lean(),
        LessonModel.find(finalLessonFilter).sort({ createdAt: -1 }).lean(),
        LibraryItemModel.find(finalLibraryFilter).sort({ createdAt: -1 }).lean(),
        getScopedOperationalData(req.authUser),
        req.authUser ? StudyPlanModel.find({ userId: req.authUser.id }).sort({ updatedAt: -1 }).lean() : Promise.resolve([]),
      ]);

      const { groups, b2bPackages, accessCodes, announcementAds } = operationalData;
      return { topics, lessons, libraryItems, groups, b2bPackages, accessCodes, announcementAds, studyPlans };
    };

    const payloadPromise = loadBootstrapPayload();
    const payload = canUsePublicCache
      ? await (publicContentBootstrapPromise = payloadPromise.finally(() => {
          publicContentBootstrapPromise = null;
        }))
      : await payloadPromise;

    if (canUsePublicCache) {
      publicContentBootstrapCache = {
        expiresAt: Date.now() + CONTENT_BOOTSTRAP_CACHE_TTL_MS,
        payload,
      };
      res.setHeader("Cache-Control", "private, max-age=45");
      res.setHeader("X-Content-Cache", "miss");
    }
    res.json(payload);
  }),
);

contentRouter.post(
  "/study-plans",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = studyPlanSchema.parse(req.body);
    const now = Date.now();
    const created = await StudyPlanModel.findOneAndUpdate(
      { id: payload.id, userId: req.authUser!.id },
      {
        ...payload,
        userId: req.authUser!.id,
        createdAt: payload.createdAt || now,
        updatedAt: now,
      },
      { new: true, upsert: true },
    );

    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/study-plans/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = studyPlanSchema.partial().parse(req.body);
    const updated = await StudyPlanModel.findOneAndUpdate(
      { id: req.params.id, userId: req.authUser!.id },
      {
        ...payload,
        userId: req.authUser!.id,
        updatedAt: Date.now(),
      },
      { new: true },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Study plan not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/study-plans/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const deleted = await StudyPlanModel.findOneAndDelete({ id: req.params.id, userId: req.authUser!.id });

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Study plan not found" });
    }

    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/topics",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = topicSchema.parse(req.body);
    const created = await TopicModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/topics/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = topicUpdateSchema.parse(req.body);
    const updated = await TopicModel.findOneAndUpdate(buildDocumentQuery(req.params.id), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Topic not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/topics/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await TopicModel.findOneAndDelete(buildDocumentQuery(req.params.id));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Topic not found" });
    }

    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/lessons",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = sanitizeLessonPayload(lessonSchema.parse(req.body));
    const workflowDefaults = getWorkflowDefaults(req.authUser!);
    const created = await LessonModel.create({
      ...payload,
      ...workflowDefaults,
      approvalStatus:
        req.authUser?.role === "admin"
          ? payload.approvalStatus || workflowDefaults.approvalStatus
          : workflowDefaults.approvalStatus,
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/lessons/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = sanitizeLessonPayload(lessonSchema.partial().parse(req.body));
    const sanitizedPayload = sanitizeWorkflowUpdate(payload as Record<string, unknown>, req.authUser!);
    const updated = await LessonModel.findOneAndUpdate(buildOwnedDocumentQuery(req.params.id, req.authUser!), sanitizedPayload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Lesson not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/lessons/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await LessonModel.findOneAndDelete(buildOwnedDocumentQuery(req.params.id, req.authUser!));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Lesson not found" });
    }

    const deletedIds = [deleted.id, deleted._id, req.params.id].map((value) => String(value || "")).filter(Boolean);
    await TopicModel.updateMany({ lessonIds: { $in: deletedIds } }, { $pull: { lessonIds: { $in: deletedIds } } });

    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/library-items",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = librarySchema.parse(req.body);
    const workflowDefaults = getWorkflowDefaults(req.authUser!);
    const created = await LibraryItemModel.create({
      ...payload,
      ...workflowDefaults,
      approvalStatus:
        req.authUser?.role === "admin"
          ? payload.approvalStatus || workflowDefaults.approvalStatus
          : workflowDefaults.approvalStatus,
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/library-items/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = libraryUpdateSchema.parse(req.body);
    const sanitizedPayload = sanitizeWorkflowUpdate(payload as Record<string, unknown>, req.authUser!);
    const updated = await LibraryItemModel.findOneAndUpdate(
      buildOwnedDocumentQuery(req.params.id, req.authUser!),
      sanitizedPayload,
      {
        new: true,
      },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Library item not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/library-items/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await LibraryItemModel.findOneAndDelete(buildOwnedDocumentQuery(req.params.id, req.authUser!));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Library item not found" });
    }

    const deletedIds = [deleted.id, deleted._id, req.params.id].map((value) => String(value || "")).filter(Boolean);
    await TopicModel.updateMany({ libraryItemIds: { $in: deletedIds } }, { $pull: { libraryItemIds: { $in: deletedIds } } });

    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/groups",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = groupSchema.parse(req.body);
    const created = await GroupModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/groups/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = groupSchema.partial().parse(req.body);
    const updated = await GroupModel.findOneAndUpdate(buildDocumentQuery(req.params.id), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Group not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/groups/:id",
  requireAuth,
  requireRole(["admin", "teacher", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await GroupModel.findOneAndDelete(buildDocumentQuery(req.params.id));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Group not found" });
    }

    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/b2b-packages",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = b2bPackageSchema.parse(req.body);
    const created = await B2BPackageModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/b2b-packages/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = b2bPackageSchema.partial().parse(req.body);
    const updated = await B2BPackageModel.findOneAndUpdate(buildDocumentQuery(req.params.id), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Package not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/b2b-packages/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await B2BPackageModel.findOneAndDelete(buildDocumentQuery(req.params.id));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Package not found" });
    }

    await AccessCodeModel.deleteMany({ packageId: deleted.id || String(deleted._id) });
    return res.json({ success: true });
  }),
);

contentRouter.get(
  "/announcement-ads",
  optionalAuth,
  asyncHandler(async (_req, res) => {
    const now = Date.now();
    const announcementAds = await AnnouncementAdModel.find({
      isActive: { $ne: false },
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    })
      .select("title body imageUrl ctaLabel ctaUrl audience displayMode frequency imageFit delaySeconds isActive startsAt endsAt priority createdAt updatedAt")
      .sort({ priority: 1, createdAt: -1 })
      .limit(8);

    return res.json({ announcementAds });
  }),
);

contentRouter.post(
  "/announcement-ads",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = announcementAdSchema.parse(req.body);
    const created = await AnnouncementAdModel.create({
      ...payload,
      createdAt: payload.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/announcement-ads/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const payload = announcementAdUpdateSchema.parse(req.body);
    const updated = await AnnouncementAdModel.findOneAndUpdate(
      buildDocumentQuery(req.params.id),
      { ...payload, updatedAt: Date.now() },
      { new: true },
    );

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Announcement ad not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/announcement-ads/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const deleted = await AnnouncementAdModel.findOneAndDelete(buildDocumentQuery(req.params.id));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Announcement ad not found" });
    }

    return res.json({ success: true });
  }),
);

contentRouter.post(
  "/access-codes",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = accessCodeSchema.parse(req.body);
    const created = await AccessCodeModel.create(payload);
    res.status(StatusCodes.CREATED).json(created);
  }),
);

contentRouter.patch(
  "/access-codes/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = accessCodeSchema.partial().parse(req.body);
    const updated = await AccessCodeModel.findOneAndUpdate(buildDocumentQuery(req.params.id), payload, {
      new: true,
    });

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Access code not found" });
    }

    return res.json(updated);
  }),
);

contentRouter.delete(
  "/access-codes/:id",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const deleted = await AccessCodeModel.findOneAndDelete(buildDocumentQuery(req.params.id));

    if (!deleted) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Access code not found" });
    }

    return res.json({ success: true });
  }),
);

contentRouter.get(
  "/schools/:id/report",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const pagination = resolvePagination(req.query, { limit: 200 });
    const school = await GroupModel.findOne({
      ...buildDocumentQuery(req.params.id),
      type: "SCHOOL",
    });

    if (!school) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
    }

    const schoolId = school.id || String(school._id);

    const [classes, packages, codes, students, totalStudents, activeStudents] = await Promise.all([
      GroupModel.find({ type: "CLASS", parentId: schoolId }).sort({ createdAt: -1 }).lean(),
      B2BPackageModel.find({ schoolId }).sort({ createdAt: -1 }).lean(),
      AccessCodeModel.find({ schoolId }).sort({ createdAt: -1 }).lean(),
      UserModel.find({ schoolId }).select("id _id groupIds isActive").sort({ createdAt: -1 }).lean(),
      UserModel.countDocuments({ schoolId }),
      UserModel.countDocuments({ schoolId, isActive: { $ne: false } }),
    ]);

    const studentIds = students.map(getModelDocumentId).filter(Boolean);
    const [quizResults, quizResultTotal] = studentIds.length
      ? await Promise.all([
          QuizResultModel.find({ userId: { $in: studentIds } })
            .select("userId score skillsAnalysis createdAt")
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.limit)
            .lean(),
          QuizResultModel.countDocuments({ userId: { $in: studentIds } }),
        ])
      : [[], 0];

    const averageScore = quizResults.length
      ? Math.round(
          quizResults.reduce((sum, result) => sum + (Number(result.score) || 0), 0) / quizResults.length,
        )
      : 0;

    const weakSkillMap = new Map<
      string,
      {
        skillId?: string;
        skill: string;
        subjectId?: string;
        sectionId?: string;
        attempts: number;
        masteryTotal: number;
      }
    >();

    quizResults.forEach((result) => {
      const skills = Array.isArray(result.skillsAnalysis) ? result.skillsAnalysis : [];
      skills.forEach((gap: any) => {
        const key = String(gap?.skillId || gap?.skill || gap?.sectionId || "unknown");
        const current = weakSkillMap.get(key) || {
          skillId: gap?.skillId,
          skill: String(gap?.skill || "مهارة غير مسماة"),
          subjectId: gap?.subjectId,
          sectionId: gap?.sectionId,
          attempts: 0,
          masteryTotal: 0,
        };

        current.attempts += 1;
        current.masteryTotal += Number(gap?.mastery) || 0;
        weakSkillMap.set(key, current);
      });
    });

    const weakestSkills = Array.from(weakSkillMap.values())
      .map((item) => ({
        skillId: item.skillId,
        skill: item.skill,
        subjectId: item.subjectId,
        sectionId: item.sectionId,
        attempts: item.attempts,
        mastery: item.attempts > 0 ? Math.round(item.masteryTotal / item.attempts) : 0,
      }))
      .sort((a, b) => a.mastery - b.mastery || b.attempts - a.attempts)
      .slice(0, 8);

    const classSummaries = classes.map((group) => {
      const classId = getModelDocumentId(group);
      const classStudents = students.filter((student) => (student.groupIds || []).includes(classId));
      const classStudentIds = new Set(classStudents.map(getModelDocumentId).filter(Boolean));
      const classResults = quizResults.filter((result) => classStudentIds.has(String(result.userId)));
      const classAverageScore = classResults.length
        ? Math.round(classResults.reduce((sum, result) => sum + (Number(result.score) || 0), 0) / classResults.length)
        : 0;

      return {
        id: classId,
        name: group.name,
        studentCount: classStudents.length,
        supervisorCount: Array.isArray(group.supervisorIds) ? group.supervisorIds.length : 0,
        quizAttempts: classResults.length,
        averageScore: classAverageScore,
      };
    });

    return res.json({
      school: {
        id: schoolId,
        name: school.name,
      },
      metrics: {
        totalStudents,
        activeStudents,
        totalClasses: classes.length,
        activePackages: packages.filter((pkg) => pkg.status === "active").length,
        activeCodes: codes.filter((code) => Number(code.expiresAt) > Date.now()).length,
        quizAttempts: quizResultTotal,
        sampledQuizAttempts: quizResults.length,
        averageScore,
      },
      classSummaries,
      weakestSkills,
      quizResultsPagination: buildPaginatedResponse([], pagination, quizResultTotal),
    });
  }),
);

contentRouter.post(
  "/schools/:id/import-students",
  requireAuth,
  requireRole(["admin", "supervisor"]),
  asyncHandler(async (req, res) => {
    const payload = schoolImportSchema.parse(req.body);
    const school = await GroupModel.findOne({
      ...buildDocumentQuery(req.params.id),
      type: "SCHOOL",
    });

    if (!school) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "School not found" });
    }

    const schoolId = school.id || String(school._id);
    const existingClasses = await GroupModel.find({ type: "CLASS", parentId: schoolId }).sort({ createdAt: -1 });
    const classById = new Map(existingClasses.map((item) => [item.id || String(item._id), item]));
    const classByName = new Map(existingClasses.map((item) => [item.name.trim().toLowerCase(), item]));
    const credentials: Array<{ name: string; email: string; password: string; className?: string }> = [];
    const importedUsers: any[] = [];

    for (const row of payload.rows) {
      let targetClass = row.classId ? classById.get(row.classId) : undefined;

      if (!targetClass && row.className?.trim()) {
        targetClass = classByName.get(row.className.trim().toLowerCase());
      }

      if (!targetClass && row.className?.trim()) {
        targetClass = await GroupModel.create({
          id: `class_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: row.className.trim(),
          type: "CLASS",
          parentId: schoolId,
          ownerId: req.authUser?.id,
          supervisorIds: [],
          studentIds: [],
          courseIds: [],
          createdAt: Date.now(),
          totalStudents: 0,
          totalSupervisors: 0,
          totalCourses: 0,
        });

        const createdClassId = targetClass.id || String(targetClass._id);
        classById.set(createdClassId, targetClass);
        classByName.set(targetClass.name.trim().toLowerCase(), targetClass);
      }

      const generatedPassword = row.password || `Nn@${Math.floor(100000 + Math.random() * 900000)}`;
      const passwordHash = await bcrypt.hash(generatedPassword, 10);
      const normalizedEmail = row.email.toLowerCase().trim();
      const classId = targetClass ? targetClass.id || String(targetClass._id) : undefined;

      const user = await UserModel.findOneAndUpdate(
        { email: normalizedEmail },
        {
          name: row.name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: "student",
          isActive: true,
          schoolId,
          groupIds: classId ? [classId] : [],
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      importedUsers.push(user);
      credentials.push({
        name: row.name.trim(),
        email: normalizedEmail,
        password: generatedPassword,
        className: targetClass?.name,
      });
    }

    const studentIds = importedUsers.map((user) => user.id || String(user._id));

    await GroupModel.findOneAndUpdate(
      buildDocumentQuery(schoolId),
      {
        $addToSet: { studentIds: { $each: studentIds } },
        $set: { totalStudents: await UserModel.countDocuments({ schoolId }) },
      },
      { new: true },
    );

    const latestClasses = await GroupModel.find({ type: "CLASS", parentId: schoolId });
    await Promise.all(
      latestClasses.map(async (group) => {
        const classId = group.id || String(group._id);
        const count = await UserModel.countDocuments({ groupIds: classId });
        await GroupModel.findOneAndUpdate(buildDocumentQuery(classId), { $set: { totalStudents: count } });
      }),
    );

    return res.status(StatusCodes.CREATED).json({
      summary: {
        totalRows: payload.rows.length,
        imported: credentials.length,
        classesTouched: Array.from(
          new Set(credentials.map((item) => item.className).filter(Boolean)),
        ).length,
      },
      credentials,
    });
  }),
);
