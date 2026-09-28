import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [routes, coverage, skillsTree, importRoutes, approval, presentation] = await Promise.all([
  read("server/src/modules/quizzes/http/questionBankRoutes.ts"),
  read("server/src/modules/quizzes/application/questionBankCoverage.ts"),
  read("dashboards/admin/SkillsTreeManager.tsx"),
  read("server/src/modules/quizzes/http/questionImportRoutes.ts"),
  read("server/src/modules/quizzes/application/questionApprovalIntegrity.ts"),
  read("utils/quizPresentation.ts"),
]);

const assert = (ok, message) => { if (!ok) throw new Error(message); };

assert(routes.includes('{ approvalStatus: "approved" }'), "learner approval filter missing");
assert(!routes.includes("...linkedQuestionConditions"), "visible quiz linkage must not bypass question approval");
assert(routes.includes("validateQuestionApprovalIntegrity(payload)"), "question create approval integrity gate missing");
assert(routes.includes("touchesQuestionVisualIdentity(payload"), "approved visual edits must re-run integrity gate");

assert(coverage.includes("$facet") && coverage.includes("skillCounts:") && coverage.includes("sectionCounts:"), "full-bank coverage aggregate missing");
assert(routes.includes("getQuestionBankCoverage(filter)"), "question route must calculate coverage from the full filtered bank");
assert(skillsTree.includes("includeCoverage: true") && skillsTree.includes("limit: 1"), "skills center must use server coverage independent of visible page");
assert(skillsTree.includes("setSubSkillCounts(response?.coverage?.skillQuestionCounts || {})"), "skills center per-subskill server counts missing");

assert(importRoutes.includes('approvalStatus: "draft"'), "imports must remain draft-first");
assert(importRoutes.includes("validateImportIdentity(item, questionCode)"), "canonical import identity validation missing");
assert(importRoutes.includes("sourceMeta.imageHash must be the SHA-256 hash"), "import SHA-256 validation missing");
assert(importRoutes.includes("imageUrl must be the exact R2 V2 object URL"), "content-addressed R2 validation missing");

assert(approval.includes("visual source verification note"), "explicit visual verification approval check missing");
assert(approval.includes("sourceMeta.sourceItemId") && approval.includes("SHA-256 imageHash"), "approved image provenance checks missing");
assert(approval.includes("content-addressed by questionCode and imageHash"), "approved image content-addressing check missing");
assert(approval.includes("exactly four options") && approval.includes("answer index"), "approved A/B/C/D index check missing");
assert(approval.includes('value?.source || "") === "imported"'), "approval gate must target imported questions");

assert(presentation.includes("getLearnerOptionLabel"), "learner option label helper missing");
for (const label of ["أ", "ب", "ج", "د"]) assert(presentation.includes(label), `learner label ${label} missing`);

console.log("PASS PLAN 8 question bank/content integrity guard");
