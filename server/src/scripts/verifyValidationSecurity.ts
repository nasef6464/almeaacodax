import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import express from 'express';
import {z} from 'zod';
import {partialRequestSchema,optionalRequestField} from '../utils/partialRequestSchema.js';
import {normalizeSchoolAssessmentCommand} from '../modules/quizzes/application/schoolAssessmentCommandSchema.js';
import {integrationTestSchema,interventionAlertSchema} from '../modules/notifications/application/notificationAlertSchemas.js';

if (process.argv.includes('--parser-worker')) {
  const app=express();
  app.use(express.json());
  app.post('/',(req,res)=>{res.json({received:req.body});});
  app.get('/health',(_req,res)=>{res.json({ok:true});});
  const server=app.listen(0,'127.0.0.1',()=>process.send?.({port:(server.address() as any).port}));
} else {
  const original=z.object({enabled:z.boolean().default(true),name:z.string().trim().min(1).default('default')});
  const patch=partialRequestSchema(original);
  assert.deepEqual(patch.parse({}),{});
  assert.deepEqual(patch.parse({enabled:false}),{enabled:false});
  assert.deepEqual(patch.parse({name:' new '}),{name:'new'});
  assert.equal(patch.safeParse({name:''}).success,false);
  assert.deepEqual(partialRequestSchema(original.strict()).safeParse({unknown:true}).success,false);
  assert.deepEqual(partialRequestSchema(original.passthrough()).parse({unknown:true}),{unknown:true});
  assert.deepEqual(z.object({nested:optionalRequestField(original)}).parse({}),{});
  assert.deepEqual(z.object({nested:optionalRequestField(original)}).parse({nested:{}}),{nested:{enabled:true,name:'default'}});
  assert.deepEqual(z.object({settings:partialRequestSchema(original).optional()}).parse({settings:{enabled:false}}),{settings:{enabled:false}});
  const command=normalizeSchoolAssessmentCommand({commandId:'00000000-0000-0000-0000-000000000000',operation:'remind',payload:{}});
  assert.equal(command.commandId,'00000000-0000-0000-0000-000000000000','retain existing GUID acceptance without new variant-bit constraints');
  assert.equal(integrationTestSchema.safeParse({channel:'email',recipientEmail:'teacher@example.invalid'}).success,false,'do not silently broaden the legacy contact requirements during a security upgrade');
  assert.equal(integrationTestSchema.safeParse({channel:'whatsapp',recipientPhone:'12345678'}).success,false);
  assert.equal(integrationTestSchema.safeParse({channel:'email',recipientEmail:'teacher@example.invalid',recipientPhone:'12345678'}).success,true);
  assert.equal(interventionAlertSchema.safeParse({studentId:'student',title:'عنوان',body:'متابعة'}).success,false,'retain legacy validation of the student name default');

  let parsed=0;
  const item=z.string().refine(()=>{parsed++;return true;});
  assert.equal(z.array(item).max(2).safeParse(Array.from({length:1000},()=> 'x')).success,false);
  assert.equal(parsed,0,'oversized arrays must be rejected before validating every element');
  assert.equal(z.set(item).max(2).safeParse(new Set(['a','b','c'])).success,false);
  assert.equal(parsed,0,'oversized sets must be rejected before validating elements');
  assert.equal(z.map(item,item).max(2).safeParse(new Map([['a','a'],['b','b'],['c','c']])).success,false);
  assert.equal(parsed,0,'oversized maps must be rejected before validating elements');

  // The malformed compression regression is isolated from the test runner and any real application.
  const child=fork(fileURLToPath(import.meta.url),['--parser-worker'],{execArgv:['--import','tsx'],silent:true});
  let stderr='';child.stderr?.on('data',data=>{stderr+=data.toString();});
  const timeout=setTimeout(()=>child.kill(),30000);
  try {
    const startup=await Promise.race([once(child,'message'),once(child,'exit').then(()=>{throw new Error(`parser worker exited: ${stderr}`);})]);
    const port=(startup[0] as {port:number}).port;
    const base=`http://127.0.0.1:${port}`;
    const payload={value:'fixture'};
    const valid=await fetch(base,{method:'POST',headers:{'content-type':'application/json','content-encoding':'gzip'},body:gzipSync(JSON.stringify(payload))});
    assert.equal(valid.status,200);assert.deepEqual(await valid.json(),{received:payload});
    const malformed=await fetch(base,{method:'POST',headers:{'content-type':'application/json','content-encoding':'gzip'},body:Buffer.concat([gzipSync(JSON.stringify(payload)),Buffer.from('trailing-invalid-data')])});
    assert.ok([200,400].includes(malformed.status));await malformed.arrayBuffer();
    for(let i=0;i<3;i++) {
      await new Promise(resolve=>setTimeout(resolve,30));
      assert.equal(child.exitCode,null,`parser must survive malformed compressed data: ${stderr}`);
      assert.equal((await fetch(`${base}/health`)).status,200);
    }
    console.log('PASS validation security: omission/explicit-value PATCH semantics, strict/passthrough, nested defaults, GUID compatibility, early array/set/map bounds and isolated compressed-request process survival.');
  } finally {clearTimeout(timeout);child.kill();}
}
