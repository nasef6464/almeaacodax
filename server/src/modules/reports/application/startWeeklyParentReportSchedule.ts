import { startWeeklyParentReportQueue } from "../infrastructure/weeklyParentReportQueue.js";

export function startWeeklyParentReportSchedule() {
  return startWeeklyParentReportQueue();
}
