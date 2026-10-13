import assert from 'node:assert/strict';
import { browserFixture, storeMock, storeSetup } from './course-repair-browser-fixture.mjs';
const fixture = await browserFixture(`import React from 'react';import {createRoot} from 'react-dom/client';import {HostingChoice} from './components/liveSessions/HostingChoice';import {LiveSessionCard} from './components/liveSessions/LiveSessionCard';
${storeSetup}
window.fixture={user:{id:'student',role:'student'}};
const policy={providers:['zoom','google_meet','teams','live_youtube'],hostingModes:['teacher_account','platform_account','manual_link'],defaultHostingMode:'teacher_account',earlyJoinMinutes:15,lateJoinMinutes:30};
function App(){const [value,setValue]=React.useState({teacherId:'teacher',provider:'zoom',hostingMode:'teacher_account',hostId:'',meetingUrl:'',meetingDate:'',duration:60});const [privateMode,setPrivate]=React.useState(false);return <main dir="rtl"><button onClick={()=>setPrivate(true)}>private fixture</button><HostingChoice policy={policy} hosts={[{id:'host',label:'حساب المدرس التجريبي',provider:'zoom',ownerType:'teacher',ownerId:'teacher',enabled:true,connected:false}]} value={value} onChange={setValue} isPrivate={privateMode}/><LiveSessionCard session={{id:'saved',title:'جلسة خاصة',source:{bookingId:'request'},audience:{kind:'private'},provider:'zoom',hostingMode:'manual_link',teacherId:'teacher',teacherName:'المدرس',startAt:'2026-10-20T13:00:00Z',endAt:'2026-10-20T14:00:00Z',timeZone:'Asia/Riyadh',state:'confirmed',meetingReadiness:'awaiting_connection',canJoin:false,hostCapacityVerified:false}}/></main>};createRoot(document.getElementById('root')).render(<App/>);`,{'/store/useStore':storeMock,'/services/api':`export const api={};`});
try {
  const page = await fixture.page(390);
  assert.equal(await page.getByLabel('مزود الاجتماع').locator('option').count(),4);
  assert.equal(await page.getByLabel('الاستضافة',{exact:true}).locator('option').count(),3);
  assert.match(await page.getByLabel('حساب الاستضافة').textContent(),/يحتاج ربطًا/);
  assert.equal(await page.getByRole('button',{name:'دخول الحصة'}).isDisabled(),true);
  await page.getByRole('button',{name:'private fixture'}).click();
  assert.equal(await page.getByLabel('مزود الاجتماع').locator('option').count(),3);
  await page.getByLabel('الاستضافة',{exact:true}).selectOption('manual_link');
  assert.equal(await page.getByLabel('حساب الاستضافة').count(),0);
  assert.match(await page.locator('main').textContent(),/الرابط قيد التجهيز/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  console.log('PASS four providers, three host modes, genuine readiness, private YouTube exclusion, guarded join and mobile RTL width');
} finally { await fixture.close(); }
