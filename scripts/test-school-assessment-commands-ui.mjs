import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';
import{useSchoolAssessmentCommands}from'./dashboards/admin/supervisorTests/useSchoolAssessmentCommands';
import{QuizAssignWidget}from'./dashboards/admin/QuizAssignWidget';
import{QuizRetakeDialog}from'./dashboards/admin/QuizRetakeDialog';
import{SchoolAssessmentReopenDialog}from'./dashboards/admin/supervisorTests/SchoolAssessmentReopenDialog';
import{AssignedTestDetailPanel}from'./dashboards/admin/AssignedTestDetailPanel';
window.calls=[];window.fail=true;window.actor='staff';window.view='audience';
const gateway=async(id,command)=>{window.calls.push({id,...command});if(window.fail)throw Error('استجابة مفقودة');return{commandId:command.commandId,operation:command.operation,notifiedCount:1};};
function App(){const run=useSchoolAssessmentCommands(window.actor,gateway);window.run=run;
return <>{window.view==='audience'&&<QuizAssignWidget audienceOnly quizId="test" quizTitle="اختبار" scopedGroups={[{id:'class',name:'الفصل'}]} existingConfig={{targetGroupIds:['class']}} onAssign={config=>run('test',{operation:'retarget',payload:{targetGroupIds:config.targetGroupIds,targetUserIds:config.targetUserIds}})}/>}
{window.view==='retake'&&<QuizRetakeDialog quizId="test" title="اختبار" students={[{id:'a',name:'طالب أ'}]} onClose={()=>{}} onGrant={payload=>run('test',{operation:'retake',payload})}/>}
{window.view==='reopen'&&<SchoolAssessmentReopenDialog title="اختبار" onClose={()=>{}} onSave={payload=>run('test',{operation:'reopen',payload})}/>}
{window.view==='detail'&&<AssignedTestDetailPanel quizId="test" quizTitle="اختبار" totalQuestions={1} passingScore={60} targetStudents={[{id:'a',name:'طالب أ'}]} results={[]} onClose={()=>{}} onRemindAbsent={()=>run('test',{operation:'remind',payload:{}})}/>}</>;}
const root=createRoot(document.getElementById('root'));window.show=()=>root.render(<App/>);window.show();
`},bundle:true,format:'iife',platform:'browser',write:false});
const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<main dir="rtl" id="root"></main><script>'+bundle.outputFiles[0].text+'</script>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.argv.includes('--chrome')?{channel:'chrome'}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto('http://127.0.0.1:'+server.address().port);
 await page.waitForFunction(()=>typeof window.run==='function');
 const evidence=await page.evaluate(async()=>{
  const a={operation:'retarget',payload:{targetGroupIds:['b','a','a'],targetUserIds:[]}};
  const retry={operation:'retarget',payload:{targetUserIds:[],targetGroupIds:['a','b']}};
  await window.run('test',a).catch(()=>{});await window.run('test',retry).catch(()=>{});
  await window.run('test',{operation:'retarget',payload:{targetGroupIds:['c'],targetUserIds:[]}}).catch(()=>{});
  window.fail=false;await window.run('test',retry);await window.run('test',retry);
  return window.calls;
 });
 assert.equal(evidence[0].commandId,evidence[1].commandId,'Lost response retry reuses the command identity');
 assert.equal(evidence[0].commandId,evidence[3].commandId);
 assert.notEqual(evidence[0].commandId,evidence[2].commandId,'Changed audience is a new command');
 assert.notEqual(evidence[0].commandId,evidence[4].commandId,'An explicitly repeated successful action is new');
 await page.evaluate(()=>{window.actor='other';window.fail=true;window.show();});
 await page.evaluate(async()=>{await window.run('test',{operation:'retarget',payload:{targetGroupIds:['c'],targetUserIds:[]}}).catch(()=>{});});
 assert.notEqual((await page.evaluate(()=>window.calls.at(-1))).commandId,evidence[2].commandId,'Unresolved identity belongs to its original actor');
 assert.equal(await page.getByText('عدد المحاولات',{exact:true}).count(),0,'Audience dialog must not change attempt settings');
 assert.equal(await page.getByLabel('نهاية الإتاحة',{exact:true}).count(),0,'Audience dialog must not change the window');
 await page.evaluate(()=>{window.view='retake';window.show();});
 const retake=page.getByRole('dialog',{name:'إعادة إتاحة الاختبار',exact:true});
 await retake.getByLabel('نهاية الإعادة').fill('2030-01-02T12:00');
 await retake.getByLabel('بداية الإعادة').fill('2030-01-01T12:00');
 await retake.getByRole('checkbox').check();
 await retake.getByRole('button',{name:'حفظ إتاحة المختارين'}).click();await retake.getByRole('alert').waitFor();
 const firstRetake=await page.evaluate(()=>window.calls.at(-1));
 await page.evaluate(()=>{window.fail=false;});
 await retake.getByRole('button',{name:'حفظ إتاحة المختارين'}).click();await retake.getByRole('status').waitFor();
 assert.equal((await page.evaluate(()=>window.calls.at(-1))).commandId,firstRetake.commandId);
 await page.evaluate(()=>{window.view='reopen';window.show();});
 const reopen=page.getByRole('dialog',{name:'إعادة فتح الموعد',exact:true});
 await reopen.getByLabel('بداية الموعد').fill('2030-01-01T12:00');await reopen.getByLabel('نهاية الموعد').fill('2030-01-02T12:00');
 await reopen.getByRole('button',{name:'حفظ الموعد'}).click();await reopen.getByRole('status').waitFor();
 const last=await page.evaluate(()=>window.calls.at(-1));assert.equal(last.operation,'reopen');assert.deepEqual(Object.keys(last.payload).sort(),['closesAt','opensAt']);
 await page.evaluate(()=>{window.view='detail';window.fail=true;window.show();});
 await page.getByRole('button',{name:/تذكير 1 طالب/}).click();await page.getByRole('alert').waitFor();
 const firstReminder=await page.evaluate(()=>window.calls.at(-1));
 await page.evaluate(()=>{window.fail=false;});await page.getByRole('button',{name:/تذكير 1 طالب/}).click();await page.getByRole('status').waitFor();
 assert.equal((await page.evaluate(()=>window.calls.at(-1))).commandId,firstReminder.commandId);
 console.log('PASS command mobile UI: lost-response identity,changed payload,actor scope,separate audience/window/retake and preserved retry form');
}finally{await browser.close();await new Promise(r=>server.close(r));}
