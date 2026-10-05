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

runVerbal26ApplyIfRequested()
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
