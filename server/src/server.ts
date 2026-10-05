import { bootstrapServer } from "./app/bootstrap/bootstrapServer.js";
import { reportStartupFailure } from "./app/bootstrap/reportStartupFailure.js";

async function start() {
  // One-shot, guard-protected production reconciliation.
  // Uses the existing approved VERBAL26 apply contract; no new runtime env key.
  if (process.env.ALLOW_VERBAL26_APPLY === "true" && process.env.VERBAL26_DRY_RUN === "false") {
    const { deployVerbalEcosystem } = await import("./scripts/deployVerbalEcosystem.js");
    await deployVerbalEcosystem();
  }
  await bootstrapServer();
}

start().catch((error) => {
  reportStartupFailure(error);
  process.exit(1);
});
