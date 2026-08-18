/**
 * Preserves the existing startup-failure diagnostics while keeping the process
 * entrypoint focused on orchestration only.
 */
export function reportStartupFailure(error: unknown) {
  console.error("Failed to start API server", error);

  // Help non-technical operators quickly diagnose common Atlas/Render issues.
  const message = String((error as any)?.message ?? "");
  const code = (error as any)?.code;
  const codeName = (error as any)?.codeName;
  const isMongoAuth =
    message.toLowerCase().includes("authentication failed") ||
    message.toLowerCase().includes("bad auth") ||
    code === 8000 ||
    codeName === "AtlasError";

  if (isMongoAuth) {
    console.error(
      [
        "",
        "MongoDB connection failed (likely Atlas auth/network). Quick checks:",
        "1) Render env var MONGODB_URI uses the correct username/password.",
        "2) If the password contains special chars (like @, #, /, %), URL-encode it (e.g. @ => %40).",
        "3) Atlas Network Access allows this Render service (temporary: 0.0.0.0/0).",
        "4) Atlas Database Access user exists and has readWrite access to the target DB.",
      ].join("\n"),
    );
  }
}
