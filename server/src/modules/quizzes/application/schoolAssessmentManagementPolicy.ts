import { UserModel } from '../../../models/User.js';
import { GroupModel } from '../../../models/Group.js';
import { QuizModel } from '../../../models/Quiz.js';
import { resolveTeacherAssessmentClassIds } from './teacherAssessmentClassScope.js';
import { buildDocumentQuery, buildDocumentsByIdsQuery } from '../infrastructure/quizDocumentQuery.js';
import { resolveSchoolDirectoryScope } from '../../schools/application/schoolDirectoryScope.js';
import { requireSchoolDirectorCapability } from '../../schools/application/schoolDirectorAccess.js';

const fail = (statusCode: number, message: string): never => { throw Object.assign(new Error(message), { statusCode }); };
const ids = (values: unknown[] = []) => [...new Set(values.map(String).filter(Boolean))];
export type SchoolAssessmentOperation = 'edit' | 'clone' | 'retarget' | 'reopen' | 'remind' | 'retake';

// Accept only a principal identity. Scope is reloaded; caller-supplied school or role
// fields never widen it. This context is server-only and contains no serialized roster.
export async function resolveSchoolAssessmentContext(principal: { id?: unknown; _id?: unknown }, quizId: string, options:{schoolId?:string}={}) {
  const actorId = String(principal.id || principal._id || '');
  const stored = await UserModel.findOne(buildDocumentQuery(actorId)).setOptions({strictQuery:false}).lean();
  if (!stored || stored.isActive === false) fail(403, 'Active staff required');
  const actor = { ...stored!, id: String((stored as any).id || stored!._id) };
  if (!['admin','school_admin','supervisor','teacher'].includes(actor.role)) fail(403, 'School assessment staff required');
  const quiz = await QuizModel.findOne({$or:[{id:quizId},{_id:quizId}]}).lean();
  if (!quiz) fail(404, 'Assessment not found');
  const groupTargets = ids(quiz!.targetGroupIds);
  const userTargets = ids(quiz!.targetUserIds);
  const hasTargets=Boolean(groupTargets.length||userTargets.length);
  if(!hasTargets&&(quiz!.mode!=='central'||quiz!.isPublished))fail(404,'Directed assessment or private school draft required');
  const directory = await resolveSchoolDirectoryScope(actor);
  // Bind each subject to the same class; assignments in a different class are
  // not a subject grant. Canonical inactive memberships override old fields.
  const teacherClassIds = actor.role==='teacher'?await resolveTeacherAssessmentClassIds(actor,quiz!,directory):[];
  const scope = actor.role === 'teacher'
    ? { schoolIds: [] as string[], groupIds: teacherClassIds }
    : {schoolIds:directory.schoolIds,groupIds:directory.groupIds};
  let directorCanManage=false;
  if(options.schoolId&&actor.role!=='school_admin')fail(403,'Explicit school context requires a school director');
  const schoolId=actor.role==='school_admin'?(options.schoolId||actor.schoolId):undefined;
  if (actor.role === 'school_admin') {
    if(!schoolId)fail(403,'Active school context required');
    const [manage,report]=await Promise.all([
      requireSchoolDirectorCapability(actor.id,schoolId!,'SCHOOL_ASSESSMENTS_MANAGE','SCHOOL_ASSESSMENTS'),
      requireSchoolDirectorCapability(actor.id,schoolId!,'SCHOOL_REPORTS_AGGREGATE_VIEW','SCHOOL_ASSESSMENTS'),
    ]);
    if(!manage&&!report)fail(403,'School assessment permission and module required');
    // Untargeted school drafts belong to one school, even when their author
    // manages several schools. Legacy author-owned drafts retain primary scope.
    if(!hasTargets&&quiz!.ownerType==='school'){
      const ownerSchool=await GroupModel.findOne({type:'SCHOOL',...buildDocumentQuery(String(quiz!.ownerId||''))})
        .setOptions({strictQuery:false}).select('id _id').lean();
      const draftSchoolId=ownerSchool?String((ownerSchool as any).id||ownerSchool._id):actor.schoolId;
      if(!draftSchoolId||String(draftSchoolId)!==String(schoolId))fail(404,'Assessment outside assigned scope');
    }
    directorCanManage=Boolean(manage);
    scope.schoolIds = [schoolId!];
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
  const ownsDefinition = actor.role==='admin' || [quiz!.ownerId,quiz!.createdBy,quiz!.assignedTeacherId].includes(actor.id)
    || (scope.schoolIds.length>0 && [quiz!.ownerId,quiz!.createdBy].some(id=>scope.schoolIds.includes(String(id))));
  const owns=ownsDefinition||(hasTargets&&directorCanManage);
  const outsideGroups = actor.role!=='admin' && groupTargets.some(id=>![...scope.groupIds,...scope.schoolIds].includes(id));
  const outsideUsers = actor.role!=='admin' && userTargets.length
    ? await UserModel.countDocuments({$and:[{role:'student',...buildDocumentsByIdsQuery(userTargets)},{$nor:[authority]}]}).setOptions({strictQuery:false}) : 0;
  const hasScope=actor.role==='admin'||scope.groupIds.length>0||scope.schoolIds.length>0;
  const canManage = Boolean(owns && hasScope && !outsideGroups && !outsideUsers && (actor.role!=='school_admin'||directorCanManage));
  // Private copies and classes without enrolled learners must still be manageable
  // by their authorized author; this never turns an empty audience into everyone.
  if(!hasVisibleTarget&&!canManage)fail(404,'Assessment outside assigned scope');
  return { actor, schoolId, quiz:quiz!, scope, targetPredicate, authorityPredicate:authority, canManage };
}
export type SchoolAssessmentContext = Awaited<ReturnType<typeof resolveSchoolAssessmentContext>>;
export async function assertSchoolAssessmentOperation(context: SchoolAssessmentContext, operation: SchoolAssessmentOperation) {
  if (!context.canManage) fail(403,'Assessment management outside assigned authority');
}

export async function assertSchoolAssessmentAudience(context:SchoolAssessmentContext,definition:any){
  await assertSchoolAssessmentOperation(context,'edit');
  const groupIds=ids(definition.targetGroupIds),studentIds=ids(definition.targetUserIds);
  if(context.actor.role==='admin')return;
  const allowed=new Set([...context.scope.schoolIds,...context.scope.groupIds]);
  if(groupIds.some(id=>!allowed.has(id)))fail(403,'Audience outside school assessment authority');
  if(studentIds.length){
    const students=await UserModel.find({$and:[context.authorityPredicate,buildDocumentsByIdsQuery(studentIds)]})
      .setOptions({strictQuery:false}).select('id _id').lean();
    const found=new Set(students.flatMap((student:any)=>[student.id,String(student._id)].filter(Boolean)));
    if(studentIds.some(id=>!found.has(id)))fail(403,'Student outside school assessment authority');
  }
}
