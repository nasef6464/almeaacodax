import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../server/src/routes/auth.routes.ts", import.meta.url), "utf8");
const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(fragment, message) {
  if (!source.includes(fragment)) {
    throw new Error(message || `Missing fragment: ${fragment}`);
  }
}

check("auth routes gate token exposure by environment", () => {
  assertIncludes("const shouldExposeTokenInAuthResponse = env.NODE_ENV !== \"production\";");
  assertIncludes("...(shouldExposeTokenInAuthResponse ? { token } : {})");
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
