import { readFile } from "node:fs/promises";
const read=(p)=>readFile(new URL(`../${p}`,import.meta.url),"utf8");
const [
  db1,db2,db3,db4,db5,scale,backend,deep,school,payment,db2Migration,db3Migration
]=await Promise.all([
  read("docs/MASTER_CONTROL/DB1_INVENTORY_GROWTH_BASELINE_2026-09-28.md"),
  read("docs/MASTER_CONTROL/DB2_SCHEMA_RELATIONSHIP_INTEGRITY_2026-09-28.md"),
  read("docs/MASTER_CONTROL/DB3_QUERY_INDEX_ENGINEERING_2026-09-28.md"),
  read("docs/MASTER_CONTROL/DB4_HIGH_VOLUME_GROWTH_2026-09-28.md"),
  read("docs/MASTER_CONTROL/DB5_CONSISTENCY_IDEMPOTENCY_2026-09-28.md"),
  read("server/src/scripts/db6ScaleCertificationGate.ts"),
  read(".github/workflows/platform-v3-backend-integration-gate.yml"),
  read(".github/workflows/platform-v3-deep-premerge-e2e-gate.yml"),
  read("server/src/modules/schools/application/schoolDirectorWorkspace.ts"),
  read("server/src/routes/payment.routes.ts"),
  read("server/src/scripts/backfillSchoolMemberships.ts"),
  read("server/src/scripts/db3ExactDuplicateIndexCleanup.ts"),
]);
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

for(const [name,doc] of Object.entries({DB1:db1,DB2:db2,DB3:db3,DB4:db4,DB5:db5})) {
  assert(doc.length > 500, `${name} evidence missing/empty`);
}
for(const marker of ["1_000","10_000","100_000","IXSCAN","totalDocsExamined","p95Ms","not a 100K concurrent-user claim"]) {
  assert(scale.includes(marker), `DB-6 scale proof missing: ${marker}`);
}
assert(backend.includes("Run DB-5 concurrency and idempotency gate") && backend.includes("Run DB-6 1K/10K/100K database scale gate"),"backend DB5/DB6 executable gates missing");
assert(deep.includes("Bounded isolated read-scale validation") && deep.includes("Operational multi-role API journeys"),"deep API/role scale coverage missing");
assert(school.includes(".limit(500)") && school.includes(".limit(1_000)"),"school roster/assignment bounds missing");
assert(payment.includes("resolvePagination(req.query"),"payment admin list pagination guard missing");
assert(db2Migration.includes('process.argv.includes("--apply")') && db2Migration.includes('process.argv.includes("--rollback")'),"DB-2 migration apply/rollback gates missing");
assert(db3Migration.includes('process.argv.includes("--apply")') && db3Migration.includes('safeExactDuplicateCandidate'),"DB-3 index migration containment missing");
assert(!db3Migration.includes("dropIndexes("),"bulk index drops forbidden");
console.log("PASS DB-6 final database certification contract");
