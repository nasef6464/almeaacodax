import assert from 'node:assert/strict';
import {isolatedMongo} from './school-assessment-test-fixture.js';
const close=await isolatedMongo();
try{
 const {UserModel}=await import('../server/src/models/User.js');
 const {GroupModel}=await import('../server/src/models/Group.js');
 const {TeachingAssignmentModel}=await import('../server/src/models/TeachingAssignment.js');
 const {SchoolMembershipModel}=await import('../server/src/models/SchoolMembership.js');
 const {QuizModel}=await import('../server/src/models/Quiz.js');
 const {buildSchoolTeacherWorkspace}=await import('../server/src/modules/schools/application/schoolTeacherWorkspace.js');
 const {resolveSchoolAssessmentContext}=await import('../server/src/modules/quizzes/application/schoolAssessmentManagementPolicy.js');
 const teacher=await UserModel.create({name:'teacher',role:'teacher',email:'catalog@isolated.test',passwordHash:'fixture',isActive:true});
 const school=await GroupModel.create({name:'school',type:'SCHOOL',ownerId:'admin'});
 const classes=await GroupModel.create(['a','b'].map(name=>({name,type:'CLASS',parentId:String(school._id),ownerId:'admin'})));
 const sid=String(school._id),aid=String(classes[0]._id),bid=String(classes[1]._id),tid=String(teacher._id);
 const students=await UserModel.create(classes.map((c,i)=>({name:'student'+i,role:'student',email:'catalog-student'+i+'@isolated.test',passwordHash:'fixture',schoolId:sid,groupIds:[String(c._id)]})));
 for(let i=0;i<classes.length;i++)await GroupModel.updateOne({_id:classes[i]._id},{$set:{studentIds:[String(students[i]._id)]}});
 const membership=await SchoolMembershipModel.create({userId:tid,schoolId:sid,role:'teacher',status:'active'});
 await TeachingAssignmentModel.create([{schoolId:sid,teacherId:tid,classId:aid,subjectId:'math'},{schoolId:sid,teacherId:tid,classId:bid,subjectId:'chem'}]);
 const mixed={enabled:true,sections:[{subjectId:'math'},{subjectId:'chem'}]};
 await QuizModel.collection.insertMany([
  {_id:'math-a',subjectId:'math',targetGroupIds:[aid]},
  {_id:'chem-a',subjectId:'chem',targetGroupIds:[aid]},
  {_id:'mixed-a',subjectId:'math',mockExam:mixed,targetGroupIds:[aid]},
  {_id:'mixed-b',subjectId:'math',mockExam:mixed,targetGroupIds:[bid]},
  {_id:'named-a',subjectId:'math',targetUserIds:[String(students[0]._id)]},
  {_id:'named-b',subjectId:'math',targetUserIds:[String(students[1]._id)]},
  {_id:'owned-draft',subjectId:'math',targetGroupIds:[aid],ownerId:tid,isPublished:false,approvalStatus:'pending'},
  {_id:'disabled-mock',subjectId:'math',mockExam:{...mixed,enabled:false},targetGroupIds:[aid]},
 ].map(q=>({id:q._id,title:q._id,pathId:'path',isPublished:true,questionIds:[],...q})) as any);
 const actor={id:tid,role:'teacher',schoolId:sid};
 const listed=async()=>{const workspace=await buildSchoolTeacherWorkspace(actor);return workspace.schools.flatMap(s=>s.assessments)};
 let rows=await listed();
 assert.deepEqual(rows.map(q=>q.assessmentId).sort(),['disabled-mock','math-a','named-a','owned-draft'],'Catalog must not offer reports outside the same class×all-subject authority');
 for(const row of rows)await resolveSchoolAssessmentContext(actor,row.assessmentId);
 await assert.rejects(()=>resolveSchoolAssessmentContext(actor,'mixed-a'),{statusCode:404});
 await TeachingAssignmentModel.create({schoolId:sid,teacherId:tid,classId:aid,subjectId:'chem'});
 rows=await listed();
 assert.ok(rows.some(q=>q.assessmentId==='mixed-a'));
 assert.ok(!rows.some(q=>q.assessmentId==='mixed-b'),'A subject in a different class never completes a mock grant');
 for(const row of rows)await resolveSchoolAssessmentContext(actor,row.assessmentId);
 await TeachingAssignmentModel.create({schoolId:sid,teacherId:tid,classId:bid,subjectId:''});
 rows=await listed();assert.ok(rows.some(q=>q.assessmentId==='mixed-b'),'Existing general class assignment covers all subjects');
 await SchoolMembershipModel.updateOne({_id:membership._id},{$set:{status:'inactive'}});
 assert.deepEqual(await listed(),[],'Revoked membership cannot be resurrected through legacy schoolId');
 console.log('PASS actual Mongo teacher catalog/report scope: normal,mixed,named,owned pending,disabled mock,same-class subjects,general assignment,inactive membership');
}finally{await close();}
