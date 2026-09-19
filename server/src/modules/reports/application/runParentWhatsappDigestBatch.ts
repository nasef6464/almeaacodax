import { UserModel } from "../../../models/User.js";
import { QuizResultModel } from "../../../models/QuizResult.js";
import { enqueueNotificationDeliveries } from "../../../queues/notificationQueue.js";
import { getAuthorizedStudentIdsForParents } from "../../../services/parentAuthorityService.js";
import { createNotificationDeliveries } from "../../../services/notificationService.js";

export async function runParentWhatsappDigestBatch(createdBy: string) {
  const parents = await UserModel.find({
    role: "parent",
    whatsappDigestEnabled: true,
    phone: { $exists: true, $ne: "" },
  })
    .select("_id name phone")
    .lean() as any[];

  const parentIds = parents.map((parent) => String(parent._id));
  const authorizedStudentsByParent = await getAuthorizedStudentIdsForParents(parentIds);
  const allStudentIds = Array.from(
    new Set(
      parentIds.flatMap((parentId) => authorizedStudentsByParent.get(parentId) || []),
    ),
  );

  const latestResults = allStudentIds.length
    ? await QuizResultModel.aggregate([
        { $match: { userId: { $in: allStudentIds } } },
        { $sort: { createdAt: -1, _id: -1 } },
        {
          $group: {
            _id: "$userId",
            score: { $first: "$score" },
            createdAt: { $first: "$createdAt" },
          },
        },
      ])
    : [];
  const latestByUser = new Map<string, any>(
    (latestResults as any[]).map((row) => [String(row._id || ""), row]),
  );

  let sentCount = 0;
  let skippedNoStudents = 0;
  let skippedNoDelivery = 0;

  for (const parent of parents) {
    const parentId = String(parent._id);
    const linkedStudentIds = authorizedStudentsByParent.get(parentId) || [];
    if (!linkedStudentIds.length) {
      skippedNoStudents += 1;
      continue;
    }

    const rows = linkedStudentIds.map((studentId) => {
      const row = latestByUser.get(String(studentId));
      return row
        ? `- الطالب ${studentId}: آخر نتيجة ${Number(row.score || 0)}%`
        : `- الطالب ${studentId}: لا توجد نتيجة حديثة`;
    });
    const body = `تقرير منصة المئة الأسبوعي:\nمرحباً بك ${parent.name || ""}\n\n${rows.join("\n")}`;

    const delivery = await createNotificationDeliveries({
      title: "تقرير أسبوعي للأبناء",
      subject: "تقرير منصة المئة الأسبوعي",
      body,
      channels: ["whatsapp"],
      userIds: [parentId],
      createdBy,
    });

    if (!delivery.deliveryIds?.length) {
      skippedNoDelivery += 1;
      continue;
    }

    await enqueueNotificationDeliveries(delivery.deliveryIds);
    sentCount += 1;
  }

  return {
    processedParents: parents.length,
    sentWhatsApp: sentCount,
    skippedNoStudents,
    skippedNoDelivery,
  };
}
