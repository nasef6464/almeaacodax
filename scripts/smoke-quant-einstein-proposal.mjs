import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const executable = "scripts/audit-quant-einstein-proposal.mjs";

const reportOnly = spawnSync(process.execPath, [executable], { encoding: "utf8" });
assert.equal(reportOnly.status, 0, reportOnly.stderr);
const report = JSON.parse(reportOnly.stdout);
assert.equal(report.write_operations, 0);
assert.equal(report.status, "BLOCKED");
assert.equal(report.observed_main, 29);
assert.equal(report.observed_sub, 104);
assert.equal(report.declared_sub, 108);
assert.equal(report.unique_candidate_codes, 104);
assert.equal(report.source_verified_rows, 0);
assert.equal(report.mapped_canonical_ids, 0);
assert.ok(report.errors.includes("NotebookLM_declared_count_disagrees_with_rows"));
assert.ok(report.blockers.includes("original_Einstein_PDFs_not_independently_verified"));
assert.ok(report.blockers.includes("current_taxonomy_and_topic_ID_crosswalk_missing"));

const failClosed = spawnSync(process.execPath, [executable, "--fail-on-block"], { encoding: "utf8" });
assert.equal(failClosed.status, 1, failClosed.stderr);

console.log("PASS: Einstein quant NotebookLM candidate remains fail-closed, with zero write operations.");
