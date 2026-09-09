import { GroupModel } from "../../../models/Group.js";

const idOf = (value: unknown) => String(value || "");

/**
 * Marks only a verified school/class-targeted submission as a school assessment.
 * A personal directed quiz is not promoted to school context by guesswork.
 */
export const resolveQuizSubmissionLearningContext = async (input: { quiz: any; learnerId: string; learnerSchoolId?: string | null }) => {
  const targetGroupIds = Array.from(new Set((input.quiz?.targetGroupIds || []).map(idOf).filter(Boolean)));
  if (!targetGroupIds.length) return { learningContext: "platform_self_study" as const };
  const targetGroups = await GroupModel.find({ _id: { $in: targetGroupIds }, type: { $in: ["SCHOOL", "CLASS"] } }).select("_id type parentId studentIds").lean();
  const classGroup = targetGroups.find((group: any) => group.type === "CLASS" && (group.studentIds || []).map(idOf).includes(input.learnerId));
  if (classGroup) return { learningContext: "school_assessment" as const, schoolId: idOf(classGroup.parentId), classId: idOf(classGroup._id) };
  const schoolGroup = targetGroups.find((group: any) => group.type === "SCHOOL" && (idOf(group._id) === idOf(input.learnerSchoolId) || (group.studentIds || []).map(idOf).includes(input.learnerId)));
  if (schoolGroup) return { learningContext: "school_assessment" as const, schoolId: idOf(schoolGroup._id) };
  return { learningContext: "platform_self_study" as const };
};
