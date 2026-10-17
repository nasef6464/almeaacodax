import assert from 'node:assert/strict';
import { loadTeachingQuestionImage } from '../server/src/modules/ai/infrastructure/teachingQuestionImage';
const url='https://images.example/questions/v2/test/a.png';
const policy={approvedBaseUrl:'https://images.example',maxBytes:1_572_864,timeoutMs:30};
const identity={url,version:'a'.repeat(64)};
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(20)]);
let calls=0;
const fetcher=async()=>{calls++;return new Response(png,{headers:{'content-type':'image/png'}});};
assert.equal((await loadTeachingQuestionImage(identity,policy,fetcher))?.mimeType,'image/png');
for(const bad of ['http://images.example/questions/a.png','https://evil.example/questions/a.png','https://images.example/other/a.png','https://images.example/questions/%2e%2e/a.png','https://images.example/questions/a.png?token=secret','https://images.example/questions/a/../b.png','https://user@images.example/questions/a.png']){
 const before=calls;assert.equal(await loadTeachingQuestionImage({...identity,url:bad},policy,fetcher),null);assert.equal(calls,before);
}
for(const response of [new Response(png,{status:302,headers:{location:'http://127.0.0.1'}}),new Response('<svg/>',{headers:{'content-type':'image/svg+xml'}}),new Response(png,{headers:{'content-type':'image/jpeg'}}),new Response(png,{headers:{'content-type':'image/png','content-length':'2000000'}})]){
 assert.equal(await loadTeachingQuestionImage(identity,policy,async()=>response),null);
}
for(const length of [policy.maxBytes,policy.maxBytes+1]){
 const bytes=Buffer.alloc(length);png.copy(bytes);
 const result=await loadTeachingQuestionImage(identity,{...policy,timeoutMs:500},async()=>new Response(bytes,{headers:{'content-type':'image/png','content-length':'1'}}));
 assert.equal(Boolean(result),length===policy.maxBytes);
}
let signal:AbortSignal|undefined;
assert.equal(await loadTeachingQuestionImage(identity,policy,async(_,init)=>{signal=init?.signal as AbortSignal;return new Response(new ReadableStream({start(){}}),{headers:{'content-type':'image/png'}});}),null);
assert.equal(signal?.aborted,true);
assert.equal(await loadTeachingQuestionImage(identity,policy,async()=>{throw Error('disconnect');}),null);
assert.equal(await loadTeachingQuestionImage(identity,{...policy,approvedBaseUrl:'https://localhost'},fetcher),null);
console.log('Teaching image bounded loader PASS');
