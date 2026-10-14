#!/usr/bin/env node
// Read-only taxonomy preflight. NEVER imports questions, updates MongoDB, or edits learner progress.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const defaultPath = "ops/quant-skill-redesign/EINSTEIN_NOTEBOOKLM_20261014_CANDIDATE.json";
const flags = process.argv.slice(2);
const manifestPath = resolve(flags.find((arg) => !arg.startsWith("--")) || defaultPath);
const failOnBlock = flags.includes("--fail-on-block");

function audit(manifest) {
  const items = Array.isArray(manifest.items) ? manifest.items : [];
  const errors = [];
  const warnings = [];
  const codes = new Set();
  const mainCodes = new Set();
  const canonicalIds = new Set();

  for (const [index, item] of items.entries()) {
    const id = String(item?.candidate_code ?? "").trim();
    const main = String(item?.main_code ?? "").trim();
    if (!/^Q\d{2}\.\d{2}$/.test(id)) errors.push("invalid_candidate_code_at_row_" + (index + 1));
    if (codes.has(id)) errors.push("duplicate_candidate_code:" + id);
    codes.add(id);
    if (!/^\d{2}$/.test(main) || id.slice(1, 3) !== main) errors.push("main_code_mismatch:" + id);
    mainCodes.add(main);
    if (!String(item?.main_name ?? "").trim() || !String(item?.sub_name ?? "").trim()) {
      errors.push("empty_skill_name_at_row_" + (index + 1));
    }
    if (!String(item?.book_rule_claim ?? "").trim() || !String(item?.foundation_page_claim ?? "").trim()) {
      warnings.push("book_rule_or_page_missing:" + id);
    }
    if (item?.source_verified !== true) warnings.push("original_book_not_verified:" + id);
    const canonical = String(item?.canonical_subskill_id ?? "").trim();
    if (!canonical) {
      warnings.push("canonical_subskill_mapping_missing:" + id);
    } else {
      if (canonicalIds.has(canonical)) {
        warnings.push("shared_canonical_subskill_requires_explicit_merge_review:" + canonical);
      }
      canonicalIds.add(canonical);
    }
  }

  if (manifest.parsed_sub_count !== items.length) errors.push("parsed_sub_count_mismatch");
  if (manifest.parsed_main_count !== mainCodes.size) errors.push("parsed_main_count_mismatch");
  if (manifest.claimed_sub_count !== items.length) errors.push("NotebookLM_declared_count_disagrees_with_rows");
  if (manifest.claimed_main_count !== mainCodes.size) errors.push("NotebookLM_declared_main_count_disagrees_with_rows");

  const blockers = [...errors];
  if (manifest.source_pdf_independently_verified !== true) blockers.push("original_Einstein_PDFs_not_independently_verified");
  if (manifest.book_questions_individually_verified !== true) blockers.push("individual_question_source_evidence_missing");
  if (manifest.live_25_95_crosswalk_verified !== true) blockers.push("current_taxonomy_and_topic_ID_crosswalk_missing");
  if (items.some((x) => x.source_verified !== true)) blockers.push("unreviewed_source_claims_present");
  if (items.some((x) => !x.canonical_subskill_id)) blockers.push("unmapped_canonical_subskill_IDs_present");
  // A human-reviewed approval manifest is mandatory; a proposal file can never be used as a migration.
  blockers.push("requires_separate_signed_approval_manifest_and_dry_run");

  return {
    status: "BLOCKED",
    write_operations: 0,
    declared_main: manifest.claimed_main_count,
    observed_main: mainCodes.size,
    declared_sub: manifest.claimed_sub_count,
    observed_sub: items.length,
    unique_candidate_codes: codes.size,
    source_verified_rows: items.filter((x) => x.source_verified === true).length,
    mapped_canonical_ids: items.filter((x) => Boolean(x.canonical_subskill_id)).length,
    errors,
    warning_count: warnings.length,
    blockers,
    next_action: "source-page and question-image review, live 25/95 taxonomy export, then explicit old-ID to candidate crosswalk",
  };
}

try {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const report = audit(manifest);
  const sourceEvidence = JSON.parse(readFileSync(resolve("ops/quant-skill-redesign/EINSTEIN_FOUNDATION_SOURCE_SPOTCHECK_20261014.json"), "utf8"));
  const maxPage = sourceEvidence.source_pdf_pages;
  const claimsOutsidePdf = manifest.items.filter((item) => {
    const pageNumbers = [...String(item.foundation_page_claim || "").matchAll(/\d+/g)].map((x) => Number(x[0]));
    return pageNumbers.some((page) => page > maxPage);
  });
  report.source_pdf_pages = maxPage;
  report.foundation_page_claims_outside_pdf = claimsOutsidePdf.length;
  report.foundation_page_outlier_codes = claimsOutsidePdf.map((x) => x.candidate_code);
  if (claimsOutsidePdf.length) report.blockers.push("foundation_page_claims_exceed_original_pdf_length");
  if (sourceEvidence.spot_checks.some((x) => x.assessment === "INCORRECT_NOTEBOOKLM_PAGE")) {
    report.blockers.push("NotebookLM_individual_example_page_mismatch");
  }
  console.log(JSON.stringify(report, null, 2));
  if (failOnBlock && report.blockers.length > 0) process.exitCode = 1;
} catch (error) {
  console.error("Quant taxonomy preflight error:", error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
