import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({entryPoints:['server/src/modules/schools/application/classroomStudentSkillEvidence.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const { classroomStudentSkillEvidence } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const contexts = new Map([['lesson-a',{schoolId:'school',classId:'a'}],['lesson-b',{schoolId:'school',classId:'b'}]]);
const skills = new Map([['lesson-a:q1',['math','math']],['lesson-a:q2',['verbal']],['lesson-b:q1',['math']]]);
const rows = classroomStudentSkillEvidence([
  {sessionId:'lesson-a',questionId:'q1',studentId:'one',isCorrect:false},
  {sessionId:'lesson-a',questionId:'q2',studentId:'one',isCorrect:true},
  {sessionId:'lesson-a',questionId:'q1',studentId:'two',isCorrect:true},
  {sessionId:'lesson-b',questionId:'q1',studentId:'one',isCorrect:true},
  {sessionId:'outside',questionId:'q1',studentId:'one',isCorrect:false},
],contexts,skills,new Map([['one','طالب أول'],['two','طالب ثان']]));
assert.equal(rows.length,3,'one student in two classes retains separate evidence');
const first=rows.find(row=>row.studentId==='one'&&row.classId==='a');
assert.equal(first.accuracy,50);
assert.deepEqual(first.skills.map(s=>[s.skillId,s.evidenceCount,s.accuracy]),[['math',1,0],['verbal',1,100]],'skill evidence belongs to this learner; repeated tags do not inflate counts');
assert.equal(rows.find(row=>row.studentId==='two').skills[0].accuracy,100,'another learner cannot supply their weakness');
assert.equal(rows.find(row=>row.classId==='b').evidenceCount,1,'another class cannot alter the baseline context');
assert.deepEqual(classroomStudentSkillEvidence([],contexts,skills,new Map()),[]);
assert.equal(classroomStudentSkillEvidence(Array.from({length:21},(_,i)=>({sessionId:'lesson-a',questionId:i===20?'q2':'q1',studentId:`student-${i}`,isCorrect:i===20})),contexts,skills,new Map()).length,21,'a global top-20 ranking must not erase candidates before material selection');
assert.deepEqual(classroomStudentSkillEvidence([{sessionId:'lesson-a',questionId:'unknown',studentId:'one',isCorrect:false}],contexts,skills,new Map())[0].skills,[],'unclassified answers cannot invent a skill');
console.log('PASS student-specific classroom evidence: student/class fences, unknown session exclusion, deduplicated skill tags, zero evidence and unclassified questions.');
