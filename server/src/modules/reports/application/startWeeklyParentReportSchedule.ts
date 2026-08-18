import { UserModel } from "../../../models/User.js";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { createNotificationDeliveries } from "../../../services/notificationService.js";

/**
 * Starts the existing weekly parent-report schedule without changing its
 * runtime contract. This extraction is structural only: the timer frequency,
 * Riyadh-time Sunday window, queries, score calculation, notification payload,
 * error handling, and unref behaviour intentionally match the previous
 * server.ts implementation.
 *
 * Keeping scheduling behind this application boundary lets a later scalability
 * batch replace the process-local timer with a queue-backed/distributed
 * scheduler without mixing that behavioural change into bootstrap cleanup.
 */
export function startWeeklyParentReportSchedule() {
  const HOUR_MS = 60 * 60 * 1000;
  const weeklyReportTimer = setInterval(async () => {
    try {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
      const isSunday = now.getDay() === 0;
      const hour = now.getHours();
      if (!isSunday || hour !== 8) return;

      console.info("[weekly-report] Starting Sunday parent report batch...");
      const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const parents = await UserModel.find({ role: "parent" })
        .select("_id id name linkedStudentIds childrenIds")
        .lean() as any[];

      let sent = 0;
      for (const parent of parents) {
        const linkedIds: string[] = [
          ...(parent.linkedStudentIds || []),
          ...(parent.childrenIds || []),
        ];
        if (!linkedIds.length) continue;

        const pId = String(parent.id || parent._id);
        const userFilter = { $or: linkedIds.flatMap((id: string) => [{ userId: id }, { studentId: id }]) };
        const dateFilter = { $or: [{ createdAt: { $gte: new Date(since) } }, { date: { $gte: new Date(since) } }] };
        const results = await QuizResultModel.find({ $and: [userFilter, dateFilter] })
          .select("userId studentId score skillsAnalysis")
          .lean() as any[];

        if (!results.length) continue;

        const scores = results.map((result) => Number(result.score || 0));
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const weak = results
          .flatMap((result: any) => (result.skillsAnalysis || []))
          .filter((skill: any) => Number(skill.mastery || 0) < 70)
          .slice(0, 3)
          .map((skill: any) => skill.skill || "");
        const emoji = avg >= 80 ? "🌟" : avg >= 60 ? "📈" : "📌";
        const body = `${emoji} متوسط الأسبوع: ${avg}%${weak.length ? ` · نقاط تحتاج مراجعة: ${weak.filter(Boolean).join("، ")}` : " · أداء ممتاز!"}`;

        await createNotificationDeliveries({
          title: "📋 تقريرك الأسبوعي عن أداء أبنائك",
          body,
          channels: ["in_app"],
          userIds: [pId],
          createdBy: "system_weekly_cron",
        }).catch(() => {});
        sent++;
      }
      console.info(`[weekly-report] Done. Notified ${sent} parents.`);
    } catch (error) {
      console.error("[weekly-report] cron failed", error);
    }
  }, HOUR_MS);

  weeklyReportTimer.unref();
}
