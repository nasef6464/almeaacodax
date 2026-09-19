import { UserModel } from "../../../models/User.js";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { NotificationDeliveryModel } from "../../../models/NotificationDelivery.js";
import { createNotificationDeliveries } from "../../../services/notificationService.js";
import { getAuthorizedStudentIdsForParents } from "../../../services/parentAuthorityService.js";

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

export async function runWeeklyParentReportBatch(executionKey = weeklyParentReportExecutionKey()) {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const parents = await UserModel.find({ role: "parent" })
    .select("_id id name linkedStudentIds childrenIds")
    .lean() as any[];

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const parentIds = parents.map((parent) => String(parent.id || parent._id));
  const authorizedStudentsByParent = await getAuthorizedStudentIdsForParents(parentIds);
  const parentLinks = parents.map((parent) => {
    const parentId = String(parent.id || parent._id);
    return {
      parent,
      linkedIds: authorizedStudentsByParent.get(parentId) || [],
    };
  });
  const allStudentIds = Array.from(new Set(parentLinks.flatMap(({ linkedIds }) => linkedIds)));
  const weeklyResults = allStudentIds.length
    ? await QuizResultModel.find({
        $and: [
          { $or: [{ userId: { $in: allStudentIds } }, { studentId: { $in: allStudentIds } }] },
          { $or: [{ createdAt: { $gte: new Date(since) } }, { date: { $gte: new Date(since) } }] },
        ],
      })
        .select("userId studentId score skillsAnalysis")
        .lean() as any[]
    : [];
  const resultsByStudent = new Map<string, any[]>();
  for (const result of weeklyResults) {
    const studentId = String(result.userId || result.studentId || "");
    if (!studentId) continue;
    const rows = resultsByStudent.get(studentId) || [];
    rows.push(result);
    resultsByStudent.set(studentId, rows);
  }

  const candidateCampaigns = parentLinks
    .filter(({ linkedIds }) => linkedIds.length > 0)
    .map(({ parent }) => {
      const parentId = String(parent.id || parent._id);
      return {
        parentId,
        campaignId: `${executionKey}:${parentId}`,
      };
    });
  const existingDeliveries = candidateCampaigns.length
    ? await NotificationDeliveryModel.find({
        campaignId: { $in: candidateCampaigns.map((item) => item.campaignId) },
        channel: "in_app",
      })
        .select("campaignId recipientUserId")
        .lean()
    : [];
  const deliveredCampaignKeys = new Set(
    (existingDeliveries as any[]).map(
      (item) => `${String(item.campaignId || "")}:${String(item.recipientUserId || "")}`,
    ),
  );

  for (const { parent, linkedIds } of parentLinks) {
    if (!linkedIds.length) continue;

    const pId = String(parent.id || parent._id);
    const campaignId = `${executionKey}:${pId}`;
    if (deliveredCampaignKeys.has(`${campaignId}:${pId}`)) {
      skipped += 1;
      continue;
    }

    try {
      const results = linkedIds.flatMap((studentId) => resultsByStudent.get(studentId) || []);

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
