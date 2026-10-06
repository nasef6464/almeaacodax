const BLOCKED_RESOURCE_SCHEME = /^(?:javascript|vbscript|file):/i;

export const sanitizeLearningResourceUrl = (rawUrl?: string | null) => {
  if (!rawUrl) return "";

  let trimmedUrl = rawUrl.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmedUrl) return "";

  trimmedUrl = trimmedUrl
    .replace(/^https?:\/\/https?:\/\//i, "https://")
    .replace(/^https?:\/\/:\/\//i, "https://")
    .replace(/^:\/\//, "https://")
    .replace(/^\/\//, "https://");

  if (BLOCKED_RESOURCE_SCHEME.test(trimmedUrl)) {
    return "";
  }

  if (/^(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//i.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
};

export const sanitizeLessonResourcePayload = <
  T extends { videoUrl?: string; meetingUrl?: string; recordingUrl?: string; fileUrl?: string },
>(payload: T): T => ({
  ...payload,
  ...(payload.videoUrl !== undefined ? { videoUrl: sanitizeLearningResourceUrl(payload.videoUrl) } : {}),
  ...(payload.meetingUrl !== undefined ? { meetingUrl: sanitizeLearningResourceUrl(payload.meetingUrl) } : {}),
  ...(payload.recordingUrl !== undefined ? { recordingUrl: sanitizeLearningResourceUrl(payload.recordingUrl) } : {}),
  ...(payload.fileUrl !== undefined ? { fileUrl: sanitizeLearningResourceUrl(payload.fileUrl) } : {}),
});
