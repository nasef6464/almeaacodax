import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';
import{SchoolAssessmentManagementActions}from'./dashboards/admin/supervisorTests/SchoolAssessmentManagementActions';
const root=createRoot(document.getElementById('root'));window.calls=[];window.fail=false;
window.show=(canEditContent=true,canManage=true)=>root.render(<SchoolAssessmentManagementActions key={String(canEditContent)+String(canManage)} quizId="test" actorId="staff"
loadContext={async()=>{if(window.fail)throw Error('failure');return{id:'test',canManage,canClone:canManage,canEditContent};}}
clone={async()=>{window.calls.push('clone');if(window.cloneFail)throw Error('clone failure');await new Promise(r=>setTimeout(r,80));return{id:'copy'};}}
onEdit={()=>window.calls.push('edit')} onClone={q=>window.calls.push(q.id)}/>);window.show();
`},bundle:true,format:'iife',platform:'browser',write:false});
const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<main dir="rtl" id="root"></main><script>'+bundle.outputFiles[0].text+'</script>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.argv.includes('--chrome')?{channel:'chrome'}:{})});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('button',{name:'تعديل محتوى الاختبار',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>window.calls),['edit']);
  await page.evaluate(()=>window.show(false));
  await page.getByText('محتوى الاختبار محفوظ').waitFor();
  assert.equal(await page.getByRole('button',{name:'تعديل محتوى الاختبار',exact:true}).count(),0);
  await page.getByRole('button',{name:'إنشاء نسخة للتعديل',exact:true}).click();
  await page.getByRole('status').filter({hasText:'تم إنشاء نسخة'}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.calls),['edit','clone','copy']);
  await page.evaluate(()=>{window.cloneFail=true;});
  await page.getByRole('button',{name:'إنشاء نسخة للتعديل',exact:true}).click();
  await page.getByRole('alert').waitFor();
  await page.evaluate(()=>{window.cloneFail=false;});
  await page.getByRole('button',{name:'إنشاء نسخة للتعديل',exact:true}).click();
  await page.getByRole('status').filter({hasText:'تم إنشاء نسخة'}).waitFor();
  assert.equal(await page.getByRole('alert').count(),0,'Successful clone retry clears old error');
  await page.evaluate(()=>window.show(false,false));
  await page.getByText('يمكنك متابعة نتائج طلابك').waitFor();
  assert.equal(await page.getByRole('button',{name:'إنشاء نسخة للتعديل',exact:true}).count(),0);
  await page.evaluate(()=>{window.fail=true;window.show(true);});
  await page.getByRole('alert').waitFor();
  await page.evaluate(()=>{window.fail=false;});
  await page.getByRole('button',{name:'إعادة المحاولة'}).click();
  await page.getByRole('button',{name:'تعديل محتوى الاختبار',exact:true}).waitFor();
  console.log('PASS management UI mobile RTL: edit,locked copy,persist callback,denial,error retry');
}finally{await browser.close();await new Promise(r=>server.close(r));}
