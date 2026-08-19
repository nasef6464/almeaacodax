import { readFile } from "node:fs/promises";

const files = {
  auth: await readFile(new URL("../server/src/routes/auth.routes.ts", import.meta.url), "utf8"),
  user: await readFile(new URL("../server/src/models/User.ts", import.meta.url), "utf8"),
  header: await readFile(new URL("../components/Header.tsx", import.meta.url), "utf8"),
  reset: await readFile(new URL("../pages/ResetPassword.tsx", import.meta.url), "utf8"),
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

check("user model stores login security state without exposing it", () => {
  assertIncludes(files.user, "failedLoginAttempts");
  assertIncludes(files.user, "loginLockedUntil");
  assertIncludes(files.user, "delete safeRet.failedLoginAttempts");
  assertIncludes(files.user, "delete safeRet.loginLockedUntil");
});

check("auth routes enforce password strength", () => {
  assertIncludes(files.auth, "passwordStrengthSchema");
  assertIncludes(files.auth, "Password must include at least one letter and one number");
  assertIncludes(files.auth, "password: passwordStrengthSchema");
});

check("auth routes lock repeated failed login attempts", () => {
  assertIncludes(files.auth, "MAX_FAILED_LOGIN_ATTEMPTS = 5");
  assertIncludes(files.auth, "LOGIN_LOCK_MS = 15 * 60 * 1000");
  assertIncludes(files.auth, "recordFailedLogin(user)");
  assertIncludes(files.auth, "Too many login attempts. Try again later.");
});

check("successful login and password reset clear failed login state", () => {
  assertIncludes(files.auth, "clearFailedLoginState(user)");
  assertIncludes(files.auth, "user.failedLoginAttempts = 0");
  assertIncludes(files.auth, "user.loginLockedUntil = null");
});

check("Google OAuth binds state to a short-lived browser cookie", () => {
  assertIncludes(files.auth, 'GOOGLE_OAUTH_STATE_COOKIE_NAME = "almeaa_google_oauth_state"');
  assertIncludes(files.auth, "GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000");
  assertIncludes(files.auth, "nonce: createSecureToken()");
  assertIncludes(files.auth, "res.cookie(GOOGLE_OAUTH_STATE_COOKIE_NAME, hashToken(state)");
  assertIncludes(files.auth, 'sameSite: "lax" as const');
  assertIncludes(files.auth, "httpOnly: true");
});

check("Google OAuth callback verifies, expires, and clears state before token exchange", () => {
  assertIncludes(files.auth, "timingSafeEqual");
  assertIncludes(files.auth, "expectedStateHash");
  assertIncludes(files.auth, "timingSafeStringEqual(actualStateHash, expectedStateHash)");
  assertIncludes(files.auth, "now - issuedAt > GOOGLE_OAUTH_STATE_TTL_MS");
  assertIncludes(files.auth, "res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE_NAME");
  assertIncludes(files.auth, "step=state_expired");
});

check("Google OAuth return path rejects scheme-relative and malformed redirects", () => {
  assertIncludes(files.auth, "normalizeOAuthReturnTo");
  assertIncludes(files.auth, 'candidate.startsWith("//")');
  assertIncludes(files.auth, "candidate.includes(");
});

check("frontend warns users about password strength", () => {
  assertIncludes(files.header, "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم.");
  assertIncludes(files.reset, "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم.");
});

const failed = checks.filter((item) => item.status === "FAIL");
if (failed.length > 0) {
  console.error(JSON.stringify({ total: checks.length, failed }, null, 2));
  process.exit(1);
}

console.log(`Auth login security contract passed (${checks.length} checks).`);
