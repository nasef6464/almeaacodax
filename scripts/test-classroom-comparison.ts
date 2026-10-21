import assert from 'node:assert/strict';
const {buildClassroomComparison,classroomComparisonCsv}=await import('../components/classroom/classroomComparison.js');
const student=(id:string,correct:number,answered:number)=>({studentId:id,name:id,joined:answered>0,publishedQuestions:10,answered,correct,wrong:answered-correct,unanswered:10-answered,accuracy:answered?correct/answered*100:null,skills:[]});
const report=(id:string,date:string,students:any[],subject='math')=>({sessionId:id,endedAt:date,subjectName:subject,studentEvidenceComplete:true,students,questions:[{questionId:id,skillIds:['s'],subjectId:subject,pathId:'p',answered:10,correct:id==='old'?4:8}],totals:{responses:10,correct:id==='old'?4:8}} as any);
const old=report('old','2026-10-01',[student('a',4,10),student('b',0,0)]),latest=report('new','2026-10-20',[student('a',8,10),student('b',0,0)]);
const result=buildClassroomComparison([latest,old,old]);
assert.equal(result.sessions,2,'Duplicate selections must not double evidence');
assert.equal(result.students.find((s:any)=>s.studentId==='a')?.delta,40);
assert.equal(result.students.find((s:any)=>s.studentId==='a')?.state,'improved');
assert.equal(result.students.find((s:any)=>s.studentId==='b')?.state,'no_participation');
assert.equal(result.skills[0].delta,40);
assert.equal(buildClassroomComparison([old]).students.find((s:any)=>s.studentId==='a')?.delta,null);
const mixed=buildClassroomComparison([old,report('bio','2026-10-20',[student('a',9,10)],'bio')]);
assert.equal(mixed.students.filter((s:any)=>s.studentId==='a').length,2,'Do not compare scores across different materials');
assert.ok(mixed.students.every((s:any)=>s.delta===null));
assert.equal(buildClassroomComparison([{...old,students:undefined,studentEvidenceComplete:false}]).incompleteSessions,1);
assert.equal(buildClassroomComparison([{...old,endedAt:null,startedAt:undefined}]).students.find((s:any)=>s.studentId==='a')?.state,'insufficient_evidence','Missing dates are not proof of nonparticipation');
const csv=classroomComparisonCsv({...result,students:[{...result.students[0],name:'=HYPERLINK("bad")'}]});
assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'=HYPERLINK"),'Spreadsheet formula injection must be escaped');


const multi={...old,sessionId:'multi',questions:[...old.questions,{...old.questions[0],subjectId:'bio'}]};
const multiResult=buildClassroomComparison([multi,{...multi,sessionId:'multi2',endedAt:'2026-10-20'}]);
assert.equal(multiResult.students[0].delta,null);
assert.equal(multiResult.students[0].state,'mixed_materials');
assert.equal(multiResult.students[0].needsSupport,false);
const catalog=[{id:'math',name:'الرياضيات',pathId:'p'}];
const legacy={...old,questions:[{...old.questions[0],subjectId:undefined,subject:'الرياضيات'}]};
assert.equal(buildClassroomComparison([legacy,latest],catalog).students.find(s=>s.studentId==='a')?.delta,40);
const ambiguous=[...catalog,{id:'math2',name:'الرياضيات',pathId:'p'}];
assert.equal(buildClassroomComparison([legacy,latest],ambiguous).students.filter(s=>s.studentId==='a').length,2);
assert.ok(classroomComparisonCsv({...result,students:[{...result.students[0],name:' \n=HYPERLINK("bad")'}]}).includes("' \n=HYPERLINK"));

console.log('PASS selected classroom comparison: dedup, temporal order, material isolation, no-participation, missing evidence and safe CSV');
