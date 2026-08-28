import type { Server } from "http";
import mongoose from "mongoose";
import { closeRedisClients } from "../../config/redis.js";
import { closeNotificationQueue } from "../../queues/notificationQueue.js";
import { closeNotificationRealtime } from "../../modules/notifications/infrastructure/notificationRealtime.js";

/**
 * Registers the API process' existing graceful-shutdown contract.
 *
 * This extraction intentionally preserves signal handling, the 15-second
 * forced-exit timeout, resource close order, logging, and process exit codes.
 */
export function registerGracefulShutdown(server: Server) {
  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.info(`[shutdown] received ${signal}; closing server resources`);
    const forceExitTimer = setTimeout(() => {
      console.error("[shutdown] forced exit after timeout");
      process.exit(1);
    }, 15_000);
    forceExitTimer.unref();

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      await closeNotificationQueue();
      await closeNotificationRealtime();
      await closeRedisClients();
      await mongoose.connection.close(false);
      clearTimeout(forceExitTimer);
      console.info("[shutdown] completed cleanly");
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimer);
      console.error("[shutdown] failed", error);
      process.exit(1);
    }
  };

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
}
