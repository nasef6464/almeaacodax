import { env } from "../../../config/env.js";
import { createR2PresignedPutUrl } from "../infrastructure/r2PresignedPut.js";

type CreateQuestionImportImageUploadIntentInput = {
  questionCode: string;
  imageHash: string;
  sizeBytes: number;
};

export type QuestionImportImageUploadIntent = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  method: "PUT";
  headers: { "Content-Type": "image/webp" };
  expiresIn: number;
  maxBytes: number;
};

const requireUploadConfiguration = () => {
  if (!env.R2_UPLOAD_ENABLED) {
    const error = new Error("R2 media upload is not enabled") as Error & { statusCode?: number };
    error.statusCode = 503;
    throw error;
  }

  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_BUCKET ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_PUBLIC_BASE_URL
  ) {
    const error = new Error("R2 media upload is not configured") as Error & { statusCode?: number };
    error.statusCode = 503;
    throw error;
  }
};

export function createQuestionImportImageUploadIntent({
  questionCode,
  imageHash,
  sizeBytes,
}: CreateQuestionImportImageUploadIntentInput): QuestionImportImageUploadIntent {
  requireUploadConfiguration();

  const normalizedCode = String(questionCode || "").trim().toUpperCase();
  const normalizedHash = String(imageHash || "").trim().toLowerCase();

  if (!/^QDR-QNT-[A-Z0-9_-]+-P\d{3}-Q\d{2,}$/.test(normalizedCode)) {
    const error = new Error("Question code does not match the approved quantitative import format") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  if (!/^[a-f0-9]{64}$/.test(normalizedHash)) {
    const error = new Error("Question image hash must be a SHA-256 hex digest") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > env.R2_UPLOAD_MAX_BYTES) {
    const error = new Error(`Question image must be between 1 byte and ${env.R2_UPLOAD_MAX_BYTES} bytes`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const key = `questions/v2/${encodeURIComponent(normalizedCode)}/${normalizedHash}.webp`;
  const expiresIn = env.R2_PRESIGN_EXPIRES_SECONDS;
  const uploadUrl = createR2PresignedPutUrl({
    accountId: env.R2_ACCOUNT_ID,
    bucket: env.R2_BUCKET,
    key,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    contentType: "image/webp",
    expiresSeconds: expiresIn,
  });
  const publicBaseUrl = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");

  return {
    uploadUrl,
    publicUrl: `${publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`,
    key,
    method: "PUT",
    headers: { "Content-Type": "image/webp" },
    expiresIn,
    maxBytes: env.R2_UPLOAD_MAX_BYTES,
  };
}
