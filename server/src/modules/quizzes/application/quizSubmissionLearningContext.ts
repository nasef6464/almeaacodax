import { GroupModel } from "../../../models/Group.js";
import { resolveAuthUserByAuthId } from './quizUserLookup.js';
import {buildDocumentsByIdsQuery} from '../infrastructure/quizDocumentQuery.js';

const idOf = (value: unknown) => String(value || "");

/**
 * Uses verified school/class targeting or an individual target sent by the
 * learner's school staff. Membership alone never changes a personal test.
 */
export const resolveQuizSubmissionLearningContext = async (input: { quiz: any; learnerId: string; learnerSchoolId?: string | null }) => {
  const targetGroupIds: string[] = Array.from(new Set<string>((input.quiz?.targetGroupIds || []).map(idOf).filter(Boolean)));
  if(!targetGroupIds.length&&!(input.quiz?.targetUserIds||[]).map(idOf).includes(input.learnerId))return {learningContext:'platform_self_study' as const};
  const learner=await resolveAuthUserByAuthId(input.learnerId);
  const learnerSchoolId=idOf(learner?.schoolId),learnerGroups=(learner?.groupIds||[]).map(idOf);
  if (!targetGroupIds.length) {
    const individuallyTargeted = (input.quiz?.targetUserIds || []).map(idOf).includes(input.learnerId);
    const creatorId = idOf(input.quiz?.createdBy);
    if (individuallyTargeted && creatorId && learnerSchoolId) {
      const creator = await resolveAuthUserByAuthId(creatorId);
      if(creator?.role==='admin'&&creator.isActive!==false&&input.quiz?.mode==='central')return {learningContext:'school_assessment' as const,schoolId:learnerSchoolId};
      if (creator && ['supervisor', 'teacher', 'school_admin'].includes(creator.role)) {
        if (idOf(creator.schoolId) === learnerSchoolId) {
          return { learningContext: 'school_assessment' as const, schoolId: learnerSchoolId };
        }
        const senderGroups = creator.groupIds || [];
        const assignedClass = senderGroups.length ? await GroupModel.findOne({$and:[buildDocumentsByIdsQuery(senderGroups),
          {type:'CLASS',parentId:learnerSchoolId,$or:[{studentIds:input.learnerId},buildDocumentsByIdsQuery(learnerGroups)]}],
        }).setOptions({strictQuery:false}).select('_id parentId').lean() : null;
        if (assignedClass) return { learningContext: 'school_assessment' as const, schoolId: idOf(assignedClass.parentId), classId: idOf(assignedClass._id) };
      }
    }
    return { learningContext: "platform_self_study" as const };
  }
  const targetGroups = await GroupModel.find({$and:[buildDocumentsByIdsQuery(targetGroupIds),{type:{$in:['SCHOOL','CLASS']}}]}).setOptions({strictQuery:false}).select("id _id type parentId studentIds").lean();
  const classGroup = targetGroups.find((group: any) => group.type === "CLASS" && ((group.studentIds || []).map(idOf).includes(input.learnerId)||learnerGroups.includes(idOf(group.id||group._id))));
  if (classGroup) return { learningContext: "school_assessment" as const, schoolId: idOf(classGroup.parentId), classId: idOf(classGroup._id) };
  const schoolGroup = targetGroups.find((group: any) => group.type === "SCHOOL" && (idOf(group.id||group._id) === learnerSchoolId || (group.studentIds || []).map(idOf).includes(input.learnerId)));
  if (schoolGroup) return { learningContext: "school_assessment" as const, schoolId: idOf(schoolGroup._id) };
  return { learningContext: "platform_self_study" as const };
};
