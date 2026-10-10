import { GroupModel } from "../../../models/Group.js";
import { resolveAuthUserByAuthId } from './quizUserLookup.js';

const idOf = (value: unknown) => String(value || "");

/**
 * Uses verified school/class targeting or an individual target sent by the
 * learner's school staff. Membership alone never changes a personal test.
 */
export const resolveQuizSubmissionLearningContext = async (input: { quiz: any; learnerId: string; learnerSchoolId?: string | null }) => {
  const targetGroupIds = Array.from(new Set((input.quiz?.targetGroupIds || []).map(idOf).filter(Boolean)));
  if (!targetGroupIds.length) {
    const individuallyTargeted = (input.quiz?.targetUserIds || []).map(idOf).includes(input.learnerId);
    const creatorId = idOf(input.quiz?.createdBy);
    if (individuallyTargeted && creatorId && input.learnerSchoolId) {
      const creator = await resolveAuthUserByAuthId(creatorId);
      if (creator && ['supervisor', 'teacher', 'school_admin'].includes(creator.role)) {
        if (idOf(creator.schoolId) === idOf(input.learnerSchoolId)) {
          return { learningContext: 'school_assessment' as const, schoolId: idOf(input.learnerSchoolId) };
        }
        const senderGroups = creator.groupIds || [];
        const assignedClass = senderGroups.length ? await GroupModel.findOne({
          _id: { $in: senderGroups }, type: 'CLASS', parentId: idOf(input.learnerSchoolId), studentIds: input.learnerId,
        }).select('_id parentId').lean() : null;
        if (assignedClass) return { learningContext: 'school_assessment' as const, schoolId: idOf(assignedClass.parentId), classId: idOf(assignedClass._id) };
      }
    }
    return { learningContext: "platform_self_study" as const };
  }
  const targetGroups = await GroupModel.find({ _id: { $in: targetGroupIds }, type: { $in: ["SCHOOL", "CLASS"] } }).select("_id type parentId studentIds").lean();
  const classGroup = targetGroups.find((group: any) => group.type === "CLASS" && (group.studentIds || []).map(idOf).includes(input.learnerId));
  if (classGroup) return { learningContext: "school_assessment" as const, schoolId: idOf(classGroup.parentId), classId: idOf(classGroup._id) };
  const schoolGroup = targetGroups.find((group: any) => group.type === "SCHOOL" && (idOf(group._id) === idOf(input.learnerSchoolId) || (group.studentIds || []).map(idOf).includes(input.learnerId)));
  if (schoolGroup) return { learningContext: "school_assessment" as const, schoolId: idOf(schoolGroup._id) };
  return { learningContext: "platform_self_study" as const };
};
