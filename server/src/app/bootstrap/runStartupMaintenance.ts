import { ensureAdminAccount } from "../../services/ensureAdminAccount.js";
import { ensureSkillTaxonomy } from "../../services/ensureSkillTaxonomy.js";

/**
 * Runs the existing best-effort startup maintenance tasks in their original
 * order. Failures remain isolated per task so API startup is not aborted by
 * taxonomy/admin maintenance errors.
 */
export async function runStartupMaintenance() {
  const tasks = [
    ["skill taxonomy", ensureSkillTaxonomy],
    ["admin account", ensureAdminAccount],
  ] as const;

  for (const [name, task] of tasks) {
    try {
      await task();
      console.info(`[startup] ${name} maintenance completed`);
    } catch (error) {
      console.error(`[startup] ${name} maintenance failed`, error);
    }
  }
}
