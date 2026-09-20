const COMMIT_ENV_KEYS = [
  "RENDER_GIT_COMMIT",
  "VERCEL_GIT_COMMIT_SHA",
  "GIT_COMMIT_SHA",
  "COMMIT_SHA",
] as const;

export function resolveRuntimeCommit() {
  for (const key of COMMIT_ENV_KEYS) {
    const value = String(process.env[key] || "").trim();
    if (value) return value;
  }
  return "";
}

export function shortRuntimeCommit(length = 12) {
  const commit = resolveRuntimeCommit();
  return commit ? commit.slice(0, length) : "";
}
