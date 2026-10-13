import assert from 'node:assert/strict';
import {browserFixture,storeMock,storeSetup} from './course-repair-browser-fixture.mjs';
const fixture=await browserFixture(`import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {BookSession} from './pages/BookSession';
${storeSetup}
window.saved=[];window.fixture={user:{id:'A',role:'student',pathStageSelections:[]},paths:[{id:'path',name:'قدرات'}],subjects:[{id:'subject',pathId:'path',name:'رياضيات'}],sections:[{id:'section',subjectId:'subject',name:'مهارة'}],skills:[{id:'skill',subjectId:'subject',sectionId:'section',name:'اختبار'}],addActivity:activity=>window.saved.push(activity)};
createRoot(document.getElementById('root')).render(<MemoryRouter><BookSession/></MemoryRouter>);`,{
 '/store/useStore':storeMock,
 '/contexts/StudentExperienceContext':`export const useStudentExperience=()=>({scope:{restricted:false,activePathId:'',stageByPath:new Map()}});`,
 '/services/api':`export const api={createMyActivity:payload=>new Promise(resolve=>{window.submitted=payload;window.confirmRequest=()=>resolve({activity:{...payload,id:'server-request-id',date:'2026-10-13T12:00:00Z',bookingStatus:'pending'}});})};`,
});
try {
 const page=await fixture.page(390);
 await page.getByLabel('المادة أو المهارة').selectOption('skill:skill');
 await page.locator('input[type=date]').fill('2060-10-20');await page.getByLabel('الوقت المفضل').selectOption('16:00');
 await page.locator('button[type=submit]').click();await page.waitForFunction(()=>Boolean(window.submitted));
 const payload=await page.evaluate(()=>window.submitted);assert.equal(payload.subjectId,'subject');assert.equal(payload.pathId,'path');assert.deepEqual(payload.skillIds,['skill']);assert.equal(payload.stageId,undefined);
 await page.evaluate(()=>window.confirmRequest());await page.getByText('تم إرسال طلبك، بانتظار التأكيد').waitFor();
 assert.equal(await page.evaluate(()=>window.saved[0].id),'server-request-id');assert.equal(await page.evaluate(()=>window.saved.length),1);
 console.log('PASS browser request waits for server, preserves ID, structured target and stage-free path, and displays pending truth');
 const other=await fixture.page(390);await other.getByLabel('المادة أو المهارة').selectOption('skill:skill');await other.locator('input[type=date]').fill('2060-10-20');await other.getByLabel('الوقت المفضل').selectOption('16:00');await other.locator('button[type=submit]').click();await other.waitForFunction(()=>Boolean(window.submitted));
 await other.evaluate(()=>{window.patch({user:{id:'B',role:'student'}});window.confirmRequest();});
 await other.waitForTimeout(100);
 assert.equal(await other.evaluate(()=>window.saved.length),0);assert.equal(await other.getByText('تم إرسال طلبك، بانتظار التأكيد').count(),0);
 assert.equal(await other.locator('button[type=submit]').isDisabled(),false);
 console.log('PASS actor switch rejects stale success and unlocks the new student form');
}finally{await fixture.close();}
