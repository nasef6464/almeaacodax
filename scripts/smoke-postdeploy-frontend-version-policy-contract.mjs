import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/post-deploy-smoke.yml", import.meta.url), "utf8");
const strictSmoke = await readFile(new URL("./smoke-frontend-strict.mjs", import.meta.url), "utf8");

const requiredWorkflow = [
  "fetch-depth: 2",
  "Frontend strict smoke",
];

for (const fragment of requiredWorkflow) {
  if (!workflow.includes(fragment)) {
    throw new Error(`Post-deploy frontend version policy lost workflow fragment: ${fragment}`);
  }
}

for (const forbiddenWorkflowFragment of [
  "SMOKE_REQUIRE_FRONTEND_VERSION",
  "Classify frontend deployment requirement",
]) {
  if (workflow.includes(forbiddenWorkflowFragment)) {
    throw new Error(`Post-deploy workflow introduced forbidden runtime env policy: ${forbiddenWorkflowFragment}`);
  }
}

const requiredSmoke = [
  "const nonRuntimeOnlyCommit =",
  "git diff --name-only HEAD^ HEAD",
  "file.startsWith('docs/')",
  "file.startsWith('.github/')",
  "/^scripts\\/smoke-.*\\.mjs$/.test(file)",
  "const requireExpectedVersion = !nonRuntimeOnlyCommit",
  "if (requireExpectedVersion)",
  "Frontend version equality skipped for a non-runtime-only main commit",
  "process.env.SMOKE_STRICT_VERSION = '0'",
  "The strict wrapper has already proven exact frontend identity with retries.",
];

for (const fragment of requiredSmoke) {
  if (!strictSmoke.includes(fragment)) {
    throw new Error(`Post-deploy frontend strict smoke lost policy fragment: ${fragment}`);
  }
}

console.log("Post-deploy frontend version policy contract passed.");
