import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/post-deploy-smoke.yml", import.meta.url), "utf8");
const strictSmoke = await readFile(new URL("./smoke-frontend-strict.mjs", import.meta.url), "utf8");

const requiredWorkflow = [
  "fetch-depth: 2",
  "Classify frontend deployment requirement",
  'SMOKE_REQUIRE_FRONTEND_VERSION=1',
  'SMOKE_REQUIRE_FRONTEND_VERSION=$require_frontend',
  'docs/*|.github/*|scripts/smoke-*.mjs|README*|*.md',
];

for (const fragment of requiredWorkflow) {
  if (!workflow.includes(fragment)) {
    throw new Error(`Post-deploy frontend version policy lost workflow fragment: ${fragment}`);
  }
}

const requiredSmoke = [
  "const requireExpectedVersion =",
  "if (requireExpectedVersion)",
  "Frontend version equality skipped for a non-runtime-only main commit",
  "process.env.SMOKE_STRICT_VERSION = requireExpectedVersion ? '1' : '0'",
];

for (const fragment of requiredSmoke) {
  if (!strictSmoke.includes(fragment)) {
    throw new Error(`Post-deploy frontend strict smoke lost policy fragment: ${fragment}`);
  }
}

console.log("Post-deploy frontend version policy contract passed.");
