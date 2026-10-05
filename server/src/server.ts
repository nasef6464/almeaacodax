import { bootstrapServer } from "./app/bootstrap/bootstrapServer.js";
import { reportStartupFailure } from "./app/bootstrap/reportStartupFailure.js";

async function runVerbal26ApplyIfRequested() {
  // One-shot, guard-protected production reconciliation.
  // Uses the existing approved VERBAL26 apply contract; no new runtime env key.
  if (process.env.ALLOW_VERBAL26_APPLY !== "true" || process.env.VERBAL26_DRY_RUN !== "false") {
    return;
  }
  const { deployVerbalEcosystem } = await import("./scripts/deployVerbalEcosystem.js");
  await deployVerbalEcosystem();
}

async function runChem26TaxonomyApplyIfRequested() {
  const mode = String(process.env.QUESTION_PILOT_MODE || "").trim().toLowerCase();
  if (mode !== "chem26-taxonomy-apply") return;
  if (process.env.PILOT_ALLOW_EXTERNAL_RUN !== "YES" || process.env.PILOT_WRITE_AUTHORIZATION !== "YES") {
    throw new Error("CHEM26 taxonomy apply is fail-closed behind approved pilot authorization flags.");
  }
  const { deployChem26Taxonomy } = await import("./scripts/deployChemTaxonomy27.js");
  await deployChem26Taxonomy({ apply: true });
}

runVerbal26ApplyIfRequested()
  .then(() => runChem26TaxonomyApplyIfRequested())
  .then(() => {
    bootstrapServer().catch((error) => {
      reportStartupFailure(error);
      process.exit(1);
    });
  })
  .catch((error) => {
    reportStartupFailure(error);
    process.exit(1);
  });
