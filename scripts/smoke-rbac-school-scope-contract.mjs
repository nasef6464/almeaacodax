import fs from "node:fs";

const source = fs.readFileSync("server/src/routes/content.routes.ts", "utf8");

const checks = [];
const add = (name, fn) => checks.push({ name, fn });

const assertIncludes = (snippet, message) => {
  if (!source.includes(snippet)) {
    throw new Error(message || `Missing snippet: ${snippet}`);
  }
};

add("defines shared school scope guard", () => {
  assertIncludes("const assertSchoolManagementScope = async (", "Missing shared scope guard helper");
  assertIncludes("if (authUser.role === \"admin\")", "Missing admin bypass in scope guard");
  assertIncludes("resolveAccessCodeSchoolsForSupervisor", "Scope guard must use supervisor school resolution");
});

add("enforces scope on school report endpoint", () => {
  assertIncludes("\"/schools/:id/report\"", "Missing school report endpoint");
  assertIncludes("const canManageSchool = await assertSchoolManagementScope(req.authUser!, school as any);", "Report endpoint must enforce scope guard");
});

add("enforces scope on import-students endpoint", () => {
  assertIncludes("\"/schools/:id/import-students\"", "Missing import-students endpoint");
  assertIncludes("return res.status(StatusCodes.FORBIDDEN).json({ message: \"You cannot manage this school\" });", "Missing forbidden guard message");
});

add("uses same scope guard on relations endpoint", () => {
  const relationsIdx = source.indexOf("\"/schools/:id/relations\"");
  if (relationsIdx < 0) {
    throw new Error("Missing relations endpoint");
  }
  const block = source.slice(relationsIdx, relationsIdx + 1200);
  if (!block.includes("assertSchoolManagementScope")) {
    throw new Error("Relations endpoint is not using shared scope guard");
  }
});

let failed = 0;
for (const check of checks) {
  try {
    check.fn();
    console.log(`PASS ${check.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${check.name}`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${checks.length} RBAC school-scope checks failed.`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} RBAC school-scope checks passed.`);
