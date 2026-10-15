import { Router } from 'express';
import { requireAuth, requireRole } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { resolveSchoolAssessmentContext } from '../application/schoolAssessmentManagementPolicy.js';
import { buildSchoolAssessmentReport } from '../application/schoolAssessmentReport.js';
import { cloneSchoolAssessment,schoolAssessmentContentLocked } from '../application/schoolAssessmentEditing.js';

import {schoolCompositionSchema,composeSchoolAssessment,type SchoolSpecInterpreter} from '../application/schoolAssessmentComposition.js';
import {resolveSchoolCompositionContext} from '../application/schoolAssessmentCompositionScope.js';
import {executeSchoolAssessmentCommand} from '../application/schoolAssessmentCommands.js';
import {schoolAssessmentLearnersQuery,readSchoolAssessmentLearners,readSchoolAssessmentLearnerResult} from '../application/schoolAssessmentLearners.js';

export function createSchoolAssessmentsRouter(interpret?:(req:any,input:Parameters<SchoolSpecInterpreter>[0])=>Promise<unknown>){
const schoolAssessmentsRouter = Router();
schoolAssessmentsRouter.use(requireAuth,requireRole(['admin','school_admin','supervisor','teacher']));
schoolAssessmentsRouter.post('/compose',asyncHandler(async(req,res)=>{
  const spec=schoolCompositionSchema.parse(req.body);
  const context=await resolveSchoolCompositionContext(req.authUser!,spec);
  const preview=await composeSchoolAssessment(context,spec,interpret?input=>interpret(req,input):undefined);
  res.set('Cache-Control','private, no-store').json(preview);
}));
schoolAssessmentsRouter.get('/:id/report',asyncHandler(async(req,res)=>{
  const context=await resolveSchoolAssessmentContext(req.authUser!,String(req.params.id));
  res.set('Cache-Control','private, no-store').json(await buildSchoolAssessmentReport(context));
}));
schoolAssessmentsRouter.get('/:id/learners',asyncHandler(async(req,res)=>{
  const query=schoolAssessmentLearnersQuery.parse(req.query);
  const context=await resolveSchoolAssessmentContext(req.authUser!,String(req.params.id));
  res.set('Cache-Control','private, no-store').json(await readSchoolAssessmentLearners(context,query));
}));
schoolAssessmentsRouter.get('/:id/results/:resultId',asyncHandler(async(req,res)=>{
  const context=await resolveSchoolAssessmentContext(req.authUser!,String(req.params.id));
  res.set('Cache-Control','private, no-store').json(await readSchoolAssessmentLearnerResult(context,String(req.params.resultId)));
}));
schoolAssessmentsRouter.get('/:id/context',asyncHandler(async(req,res)=>{
  const context = await resolveSchoolAssessmentContext(req.authUser!,String(req.params.id));
  const canEditContent=context.canManage&&!(await schoolAssessmentContentLocked(context.quiz));
  res.set('Cache-Control','private, no-store').json({id:String(context.quiz.id||context.quiz._id),canManage:context.canManage,canClone:context.canManage,canEditContent,isPublished:context.quiz.isPublished===true});
}));
schoolAssessmentsRouter.post('/:id/clone',asyncHandler(async(req,res)=>{
  const context=await resolveSchoolAssessmentContext(req.authUser!,String(req.params.id));
  res.status(201).json(await cloneSchoolAssessment(context));
}));
schoolAssessmentsRouter.post('/:id/commands',asyncHandler(async(req,res)=>{
  const result=await executeSchoolAssessmentCommand(req.authUser!,String(req.params.id),req.body);
  res.set('Cache-Control','private, no-store').json(result);
}));

return schoolAssessmentsRouter;
}
