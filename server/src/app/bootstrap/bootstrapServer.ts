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
  });

  startWeeklyParentReportSchedule();
  void runStartupMaintenance();
}
