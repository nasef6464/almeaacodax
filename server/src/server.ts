import { bootstrapServer } from "./app/bootstrap/bootstrapServer.js";
import { reportStartupFailure } from "./app/bootstrap/reportStartupFailure.js";

bootstrapServer().catch((error) => {
  reportStartupFailure(error);
  process.exit(1);
});
