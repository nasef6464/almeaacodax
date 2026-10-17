import assert from 'node:assert/strict';
import {createAiProviderAdapters} from '../server/src/modules/ai/infrastructure/providers/aiProviderAdapters';
const original=globalThis.fetch;let attempts=0;let sent:any;
const adapter=createAiProviderAdapters({getProviderRuntime:()=>({apiKeys:['first','second'],model:'gemini-2.5-flash'}),defaultTimeoutMs:100,clientUrl:'https://example.com',qwenBaseUrl:'https://example.com',redactDiagnostic:()=>''});
try{
 globalThis.fetch=async(_url,init)=>{attempts++;sent=JSON.parse(String(init?.body));return new Response('{}',{status:404});};
 await assert.rejects(adapter.callProvider('gemini','p','application/json',{data:'abcd',mimeType:'image/png'},{singleAttempt:true,maxOutputTokens:900,disableThinking:true}));
 assert.equal(attempts,1,'no alternate key/model attempt');assert.equal(sent.generationConfig.maxOutputTokens,900);
 const before=attempts;
 await assert.rejects(adapter.callProvider('openai','p',undefined,{data:'abcd',mimeType:'image/png'},{}));
 assert.equal(attempts,before,'unsupported image provider never receives text-only request');
 globalThis.fetch=async()=>{attempts++;return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'ok'}]}}],usageMetadata:{totalTokenCount:10,promptTokenCount:8,candidatesTokenCount:2}}));};
 assert.equal((await adapter.callProvider('gemini','p',undefined,{data:'abcd',mimeType:'image/png'},{singleAttempt:true})).text,'ok');
 globalThis.fetch=async()=>new Response(new ReadableStream({start(c){setTimeout(()=>{try{c.enqueue(new TextEncoder().encode('{"candidates":[{"content":{"parts":[{"text":"late"}]}}]}'));c.close();}catch{}},100);}}));
 await assert.rejects(adapter.callProvider('gemini','p',undefined,{data:'abcd',mimeType:'image/png'},{singleAttempt:true,timeoutMs:10}), 'body read must share the provider deadline');
}finally{globalThis.fetch=original;}
console.log('Teaching image single-attempt provider PASS');
