import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';
import{SchoolAssessmentReportView}from'./dashboards/admin/supervisorTests/SchoolAssessmentReportView';
import{QuizSubjectResults}from'./components/quiz/QuizSubjectResults';
const math={id:'math',label:'الرياضيات',learners:1,questions:3,correct:1,wrong:1,unanswered:1,average:33.33};
const science={id:'science',label:'العلوم',learners:1,questions:2,correct:1,wrong:1,unanswered:0,average:50};
const mSection={id:'math|same',subjectId:'math',label:'القسم الأول',learners:1,questions:3,correct:1,average:33.33};
const sSection={id:'science|same',subjectId:'science',label:'القسم الأول',learners:1,questions:2,correct:1,average:50};
const mSkill={...mSection,id:'math|main|skill',label:'الحساب'};const sSkill={...sSection,id:'science|main|skill',label:'الذرات'};
const report={coverage:{complete:false,missingEvidence:['started_attempts','mock_subject_totals'],subjects:{completed:2,withEvidence:1,complete:false}},audience:{targeted:3},participation:{completed:2,notCompleted:1,started:null},scores:{average:40,passRate:0,highest:40,lowest:40},subjects:[math,science],sections:[mSection,sSection],skills:[mSkill,sSkill],subjectBreakdowns:[{...math,sections:[mSection],skills:[mSkill]},{...science,sections:[sSection],skills:[sSkill]}]};
const subjectResults=[{subjectId:'math',subjectName:'الرياضيات',total:3,correct:1,wrong:1,unanswered:1,score:33},{subjectId:'science',subjectName:'العلوم',total:2,correct:1,wrong:1,unanswered:0,score:50}];
window.show=mode=>createRoot(document.getElementById('root')).render(mode==='staff'?<SchoolAssessmentReportView report={report}/>:<QuizSubjectResults result={{totalQuestions:6,subjectResults,sectionResults:[{sectionId:'unknown',sectionName:'قسم غير مصنف',total:1,correct:0,score:0},{sectionId:'a',sectionName:'القسم الأول',subjectId:'math',total:3,correct:1,score:33},{sectionId:'a',sectionName:'القسم الأول',subjectId:'science',total:2,correct:1,score:50}],skillsAnalysis:[{subjectId:'math',skill:'الحساب',mastery:33},{subjectId:'science',skill:'الذرات',mastery:50}]}}/>);window.show(location.search==='?student'?'student':'staff');
`},bundle:true,format:'iife',platform:'browser',write:false});
const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<html dir="rtl"><meta charset="utf-8"><main id="root"></main><script>'+bundle.outputFiles[0].text+'</script></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.argv.includes('--chrome')?{channel:'chrome'}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const url='http://127.0.0.1:'+server.address().port;
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});await page.goto(url);
  const math=page.getByRole('region',{name:'تحليل مادة الرياضيات',exact:true}),science=page.getByRole('region',{name:'تحليل مادة العلوم',exact:true});
  await math.waitFor();await science.waitFor();assert.ok((await math.innerText()).includes('الحساب'));assert.ok(!(await math.innerText()).includes('الذرات'));
  assert.ok((await science.innerText()).includes('الذرات'));assert.ok(!(await science.innerText()).includes('الحساب'));
  assert.equal(await math.getByText('القسم الأول',{exact:true}).count(),1);assert.equal(await science.getByText('القسم الأول',{exact:true}).count(),1);
  await page.getByText(/تحليل المواد متاح لـ 1 من 2/).waitFor();
  await page.goto(url+'/?student');const learnerMath=page.getByRole('region',{name:'أداؤك في مادة الرياضيات',exact:true}),learnerScience=page.getByRole('region',{name:'أداؤك في مادة العلوم',exact:true});
  await learnerMath.waitFor();assert.ok((await learnerMath.innerText()).includes('33'));assert.ok(!(await learnerMath.innerText()).includes('الذرات'));
  await page.getByRole('region',{name:'أقسام غير مصنفة',exact:true}).getByText('قسم غير مصنف',{exact:true}).waitFor(); await page.getByText(/الأسئلة المصنفة 5 من 6/).waitFor();
  assert.ok((await learnerScience.innerText()).includes('50'));assert.ok(!(await learnerScience.innerText()).includes('الحساب'));
 }
 console.log('PASS multi-material staff/student390+1280: independent weighted totals,scoped sections/skills,repeated section labels and honest partial evidence');
}finally{await browser.close();await new Promise(r=>server.close(r));}
