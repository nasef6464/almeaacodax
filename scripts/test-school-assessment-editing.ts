import assert from 'node:assert/strict';
import {isolatedMongo} from './school-assessment-test-fixture.js';
const close=await isolatedMongo();
let server:any;
try{
  const {QuizModel}=await import('../server/src/models/Quiz.js');
  const {QuizResultModel}=await import('../server/src/models/QuizResult.js');
  const {LiveExamSessionModel}=await import('../server/src/models/LiveExamSession.js');
  const {AssessmentVersionModel}=await import('../server/src/modules/quizzes/infrastructure/assessmentVersionModel.js');
  const {assertSchoolAssessmentDefinitionEditable,cloneSchoolAssessment}=await import('../server/src/modules/quizzes/application/schoolAssessmentEditing.js');
  const draft=await QuizModel.create({_id:'editable-school-test',id:'editable-school-test',title:'اختبار',pathId:'math',subjectId:'math',mode:'central',questionIds:['q1'],targetUserIds:['learner'],ownerId:'staff',createdBy:'staff'});
  const read=async()=> (await QuizModel.findById(draft._id).lean())!;
  assert.equal(await assertSchoolAssessmentDefinitionEditable(await read(),{questionIds:['q2']}),true);
  await QuizModel.updateOne({_id:draft._id},{$set:{isPublished:true}});
  await assert.rejects(()=>assertSchoolAssessmentDefinitionEditable({...draft.toObject(),isPublished:true},{questionIds:['q2']}),{statusCode:409});
  assert.equal(await assertSchoolAssessmentDefinitionEditable({...draft.toObject(),isPublished:true},{targetUserIds:['other']}),false);
  await QuizModel.updateOne({_id:draft._id},{$set:{isPublished:false}});
  const version=await AssessmentVersionModel.create({assessmentId:draft._id,version:1,definition:{questionIds:['q1']},publishedBy:'staff'});
  await assert.rejects(async()=>assertSchoolAssessmentDefinitionEditable(await read(),{questionIds:['q2']}),{statusCode:409});
  await AssessmentVersionModel.deleteOne({_id:version._id});
  const session=await LiveExamSessionModel.create({studentId:'learner',studentName:'learner',quizId:draft._id,quizTitle:'test'});
  await assert.rejects(async()=>assertSchoolAssessmentDefinitionEditable(await read(),{settings:{passingScore:90}}),{statusCode:409});
  await LiveExamSessionModel.deleteOne({_id:session._id});
  await QuizResultModel.create({userId:'learner',quizId:draft._id,quizTitle:'test',score:40,learningContext:'school_assessment'});
  await assert.rejects(async()=>assertSchoolAssessmentDefinitionEditable(await read(),{questionIds:['q2']}),{statusCode:409});
  const context:any={quiz:await read(),actor:{id:'staff',role:'supervisor'},canManage:true};
  const copy=await cloneSchoolAssessment(context);
  assert.notEqual(copy.id,draft._id);
  assert.equal(copy.isPublished,false);
  assert.equal(copy.showOnPlatform,false);
  assert.equal(copy.approvalStatus,'draft');
  assert.deepEqual(copy.targetUserIds,[]);assert.deepEqual(copy.targetGroupIds,[]);
  assert.deepEqual(copy.questionIds,['q1']);
  assert.equal(await QuizResultModel.countDocuments({quizId:draft._id}),1);
  assert.deepEqual((await read()).questionIds,['q1']);
  await assert.rejects(()=>cloneSchoolAssessment({...context,canManage:false}),{statusCode:403});
  Object.assign(process.env,{AI_PROVIDER:'none',REDIS_URL:'',NOTIFICATION_QUEUE_ENABLED:'false',RATE_LIMIT_REDIS_ENABLED:'false',SENTRY_DSN:''});
  const {UserModel}=await import('../server/src/models/User.js');
  const student=await UserModel.create({name:'learner',role:'student',email:'edit-student@isolated.test',passwordHash:'test',isActive:true});
  const admin=await UserModel.create({name:'admin',role:'admin',email:'edit-admin@isolated.test',passwordHash:'test',isActive:true});
  const {GroupModel}=await import('../server/src/models/Group.js');
  const school=await GroupModel.create({name:'school',type:'SCHOOL',ownerId:String(admin._id)});
  const classroom=await GroupModel.create({name:'class',type:'CLASS',parentId:String(school._id),ownerId:String(admin._id),studentIds:[String(student._id)]});
  const supervisor=await UserModel.create({name:'supervisor',role:'supervisor',email:'edit-supervisor@isolated.test',passwordHash:'test',isActive:true,groupIds:[String(classroom._id)]});
  await UserModel.updateOne({_id:student._id},{$set:{groupIds:[String(classroom._id)],schoolId:String(school._id)}});
  await QuizModel.updateOne({_id:draft._id},{$set:{targetUserIds:[String(student._id)],ownerId:String(supervisor._id),createdBy:String(supervisor._id)}});
  const director=await UserModel.create({name:'director',role:'school_admin',email:'edit-director@isolated.test',passwordHash:'test',isActive:true,schoolId:String(school._id)});
  const {SchoolMembershipModel}=await import('../server/src/models/SchoolMembership.js');
  const {SchoolContractModel}=await import('../server/src/models/SchoolContract.js');
  const directorMembership=await SchoolMembershipModel.create({userId:String(director._id),schoolId:String(school._id),role:'school_admin',permissions:['SCHOOL_ASSESSMENTS_MANAGE','SCHOOL_REPORTS_AGGREGATE_VIEW']});
  await SchoolContractModel.create({schoolId:String(school._id),modules:['SCHOOL_CORE','SCHOOL_ASSESSMENTS']});
  const {createApp}=await import('../server/src/app.js');
  const {signAccessToken}=await import('../server/src/utils/jwt.js');
  server=createApp().listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const csrfResponse=await fetch('http://127.0.0.1:'+server.address().port+'/api/auth/csrf-token');
  assert.equal(csrfResponse.status,200);
  const csrf:any=await csrfResponse.json();
  const cookie=csrfResponse.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  const request=(actor:any,path:string,method='POST',body:any={})=>fetch('http://127.0.0.1:'+server.address().port+'/api'+path,{method,
    headers:{'content-type':'application/json',cookie,'x-csrf-token':csrf.csrfToken,authorization:'Bearer '+signAccessToken({...actor.toObject(),id:String(actor._id)})},...(method==='GET'?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
  assert.equal((await request(student,'/live-exams/start','POST',{quizId:draft._id,quizTitle:'draft',totalQuestions:1})).status,403,'Student cannot start an unpublished definition while it is editable');
  assert.equal((await request(admin,'/quizzes/'+draft._id,'PATCH',{questionIds:['q2']})).status,409);
  assert.equal((await request(admin,'/quizzes/'+draft._id+'/questions','POST',{questions:[{id:'q2'}]})).status,409,'Appending questions must respect frozen school definitions');
  const clonedResponse=await request(supervisor,'/school-assessments/'+draft._id+'/clone');
  assert.equal(clonedResponse.status,201);
  const cloned:any=await clonedResponse.json();
  assert.equal(await QuizModel.countDocuments({_id:cloned.id,isPublished:false}),1);
  const draftContext=await request(supervisor,'/school-assessments/'+cloned.id+'/context','GET');
  assert.equal(draftContext.status,200,'A private copied draft remains editable after leaving its immediate editor');
  assert.equal(((await draftContext.json()) as any).canEditContent,true);
  assert.equal((await request(student,'/school-assessments/'+draft._id+'/clone')).status,403);
  const directorClone=await request(director,'/school-assessments/'+draft._id+'/clone');
  assert.equal(directorClone.status,201);
  const directorDraft:any=await directorClone.json();
  assert.equal((await request(director,'/quizzes/'+directorDraft.id,'PATCH',{title:'نسخة المدير المعدلة'})).status,200,'Director must be able to save the editable copy');
  await SchoolMembershipModel.updateOne({_id:directorMembership._id},{$set:{permissions:['SCHOOL_REPORTS_AGGREGATE_VIEW']}});
  assert.ok([403,404].includes((await request(director,'/quizzes/'+directorDraft.id,'PATCH',{title:'forbidden'})).status),'Revoked manage permission must deny writes without exposing a private draft');
  await SchoolMembershipModel.updateOne({_id:directorMembership._id},{$set:{permissions:['SCHOOL_ASSESSMENTS_MANAGE','SCHOOL_REPORTS_AGGREGATE_VIEW']}});
  const foreignStudent=await UserModel.create({name:'foreign',role:'student',email:'foreign@isolated.test',passwordHash:'test',isActive:true});
  assert.equal((await request(director,'/quizzes/'+directorDraft.id,'PATCH',{targetUserIds:[String(foreignStudent._id)]})).status,403,'Director must not target students outside their school');
  const {QuestionModel}=await import('../server/src/models/Question.js');
  const {PathModel}=await import('../server/src/models/Path.js');
  await PathModel.create({_id:'math',name:'رياضيات',isActive:true});
  await QuestionModel.create(['q1','q2'].map((id,index)=>({id,subject:'math',subjectId:'math',pathId:'math',text:'سؤال '+index,options:['أ','ب'],correctOptionIndex:0,approvalStatus:'approved'})));
  const staleCopy=await cloneSchoolAssessment({...context,actor:{id:String(supervisor._id),role:'supervisor'}});
  const originalUpdate=QuizModel.findOneAndUpdate;
  let intercepted=false;
  (QuizModel as any).findOneAndUpdate=function(query:any,update:any,options:any){
    if(!intercepted&&(update.isPublished===true||update.$set?.isPublished===true)){
      intercepted=true;
      return (async()=>{
        const intervening=await request(supervisor,'/quizzes/'+staleCopy.id,'PATCH',{questionIds:['missing-question']});
        assert.equal(intervening.status,200);
        return originalUpdate.call(QuizModel,query,update,options);
      })();
    }
    return originalUpdate.call(QuizModel,query,update,options);
  };
  try{
    const stalePublish=await request(supervisor,'/quizzes/'+staleCopy.id,'PATCH',{isPublished:true,targetUserIds:[String(student._id)]});
    assert.equal(stalePublish.status,409,'Publication must reject a draft changed after integrity validation');
    assert.equal((await QuizModel.findById(staleCopy.id).lean())!.isPublished,false);
  }finally{(QuizModel as any).findOneAndUpdate=originalUpdate;}
  // Editing a draft concurrently with its first publication must not mutate
  // a published definition after students can discover/start it.
  const [edit,publish]=await Promise.all([
    request(supervisor,'/quizzes/'+cloned.id,'PATCH',{questionIds:['q2']}),
    request(supervisor,'/quizzes/'+cloned.id,'PATCH',{isPublished:true,targetUserIds:[String(student._id)]}),
  ]);
  assert.ok([200,409].includes(edit.status));
  assert.ok([200,409].includes(publish.status),await publish.text());
  if(publish.status===409)assert.equal((await request(supervisor,'/quizzes/'+cloned.id,'PATCH',{isPublished:true,targetUserIds:[String(student._id)]})).status,200);
  const published=await QuizModel.findById(cloned.id).lean();
  assert.equal(published!.isPublished,true);
  assert.equal(published!.approvalStatus,'approved','Publishing an authorized school draft must make its copy discoverable');
  assert.deepEqual(published!.questionIds,edit.status===200?['q2']:['q1']);
  const catalog:any=await (await request(student,'/quizzes?limit=100','GET')).json();
  assert.ok(catalog.quizzes.some((item:any)=>item.id===cloned.id),'Published copy must reach its targeted learner catalog');
  assert.equal((await request(student,'/live-exams/start','POST',{quizId:cloned.id,quizTitle:'published',totalQuestions:1})).status,200);
  assert.equal((await request(admin,'/quizzes/'+cloned.id,'PATCH',{questionIds:published!.questionIds[0]==='q1'?['q2']:['q1']})).status,409);
  assert.deepEqual((await QuizModel.findById(cloned.id).lean())!.questionIds,published!.questionIds);
  assert.equal(await QuizResultModel.countDocuments({quizId:draft._id}),1);
  console.log('PASS school edit safety: draft,publication,active session,saved outcome,independent draft clone and authority');
  console.log('PASS HTTP school editing: unpublished start denied,started definition mutation denied,persisted clone,student clone denied');
  console.log('PASS concurrent draft edit/publication fence,published student start,and unchanged original evidence');
}catch(error){console.error('School editing fixture failed:',error);throw error;}
finally{if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));await close();}
