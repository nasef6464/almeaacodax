import { QuestionModel } from "../../../models/Question.js";
import { SkillModel } from "../../../models/Skill.js";

export type QuestionBankCoverage = {
  total: number;
  mainSkillCount: number;
  subSkillCount: number;
  pendingCount: number;
  approvedCount: number;
  skillQuestionCounts: Record<string, number>;
  sectionQuestionCounts: Record<string, number>;
};

const emptyCoverage: QuestionBankCoverage = {
  total: 0,
  mainSkillCount: 0,
  subSkillCount: 0,
  pendingCount: 0,
  approvedCount: 0,
  skillQuestionCounts: {},
  sectionQuestionCounts: {},
};

const toCountMap = (rows: Array<{ _id?: unknown; count?: unknown }> | undefined) =>
  Object.fromEntries(
    (rows || [])
      .map((row) => [String(row?._id || "").trim(), Number(row?.count || 0)] as const)
      .filter(([id, count]) => Boolean(id) && Number.isFinite(count)),
  );

export async function getQuestionBankCoverage(filter: Record<string, unknown>): Promise<QuestionBankCoverage> {
  const [result] = await QuestionModel.aggregate([
    { $match: filter },
    {
      $project: {
        sectionId: 1,
        skillIds: { $ifNull: ["$skillIds", []] },
        approvalStatus: 1,
      },
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              mainSkillIds: { $addToSet: "$sectionId" },
              skillIdArrays: { $push: "$skillIds" },
              pendingCount: {
                $sum: { $cond: [{ $eq: ["$approvalStatus", "pending_review"] }, 1, 0] },
              },
              approvedCount: {
                $sum: { $cond: [{ $eq: ["$approvalStatus", "approved"] }, 1, 0] },
              },
            },
          },
          {
            $project: {
              _id: 0,
              total: 1,
              mainSkillCount: {
                $size: {
                  $filter: {
                    input: "$mainSkillIds",
                    as: "sectionId",
                    cond: {
                      $and: [
                        { $ne: ["$$sectionId", null] },
                        { $ne: ["$$sectionId", ""] },
                      ],
                    },
                  },
                },
              },
              subSkillCount: {
                $size: {
                  $filter: {
                    input: {
                      $reduce: {
                        input: "$skillIdArrays",
                        initialValue: [],
                        in: { $setUnion: ["$$value", "$$this"] },
                      },
                    },
                    as: "skillId",
                    cond: {
                      $and: [
                        { $ne: ["$$skillId", null] },
                        { $ne: ["$$skillId", ""] },
                      ],
                    },
                  },
                },
              },
              pendingCount: 1,
              approvedCount: 1,
            },
          },
        ],
        skillCounts: [
          { $unwind: "$skillIds" },
          { $match: { skillIds: { $nin: [null, ""] } } },
          { $group: { _id: "$skillIds", count: { $sum: 1 } } },
        ],
        sectionCounts: [
          { $match: { sectionId: { $nin: [null, ""] } } },
          { $group: { _id: "$sectionId", count: { $sum: 1 } } },
        ],
      },
    },
  ]).allowDiskUse(false);

  const summary = result?.summary?.[0];
  if (!summary) return emptyCoverage;

  const skillQuestionCounts = toCountMap(result?.skillCounts);
  const topLevelSkillIds = new Set(
    (await SkillModel.find({}).select("id").lean())
      .map((skill: any) => String(skill?.id || skill?._id || "").trim())
      .filter(Boolean),
  );
  const nestedSubSkillCount = Object.keys(skillQuestionCounts)
    .filter((skillId) => !topLevelSkillIds.has(skillId))
    .length;

  return {
    total: Number(summary.total || 0),
    mainSkillCount: Number(summary.mainSkillCount || 0),
    subSkillCount: nestedSubSkillCount,
    pendingCount: Number(summary.pendingCount || 0),
    approvedCount: Number(summary.approvedCount || 0),
    skillQuestionCounts,
    sectionQuestionCounts: toCountMap(result?.sectionCounts),
  };
}
