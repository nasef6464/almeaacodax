import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({
  path: [
    ".env.codex.local",
    "../.env.codex.local",
    ".env",
    "server/.env",
    ".env.development",
  ],
});

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(1).max(200).default(30),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().int().min(0).max(50).default(2),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(5000),
  MONGODB_SOCKET_TIMEOUT_MS: z.coerce.number().int().min(5000).max(120000).default(45000),
  MONGODB_MAX_IDLE_TIME_MS: z.coerce.number().int().min(10000).max(300000).default(60000),
  REDIS_URL: z.string().optional().default(""),
  R2_UPLOAD_ENABLED: z.preprocess((value) => {
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    return value;
  }, z.boolean()).default(false),
  R2_ACCOUNT_ID: z.string().optional().default(""),
  R2_BUCKET: z.string().optional().default(""),
  R2_ACCESS_KEY_ID: z.string().optional().default(""),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(""),
  R2_PUBLIC_BASE_URL: z.string().optional().default(""),
  R2_UPLOAD_MAX_BYTES: z.coerce.number().int().min(1024).max(10 * 1024 * 1024).default(4 * 1024 * 1024),
  R2_PRESIGN_EXPIRES_SECONDS: z.coerce.number().int().min(30).max(900).default(300),
  ALMEAA_APPLY_FOUNDATION_SKILL_MAPPING: z.preprocess((value) => {
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    return value;
  }, z.boolean()).default(false),
  REDIS_KEY_PREFIX: z.string().default("almeaa"),
  RATE_LIMIT_REDIS_ENABLED: z.preprocess((value) => {
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    return value;
  }, z.boolean()).default(true),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce.number().int().min(1000).max(60 * 60 * 1000).default(60 * 1000),
  RATE_LIMIT_GLOBAL_LIMIT: z.coerce.number().int().min(50).max(5000).default(600),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().min(30 * 1000).max(24 * 60 * 60 * 1000).default(15 * 60 * 1000),
  RATE_LIMIT_AUTH_LIMIT: z.coerce.number().int().min(3).max(500).default(20),
  RATE_LIMIT_SENSITIVE_WINDOW_MS: z.coerce.number().int().min(1000).max(60 * 60 * 1000).default(60 * 1000),
  RATE_LIMIT_SENSITIVE_LIMIT: z.coerce.number().int().min(10).max(2000).default(60),
  NOTIFICATION_QUEUE_ENABLED: z.preprocess((value) => {
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    return value;
  }, z.boolean()).default(true),
  NOTIFICATION_QUEUE_CONCURRENCY: z.coerce.number().int().min(1).max(25).default(5),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  PLATFORM_INTEGRATIONS_SECRET_KEY: z.string().optional().default(""),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_REDIRECT_URI: z.string().optional().default(""),
  GOOGLE_OAUTH_ENABLED: z.preprocess((value) => {
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    return value;
  }, z.boolean()).default(false),
  SENTRY_DSN: z.string().optional().default(""),
  SENTRY_ENVIRONMENT: z.string().optional().default("production"),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  DEV_LOCAL_ADMIN_BYPASS: z.preprocess((value) => {
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    return value;
  }, z.boolean()).default(false),
  ADMIN_NAME: z.string().default("Platform Admin"),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().min(6).default("change-me"),
  ADMIN_PASSWORD_SYNC_ON_BOOT: z.preprocess((value) => {
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    return value;
  }, z.boolean()).default(false),
  ADMIN_LOGIN_BYPASS_ENABLED: z.preprocess((value) => {
    if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    return value;
  }, z.boolean()).default(false),
  ADMIN_LOGIN_BYPASS_EMAIL: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, z.string().email().optional()),
  ADMIN_LOGIN_BYPASS_IPS: z.string().default(""),
  AI_PROVIDER: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, z.enum(["gemini", "openrouter", "deepseek", "qwen", "openai", "ollama", "lmstudio", "none"]).optional()),
  AI_PROVIDER_ORDER: z.string().default(""),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(15000),
  AI_DAILY_LIMIT: z.coerce.number().int().min(1).max(200000).default(800),
  AI_PER_USER_DAILY_LIMIT: z.coerce.number().int().min(1).max(20000).default(80),
  AI_PER_SCHOOL_DAILY_LIMIT: z.coerce.number().int().min(1).max(100000).default(400),
  AI_QUESTION_ASSISTANT_PER_MINUTE: z.coerce.number().int().min(1).max(60).default(8),
  AI_QUESTION_ASSISTANT_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(64).max(2000).default(450),
  AI_QUESTION_ASSISTANT_CACHE_MINUTES: z.coerce.number().int().min(1).max(1440).default(30),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("qwen/qwen3-235b-a22b:free"),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
  QWEN_API_KEY: z.string().optional(),
  QWEN_MODEL: z.string().default("qwen-plus"),
  QWEN_BASE_URL: z.string().default("https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("gemma3:4b"),
  LM_STUDIO_BASE_URL: z.string().default("http://127.0.0.1:1234/v1"),
  LM_STUDIO_MODEL: z.string().default("local-model"),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV !== "production") return;

  if (value.ADMIN_EMAIL.toLowerCase() === "admin@example.com") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ADMIN_EMAIL"], message: "ADMIN_EMAIL must be explicitly configured in production" });
  }
  if (value.ADMIN_PASSWORD === "change-me" || value.ADMIN_PASSWORD.length < 12) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ADMIN_PASSWORD"], message: "ADMIN_PASSWORD must be a non-default value of at least 12 characters in production" });
  }
  if (value.ADMIN_PASSWORD_SYNC_ON_BOOT) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ADMIN_PASSWORD_SYNC_ON_BOOT"], message: "ADMIN_PASSWORD_SYNC_ON_BOOT must remain disabled in production" });
  }
  if (value.R2_UPLOAD_ENABLED) {
    const requiredR2Fields = [
      ["R2_ACCOUNT_ID", value.R2_ACCOUNT_ID],
      ["R2_BUCKET", value.R2_BUCKET],
      ["R2_ACCESS_KEY_ID", value.R2_ACCESS_KEY_ID],
      ["R2_SECRET_ACCESS_KEY", value.R2_SECRET_ACCESS_KEY],
      ["R2_PUBLIC_BASE_URL", value.R2_PUBLIC_BASE_URL],
    ] as const;
    for (const [field, fieldValue] of requiredR2Fields) {
      if (!String(fieldValue || "").trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} is required when R2_UPLOAD_ENABLED=true` });
      }
    }
    if (value.R2_PUBLIC_BASE_URL && !/^https:\/\//i.test(value.R2_PUBLIC_BASE_URL)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["R2_PUBLIC_BASE_URL"], message: "R2_PUBLIC_BASE_URL must use HTTPS in production" });
    }
  }
});

export const env = envSchema.parse(process.env);
