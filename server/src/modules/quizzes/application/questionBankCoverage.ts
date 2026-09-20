import { QuestionModel } from "../../../models/Question.js";

export type QuestionBankCoverage = {
  total: number;
  mainSkillCount: number;
  subSkillCount: number;
  pendingCount: number;
  approvedCount: number;
};

const emptyCoverage: QuestionBankCoverage = {
  total: 0,
  mainSkillCount: 0,
  subSkillCount: 0,
  pendingCount: 0,
  approvedCount: 0,
};

export async function getQuestionBankCoverage(filter: Record<string, unknown>): Promise<QuestionBankCoverage> {
  const [coverage] = await QuestionModel.aggregate([
    { $match: filter },
    {
      $project: {
        sectionId: 1,
        skillIds: { $ifNull: ["$skillIds", []] },
        approvalStatus: 1,
      },
    },
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
  ]).allowDiskUse(false);

  return coverage
    ? {
        total: Number(coverage.total || 0),
        mainSkillCount: Number(coverage.mainSkillCount || 0),
        subSkillCount: Number(coverage.subSkillCount || 0),
        pendingCount: Number(coverage.pendingCount || 0),
        approvedCount: Number(coverage.approvedCount || 0),
      }
    : emptyCoverage;
}
