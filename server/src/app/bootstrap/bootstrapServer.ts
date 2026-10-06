import { createServer } from "http";
import { createApp } from "../../app.js";
import { connectToDatabase } from "../../config/db.js";
import { env } from "../../config/env.js";
import { startWeeklyParentReportSchedule } from "../../modules/reports/application/startWeeklyParentReportSchedule.js";
import { startNotificationRealtime } from "../../modules/notifications/infrastructure/notificationRealtime.js";
import { startNotificationWorkers } from "../../queues/notificationQueue.js";
import { createSocketServer } from "../../sockets/index.js";
import { registerGracefulShutdown } from "./registerGracefulShutdown.js";
import { runStartupMaintenance } from "./runStartupMaintenance.js";
import { runQuestionPilotPackageImportIfRequested } from "./runQuestionPilotPackageImport.js";
import { runChem26PackageImportIfRequested } from "./runChem26PackageImport.js";
import { runBio26PackageImportIfRequested } from "./runBio26PackageImport.js";
import { runChem26FinalClosureIfRequested } from "../../scripts/runChem26FinalClosure.js";
import { runChem26LearningStructureIfNeeded } from "./runChem26LearningStructure.js";
import { runChem26StandardTestsIfNeeded } from "./runChem26StandardTests.js";

/**
 * Composes the existing API runtime in one explicit bootstrap boundary.
 * Ordering is intentionally preserved from server.ts.
 */
export async function bootstrapServer() {
  await connectToDatabase();

  const app = createApp();
  const server = createServer(app);
  createSocketServer(server);
  startNotificationRealtime();
  startNotificationWorkers();
  registerGracefulShutdown(server);

  server.listen(env.PORT, () => {
    console.log(`API server listening on http://localhost:${env.PORT}`);
    void runQuestionPilotPackageImportIfRequested().catch((error) => {
      console.error("COL26OLD_IMPORT_FAILED", error instanceof Error ? error.message : "Unknown error");
    });
    void runChem26PackageImportIfRequested().catch((error) => {
      console.error("CHEM26_IMPORT_FAILED", error instanceof Error ? error.message : "Unknown error");
    });
    void runChem26FinalClosureIfRequested().catch((error) => {
      console.error("CHEM26_FINAL_CLOSURE_FAILED", error instanceof Error ? error.message : "Unknown error");
    });
    void runChem26LearningStructureIfNeeded().catch((error) => {
      console.error("CHEM26_LEARNING_STRUCTURE_FAILED", error instanceof Error ? error.message : "Unknown error");
    });
    void runChem26StandardTestsIfNeeded().catch((error) => {
      console.error("CHEM26_STANDARD_TESTS_FAILED", error instanceof Error ? error.message : "Unknown error");
    });
    void runBio26PackageImportIfRequested().catch((error) => {
      console.error("BIO26_IMPORT_FAILED", error instanceof Error ? error.message : "Unknown error");
    });
  });

  startWeeklyParentReportSchedule();
  void runStartupMaintenance();
}
