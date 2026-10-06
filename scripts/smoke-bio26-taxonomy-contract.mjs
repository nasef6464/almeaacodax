import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const taxonomy = JSON.parse(fs.readFileSync(path.join(root, "ops/bio26/BIO26_TAXONOMY_PRODUCTION.json"), "utf8"));
const deploy = fs.readFileSync(path.join(root, "server/src/scripts/deployBio26Taxonomy.ts"), "utf8");

const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(taxonomy.project === "BIO26", "taxonomy project must be BIO26");
assert(taxonomy.status === "FROZEN_PRODUCTION_V1", "taxonomy must be frozen production v1");
assert(taxonomy.pathId === "p_1777779653351", "unexpected Tahsili path");
assert(taxonomy.subjectId === "sub_tah_biology_bio26", "unexpected dedicated biology subject");
assert(taxonomy.protectedLegacySubjectId === "sub_1784980740570", "legacy environment subject must remain protected");
assert(Array.isArray(taxonomy.items) && taxonomy.items.length === 29, "expected 29 main skills");
const subs = taxonomy.items.flatMap((item) => item.subSkills || []);
assert(subs.length === 98, "expected 98 subskills");
assert(new Set(taxonomy.items.map((item) => item.id)).size === 29, "duplicate production main ids");
assert(new Set(subs.map((item) => item.id)).size === 98, "duplicate production subskill ids");
assert(taxonomy.items.every((item) => String(item.id).startsWith("skill_tah_bio_")), "invalid main prefix");
assert(subs.every((item) => String(item.id).startsWith("sub_tah_bio_")), "invalid subskill prefix");
assert(deploy.includes('const PROTECTED_LEGACY_SUBJECT_ID = "sub_1784980740570";'), "legacy subject protection missing");
assert(deploy.includes('if (questionCount !== 0 || foreignCodeCount !== 0)'), "first apply zero-question guard missing");
assert(deploy.includes("BIO26_TAXONOMY_PRE_APPLY"), "snapshot guard missing");
assert(deploy.includes("protectedLegacyUnchanged"), "legacy post-apply verification missing");
assert(deploy.includes("BIO26_TAXONOMY_APPLY_PASS"), "post-apply PASS marker missing");
console.log(JSON.stringify({status:"PASS",project:"BIO26",mainSkills:29,subSkills:98,subjectId:taxonomy.subjectId},null,2));
