import type { PipelineStage } from "mongoose";
import { UserModel } from "../../../models/User.js";
import { SchoolSkillAggregateModel } from "../../../models/SchoolSkillAggregate.js";

/** Keep the complete authorized roster inside Mongo; only final report rows leave it. */
export const buildSchoolSkillReportJoin = (
  studentFilter: Record<string, unknown>,
  aggregateFilter: Record<string, unknown>,
): PipelineStage[] => [
  { $match: studentFilter },
  // Match the existing lean-document String(id || _id) identity and oldest-name
  // winner for duplicate aliases. Deduplication prevents evidence multiplication.
  { $sort: { createdAt: -1 } },
  { $project: {
    studentName: { $ifNull: ["$name", "طالب"] },
    studentId: { $convert: {
      input: { $cond: [
        { $in: [{ $ifNull: ["$id", null] }, [null, "", 0, false]] }, "$_id", "$id",
      ] }, to: "string", onError: "", onNull: "",
    } },
  } },
  { $match: { studentId: { $ne: "" } } },
  { $group: { _id: "$studentId", studentName: { $last: "$studentName" } } },
  { $lookup: {
    from: SchoolSkillAggregateModel.collection.name,
    localField: "_id", foreignField: "userId",
    pipeline: [{ $match: aggregateFilter }], as: "evidence",
  } },
  { $unwind: "$evidence" },
  { $replaceRoot: { newRoot: { $mergeObjects: ["$evidence", { reportStudentName: "$studentName" }] } } },
];

export const readSchoolSkillReport = (pipeline: PipelineStage[]) =>
  UserModel.aggregate(pipeline).allowDiskUse(true);
