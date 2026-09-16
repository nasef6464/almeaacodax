import { readFile } from "node:fs/promises";

const files = {
  auth: await readFile(new URL("../server/src/routes/auth.routes.ts", import.meta.url), "utf8"),
  session: await readFile(new URL("../server/src/routes/authSession.routes.ts", import.meta.url), "utf8"),
  middleware: await readFile(new URL("../server/src/middleware/auth.ts", import.meta.url), "utf8"),
  jwt: await readFile(new URL("../server/src/utils/jwt.ts", import.meta.url), "utf8"),
  user: await readFile(new URL("../server/src/models/User.ts", import.meta.url), "utf8"),
  api: `${await readFile(new URL("../services/api.ts", import.meta.url), "utf8")}\n${await readFile(new URL("../services/apiGroups/authApi.ts", import.meta.url), "utf8")}`,
  guide: await readFile(new URL("../docs/archive_reports/AUTH_ACCOUNT_SECURITY.md", import.meta.url), "utf8"),
  readiness: await readFile(new URL("../docs/archive_reports/PRODUCTION_READINESS_REPORT.md", import.meta.url), "utf8"),
};

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", message: error.message });
  }
}

function assertIncludes(source, fragment) {
  if (!source.includes(fragment)) {
    throw new Error(`Missing fragment: ${fragment}`);
  }
}

function assertNotIncludes(source, fragment) {
  if (source.includes(fragment)) {
    throw new Error(`Unexpected fragment: ${fragment}`);
  }
}

check("user model stores only hashed account recovery tokens", () => {
  assertIncludes(files.user, "emailVerificationTokenHash");
  assertIncludes(files.user, "passwordResetTokenHash");
  assertIncludes(files.user, "delete safeRet.emailVerificationTokenHash");
  assertIncludes(files.user, "delete safeRet.passwordResetTokenHash");
});

check("auth routes implement verification and password reset", () => {
  assertIncludes(files.auth, '"/forgot-password"');
  assertIncludes(files.auth, '"/reset-password"');
  assertIncludes(files.auth, '"/email/verify"');
  assertIncludes(files.auth, '"/email/resend-verification"');
  assertIncludes(files.auth, "createHash(\"sha256\")");
});

check("forgot password is generic and queued through notifications", () => {
  assertIncludes(files.auth, "If this email exists, password reset instructions will be sent.");
  assertIncludes(files.auth, "createNotificationDeliveries");
  assertIncludes(files.auth, "passwordResetTokenHash = hashToken(token)");
  assertNotIncludes(files.auth, "return res.json({ token");
});

check("durable session cutoff invalidates JWTs after security-sensitive account changes", () => {
  assertIncludes(files.user, "sessionInvalidBefore");
  assertIncludes(files.user, 'sessionSensitiveFields = ["passwordHash", "isActive", "role", "email"]');
  assertIncludes(files.user, 'userSchema.pre("save"');
  assertIncludes(files.user, 'userSchema.pre("findOneAndUpdate"');
  assertIncludes(files.user, 'userSchema.pre("updateOne"');
  assertIncludes(files.user, "delete safeRet.sessionInvalidBefore");
  assertIncludes(files.jwt, "sessionIssuedAt: Date.now()");
  assertIncludes(files.middleware, "resolveSessionIssuedAt");
  assertIncludes(files.middleware, "sessionIssuedAt < invalidBefore");
  assertIncludes(files.middleware, "+sessionInvalidBefore");
});

check("logout-all and password change rotate the durable session boundary", () => {
  assertIncludes(files.session, '"/logout-all"');
  assertIncludes(files.session, '"/me/password"');
  assertIncludes(files.session, "sessionInvalidBefore: invalidatedAt");
  assertIncludes(files.session, "user.passwordHash = await bcrypt.hash(payload.newPassword, 10)");
  assertIncludes(files.session, "setAuthCookie(res, token)");
  assertIncludes(files.api, "logoutAll:");
  assertIncludes(files.api, "changePassword:");
});

check("authenticated middleware refreshes active principal before accepting a session", () => {
  assertIncludes(files.middleware, "export async function requireAuth");
  assertIncludes(files.middleware, "const active = await refreshActiveAuthUser(req)");
  assertIncludes(files.middleware, "res.locals.activeAuthRefreshed = true");
});

check("frontend API exposes auth recovery helpers", () => {
  assertIncludes(files.api, "forgotPassword:");
  assertIncludes(files.api, "resetPassword:");
  assertIncludes(files.api, "verifyEmail:");
  assertIncludes(files.api, "resendEmailVerification:");
});

check("auth guide and readiness report document the sprint", () => {
  assertIncludes(files.guide, "tokens are stored as SHA-256 hashes");
  assertIncludes(files.guide, "EMAIL_PROVIDER=console");
  assertIncludes(files.readiness, "Auth Recovery Sprint - 2026-05-12");
});

const failed = checks.filter((item) => item.status === "FAIL");
if (failed.length > 0) {
  console.error(JSON.stringify({ total: checks.length, failed }, null, 2));
  process.exit(1);
}

console.log(`Auth account contract passed (${checks.length} checks).`);
