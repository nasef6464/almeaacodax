import { UserModel } from '../../../models/User.js';
import { GroupModel } from '../../../models/Group.js';
import { QuizModel } from '../../../models/Quiz.js';
import { TeachingAssignmentModel } from '../../../models/TeachingAssignment.js';
import { buildDocumentQuery, buildDocumentsByIdsQuery } from '../infrastructure/quizDocumentQuery.js';
import { resolveSchoolDirectoryScope } from '../../schools/application/schoolDirectoryScope.js';
import { requireSchoolDirectorCapability } from '../../schools/application/schoolDirectorAccess.js';

const fail = (statusCode: number, message: string): never => { throw Object.assign(new Error(message), { statusCode }); };
const ids = (values: unknown[] = []) => [...new Set(values.map(String).filter(Boolean))];
export type SchoolAssessmentOperation = 'edit' | 'clone' | 'retarget' | 'reopen' | 'remind' | 'retake';

// Accept only a principal identity. Scope is reloaded; caller-supplied school or role
// fields never widen it. This context is server-only and contains no serialized roster.
export async function resolveSchoolAssessmentContext(principal: { id?: unknown; _id?: unknown }, quizId: string) {
  const actorId = String(principal.id || principal._id || '');
  const stored = await UserModel.findOne(buildDocumentQuery(actorId)).setOptions({strictQuery:false}).lean();
  if (!stored || stored.isActive === false) fail(403, 'Active staff required');
  const actor = { ...stored!, id: String((stored as any).id || stored!._id) };
  if (!['admin','school_admin','supervisor','teacher'].includes(actor.role)) fail(403, 'School assessment staff required');
  const quiz = await QuizModel.findOne({$or:[{id:quizId},{_id:quizId}]}).lean();
  if (!quiz) fail(404, 'Assessment not found');
  const groupTargets = ids(quiz!.targetGroupIds);
  const userTargets = ids(quiz!.targetUserIds);
  if (!groupTargets.length && !userTargets.length) fail(404, 'Directed assessment required');
  const assignments = actor.role === 'teacher'
    ? await TeachingAssignmentModel.find({teacherId:actor.id,status:'active'}).select('classId subjectId').lean() : [];
  const directory = await resolveSchoolDirectoryScope(actor);
  const subjects = ids((quiz!.mockExam?.enabled && quiz!.mockExam.sections?.length
    ? quiz!.mockExam.sections.map(s=>s.subjectId) : [quiz!.subjectId]).filter(Boolean));
  // Bind each subject to the same class; assignments in a different class are
  // not a subject grant. Canonical inactive memberships override old fields.
  const teacherClassIds = ids(assignments.map(a=>a.classId)).filter(classId=>
    directory.groupIds.includes(classId) && subjects.every(subject=>
      assignments.some(a=>a.classId===classId&&(!a.subjectId||a.subjectId===subject))));
  const scope = actor.role === 'teacher'
    ? { schoolIds: [] as string[], groupIds: teacherClassIds }
    : {schoolIds:directory.schoolIds,groupIds:directory.groupIds};
  let directorCanManage=false;
  if (actor.role === 'school_admin') {
    if(!actor.schoolId)fail(403,'Active school context required');
    const [manage,report]=await Promise.all([
      requireSchoolDirectorCapability(actor.id,actor.schoolId!,'SCHOOL_ASSESSMENTS_MANAGE','SCHOOL_ASSESSMENTS'),
      requireSchoolDirectorCapability(actor.id,actor.schoolId!,'SCHOOL_REPORTS_AGGREGATE_VIEW','SCHOOL_ASSESSMENTS'),
    ]);
    if(!manage&&!report)fail(403,'School assessment permission and module required');
    directorCanManage=Boolean(manage);
    scope.schoolIds = [actor.schoolId!];
    const children = await GroupModel.find({parentId:{$in:scope.schoolIds},type:{$in:['CLASS','PRIVATE_GROUP']}}).select('id _id').lean();
    scope.groupIds = ids([...scope.schoolIds,...children.map((g:any)=>g.id||g._id)]);
  }
  const audiencePredicate = async (groupIds: string[], studentIds: string[]) => {
    const groups = groupIds.length ? await GroupModel.find(buildDocumentsByIdsQuery(groupIds)).setOptions({strictQuery:false}).select('id _id type studentIds').lean() : [];
    const schools = groups.filter(g=>g.type==='SCHOOL').map((g:any)=>String(g.id||g._id));
    const roster = ids(groups.flatMap(g=>g.studentIds||[]));
    return { role:'student', $or:[
      {groupIds:{$in:groupIds}}, {schoolId:{$in:schools}},
      buildDocumentsByIdsQuery(ids([...studentIds,...roster])),
    ] };
  };
  const target = await audiencePredicate(groupTargets,userTargets);
  const authority = actor.role === 'admin' ? {role:'student'} : await audiencePredicate(ids([...scope.groupIds,...scope.schoolIds]),[]);
  const targetPredicate = {$and:[authority,target]};
  const hasVisibleTarget = await UserModel.exists(targetPredicate).setOptions({strictQuery:false});
  if (!hasVisibleTarget && actor.role !== 'admin') fail(404,'Assessment outside assigned scope');
  const owns = actor.role==='admin' || directorCanManage || (actor.role!=='school_admin' && [quiz!.ownerId,quiz!.createdBy,quiz!.assignedTeacherId].includes(actor.id))
    || (scope.schoolIds.length>0 && [quiz!.ownerId,quiz!.createdBy].some(id=>scope.schoolIds.includes(String(id))));
  const outsideGroups = actor.role!=='admin' && groupTargets.some(id=>![...scope.groupIds,...scope.schoolIds].includes(id));
  const outsideUsers = actor.role!=='admin' && userTargets.length
    ? await UserModel.countDocuments({$and:[{role:'student',...buildDocumentsByIdsQuery(userTargets)},{$nor:[authority]}]}).setOptions({strictQuery:false}) : 0;
  const canManage = Boolean(owns && !outsideGroups && !outsideUsers && (actor.role!=='school_admin'||directorCanManage));
  return { actor, quiz:quiz!, scope, targetPredicate, authorityPredicate:authority, canManage };
}
export type SchoolAssessmentContext = Awaited<ReturnType<typeof resolveSchoolAssessmentContext>>;
export async function assertSchoolAssessmentOperation(context: SchoolAssessmentContext, operation: SchoolAssessmentOperation) {
  if (!context.canManage) fail(403,'Assessment management outside assigned authority');
}
