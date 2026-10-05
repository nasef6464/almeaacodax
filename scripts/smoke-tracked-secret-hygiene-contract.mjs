import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean);

const textExtensions = new Set([".md", ".txt", ".yml", ".yaml", ".json", ".example"]);
const candidates = tracked.filter((file) => {
  if (file === "README.md") return true;
  if (file.startsWith("docs/")) return true;
  return textExtensions.has(path.extname(file).toLowerCase());
});

const violations = [];
const mongoCredentialPattern = /mongodb(?:\+srv)?:\/\/([^:\s/@]+):([^@\s]+)@/gi;
const inlineEmailPasswordPattern = /`[^`\s]+@[^`\s]+\s*\/\s*([^`]+)`/g;

for (const relative of candidates) {
  const absolute = path.join(root, relative);
  let content = "";
  try {
    content = fs.readFileSync(absolute, "utf8");
  } catch {
    continue;
  }

  for (const match of content.matchAll(mongoCredentialPattern)) {
    const username = String(match[1] || "");
    const password = String(match[2] || "");
    const placeholderUser = /^(?:username|user|runtime_user|app_user|<.+>)$/i.test(username);
    const placeholderPassword = /^(?:password|pass|secret|<.+>)$/i.test(password) || password.includes("<");
    if (!(placeholderUser && placeholderPassword)) {
      violations.push(relative + ": contains a non-placeholder MongoDB credential URI");
    }
  }

  for (const match of content.matchAll(inlineEmailPasswordPattern)) {
    const password = String(match[1] || "").trim();
    if (!/(?:<.+>|REDACTED|secret-store|secret store|environment variable)/i.test(password)) {
      violations.push(relative + ": contains an inline email/password credential pair");
    }
  }
}

assert.equal(
  violations.length,
  0,
  "Tracked secret hygiene violations:\n" + violations.map((item) => "- " + item).join("\n"),
);

console.log("Tracked secret hygiene contract: PASS (" + candidates.length + " text files scanned)");
