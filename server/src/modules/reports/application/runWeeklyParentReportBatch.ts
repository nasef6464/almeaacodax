import { UserModel } from "../../../models/User.js";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { NotificationDeliveryModel } from "../../../models/NotificationDelivery.js";
import { createNotificationDeliveries } from "../../../services/notificationService.js";

const RIYADH_TIME_ZONE = "Asia/Riyadh";

function riyadhDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RIYADH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>;
}

function previousSundayKey(date = new Date()) {
  const parts = riyadhDateParts(date);
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const day = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  day.setUTCDate(day.getUTCDate() - (weekdayIndex < 0 ? 0 : weekdayIndex));
  return day.toISOString().slice(0, 10);
}

export function weeklyParentReportExecutionKey(date = new Date()) {
  return `weekly-parent-report:${previousSundayKey(date)}`;
}

const uniqueStrings = (values: unknown[]) =>
  Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

export async function runWeeklyParentReportBatch(executionKey = weeklyParentReportExecutionKey()) {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const parents = await UserModel.find({ role: "parent" })
    .select("_id id name linkedStudentIds childrenIds")
    .lean() as any[];

  const parentRows = parents
    .map((parent) => {
      const linkedIds = uniqueStrings([
        ...(parent.linkedStudentIds || []),
        ...(parent.childrenIds || []),
      ]);
      const parentId = String(parent.id || parent._id);
      return {
        parent,
        parentId,
        linkedIds,
        campaignId: `${executionKey}:${parentId}`,
      };
    })
    .filter((row) => row.linkedIds.length > 0);

  const campaignIds = parentRows.map((row) => row.campaignId);
  const allLinkedIds = uniqueStrings(parentRows.flatMap((row) => row.linkedIds));
  const dateFilter = { $or: [{ createdAt: { $gte: new Date(since) } }, { date: { $gte: new Date(since) } }] };

  const [existingDeliveries, weeklyResults] = await Promise.all([
    campaignIds.length
      ? NotificationDeliveryModel.find({ campaignId: { $in: campaignIds }, channel: "in_app" })
          .select("campaignId recipientUserId")
          .lean()
      : Promise.resolve([]),
    allLinkedIds.length
      ? QuizResultModel.find({
          $and: [
            { $or: [{ userId: { $in: allLinkedIds } }, { studentId: { $in: allLinkedIds } }] },
            dateFilter,
          ],
        })
          .select("userId studentId score skillsAnalysis")
          .lean()
      : Promise.resolve([]),
  ]) as [any[], any[]];

  const deliveredKeys = new Set(
    existingDeliveries.map((delivery: any) => `${String(delivery.campaignId || "")}:${String(delivery.recipientUserId || "")}`),
  );
  const resultsByStudent = new Map<string, any[]>();
  for (const result of weeklyResults) {
    const resultStudentIds = uniqueStrings([result.userId, result.studentId]);
    for (const studentId of resultStudentIds) {
      const rows = resultsByStudent.get(studentId) || [];
      rows.push(result);
      resultsByStudent.set(studentId, rows);
    }
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of parentRows) {
    const { parentId: pId, linkedIds, campaignId } = row;
    if (deliveredKeys.has(`${campaignId}:${pId}`)) {
      skipped += 1;
      continue;
    }

    try {
      const parentResults = new Map<string, any>();
      for (const linkedId of linkedIds) {
        for (const result of resultsByStudent.get(linkedId) || []) {
          parentResults.set(String(result._id), result);
        }
      }
      const results = Array.from(parentResults.values());
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
        campaignId,
        title: "📋 تقريرك الأسبوعي عن أداء أبنائك",
        body,
        channels: ["in_app"],
        userIds: [pId],
        createdBy: "system_weekly_cron",
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`[weekly-report] parent=${pId} failed`, error);
    }
  }

  const summary = { executionKey, parents: parents.length, sent, skipped, failed };
  console.info(`[weekly-report] Done. ${JSON.stringify(summary)}`);
  if (failed > 0) throw new Error(`weekly_parent_report_partial_failure:${failed}`);
  return summary;
}
