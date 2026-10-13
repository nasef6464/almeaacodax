import assert from 'node:assert/strict';
import {browserFixture,storeMock,storeSetup} from './course-repair-browser-fixture.mjs';
const fixture=await browserFixture(`import React from 'react';import {createRoot} from 'react-dom/client';import {MyRequests} from './pages/MyRequests';${storeSetup}
window.fixture={user:{id:'A',role:'student',email:'a@isolated.test',subscription:{plan:'free',purchasedCourses:[],purchasedPackages:[]}},courses:[],enrolledCourses:[],b2bPackages:[],recentActivity:[],hasScopedPackageAccess:()=>false};createRoot(document.getElementById('root')).render(<MyRequests/>);`,{
'/store/useStore':storeMock,'/contexts/AuthContext':`export const useAuth=()=>({refreshProfile:async()=>null});`,
'/services/api':`export const api={getPaymentRequests:async()=>({requests:[]}),getMyActivities:async()=>({activities:['confirmed','rejected','cancelled'].map((bookingStatus,i)=>({id:'request-'+i,type:'session_booked',title:'طلب حصة خاصة: '+bookingStatus,date:'2026-10-13T12:00:00Z',bookingStatus}))})};`,
});
try{const page=await fixture.page(390);await page.getByText('confirmed',{exact:true}).waitFor();assert.equal(await page.getByText('مؤكد',{exact:true}).count(),1);assert.equal(await page.getByText('مرفوض',{exact:true}).count(),1);assert.equal(await page.getByText('ملغي',{exact:true}).count(),1);console.log('PASS real MyRequests badges reflect server confirmed/rejected/cancelled states');}finally{await fixture.close();}
