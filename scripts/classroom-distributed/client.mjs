import assert from 'node:assert/strict';
export const origin='https://almeaacodax.vercel.app';
export function parseFixture(raw,group) {
 assert.ok(raw,'Trial fixture required');let value;
 try {value=JSON.parse(raw);}catch{throw Error('Invalid trial fixture');}
 assert.equal(value.group,group,'Fixture group mismatch');
 assert.ok(Number.isInteger(group)&&group>=0&&group<4,'Invalid group');
 assert.equal(value.students?.length,6,'Six trial students required');
 for(const [offset,s] of value.students.entries()) {
  assert.equal(s.index,group*6+offset,'Fixture index mismatch');
  assert.match(s.userId||'',/^[a-f\d]{24}$/,'Invalid fixture user id');
  assert.ok(s.email&&s.password,'Missing trial credential');
 }
 assert.equal(new Set(value.students.map(s=>s.userId)).size,6,'Trial ids must be distinct');
 assert.equal(new Set(value.students.map(s=>s.email)).size,6,'Trial logins must be distinct');
 return value;
}
export async function loginClient(email,password,role,expectedId) {
 assert.ok(email&&password,'Missing audit credentials');
 const jar=new Map();let csrf='';
 async function request(path,method='GET',body) {
  assert.ok(path.startsWith('/')&&!path.startsWith('//'),'Relative API path required');
  const response=await fetch(origin+'/api'+path,{method,signal:AbortSignal.timeout(45000),headers:{accept:'application/json',cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(csrf?{'x-csrf-token':csrf}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  for(const line of response.headers.getSetCookie()){const part=line.split(';')[0],index=part.indexOf('=');jar.set(part.slice(0,index),part.slice(index+1));}
  const text=await response.text();let data;try{data=JSON.parse(text);}catch{throw Error('Audit API returned non-JSON HTTP '+response.status);}
  return {status:response.status,body:data,decodedBytes:Buffer.byteLength(text)};
 }
 const token=await request('/auth/csrf-token');assert.equal(token.status,200,'Audit CSRF unavailable');csrf=token.body.csrfToken;
 const auth=await request('/auth/login','POST',{email,password});assert.equal(auth.status,200,'Audit login rejected');assert.equal(auth.body.user?.role,role,'Audit role mismatch');
 const id=String(auth.body.user.id||auth.body.user._id);if(expectedId)assert.equal(id,expectedId,'Audit user mismatch');
 return {request,id,cookies:()=>[...jar].map(([name,value])=>({name,value,url:origin,secure:true,sameSite:'Lax'}))};
}
