import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  DEV_LOCAL_ADMIN_BYPASS: z.coerce.boolean().default(false),
  ADMIN_NAME: z.string().default("Platform Admin"),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().min(6).default("change-me"),
});

export const env = envSchema.parse(process.env);
