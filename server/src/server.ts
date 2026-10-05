import { bootstrapServer } from "./app/bootstrap/bootstrapServer.js";
import { reportStartupFailure } from "./app/bootstrap/reportStartupFailure.js";

async function start() {
  // One-shot, guard-protected production reconciliation. Disabled by default.
  if (process.env.RUN_VERBAL26_PRODUCTION_APPLY === "true") {
    const { deployVerbalEcosystem } = await import("./scripts/deployVerbalEcosystem.js");
    await deployVerbalEcosystem();
  }
  await bootstrapServer();
}

start().catch((error) => {
  reportStartupFailure(error);
  process.exit(1);
});
