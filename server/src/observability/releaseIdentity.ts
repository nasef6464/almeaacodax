export function resolveRuntimeCommit() {
  return (
    String(process.env.RENDER_GIT_COMMIT || "").trim() ||
    String(process.env.VERCEL_GIT_COMMIT_SHA || "").trim() ||
    String(process.env.GIT_COMMIT_SHA || "").trim() ||
    String(process.env.COMMIT_SHA || "").trim()
  );
}

export function shortRuntimeCommit(length = 12) {
  const commit = resolveRuntimeCommit();
  return commit ? commit.slice(0, length) : "";
}
