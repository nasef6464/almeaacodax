import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const taxonomyPath = path.join(root, "ops", "chem26", "CHEM26_TAXONOMY_FINAL.json");
const deployPath = path.join(root, "server", "src", "scripts", "deployChemTaxonomy27.ts");

const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, "utf8"));
const deploy = fs.readFileSync(deployPath, "utf8");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(taxonomy.project === "CHEM26", "taxonomy project must be CHEM26");
assert(taxonomy.status === "FROZEN", "taxonomy must be FROZEN");
assert(taxonomy.pathId === "p_1777779653351", "unexpected chemistry pathId");
assert(taxonomy.subjectId === "sub_1784980728386", "unexpected chemistry subjectId");
assert(Array.isArray(taxonomy.items) && taxonomy.items.length === 27, "expected 27 main skills");

const subskills = taxonomy.items.flatMap((item) => item.subSkills || []);
assert(subskills.length === 99, "expected 99 subskills");
assert(new Set(taxonomy.items.map((item) => item.id)).size === 27, "duplicate main skill ids");
assert(new Set(subskills.map((item) => item.id)).size === 99, "duplicate subskill ids");
assert(taxonomy.items.every((item) => String(item.id).startsWith("skill_tah_chem_")), "invalid main skill prefix");
assert(subskills.every((item) => String(item.id).startsWith("sub_tah_chem_")), "invalid subskill prefix");
assert(subskills.every((item) => String(item.videoTitle || "").trim()), "every subskill needs a videoTitle");
assert(subskills.every((item) => String(item.videoGoal10Min || "").trim()), "every subskill needs a 10-minute video goal");

assert(deploy.includes('const EXPECTED_MAIN = 27;'), "deploy script main count drift");
assert(deploy.includes('const EXPECTED_SUB = 99;'), "deploy script sub count drift");
assert(deploy.includes('if (questionCount !== 0)'), "deploy script must fail closed when chemistry questions already exist");
assert(deploy.includes('CHEM26_TAXONOMY_PRE_APPLY'), "deploy script must snapshot before mutation");
assert(deploy.includes('CHEM26_TAXONOMY_APPLY_PASS'), "deploy script must post-verify apply");

console.log(JSON.stringify({
  status: "PASS",
  project: "CHEM26",
  mainSkills: taxonomy.items.length,
  subSkills: subskills.length,
  pathId: taxonomy.pathId,
  subjectId: taxonomy.subjectId,
}, null, 2));
