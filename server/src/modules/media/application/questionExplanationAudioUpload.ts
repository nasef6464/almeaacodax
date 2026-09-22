import { randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";
import { createR2PresignedPutUrl } from "../infrastructure/r2PresignedPut.js";

const allowedQuestionExplanationAudioTypes = new Map([
  ["audio/mpeg", "mp3"],
  ["audio/webm", "webm"],
  ["audio/mp4", "m4a"],
  ["audio/x-m4a", "m4a"],
  ["audio/ogg", "ogg"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
]);

type CreateQuestionExplanationAudioUploadIntentInput = {
  contentType: string;
  sizeBytes: number;
};

export type QuestionExplanationAudioUploadIntent = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  method: "PUT";
  headers: { "Content-Type": string };
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

export function createQuestionExplanationAudioUploadIntent({
  contentType,
  sizeBytes,
}: CreateQuestionExplanationAudioUploadIntentInput): QuestionExplanationAudioUploadIntent {
  requireUploadConfiguration();

  const normalizedContentType = String(contentType || "").trim().toLowerCase();
  const extension = allowedQuestionExplanationAudioTypes.get(normalizedContentType);
  if (!extension) {
    const error = new Error("Only MP3, WebM, M4A, OGG and WAV explanation audio is allowed") as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > env.R2_UPLOAD_MAX_BYTES) {
    const error = new Error(`Question explanation audio must be between 1 byte and ${env.R2_UPLOAD_MAX_BYTES} bytes`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const key = `questions/explanations/${year}/${month}/${randomUUID()}.${extension}`;
  const expiresIn = env.R2_PRESIGN_EXPIRES_SECONDS;
  const uploadUrl = createR2PresignedPutUrl({
    accountId: env.R2_ACCOUNT_ID,
    bucket: env.R2_BUCKET,
    key,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    contentType: normalizedContentType,
    expiresSeconds: expiresIn,
  });
  const publicBaseUrl = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, "");

  return {
    uploadUrl,
    publicUrl: `${publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`,
    key,
    method: "PUT",
    headers: { "Content-Type": normalizedContentType },
    expiresIn,
    maxBytes: env.R2_UPLOAD_MAX_BYTES,
  };
}
