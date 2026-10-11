import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseFixture,parseWorkerArgs} from './client.mjs';
import {safePath,TrafficLedger} from './traffic.mjs';
const fixture=()=>({group:0,students:Array.from({length:6},(_,i)=>({index:i,userId:randomBytes(12).toString('hex'),email:randomBytes(8).toString('hex'),password:randomBytes(20).toString('hex')}))});
test('worker settings require explicit bounded CLI values',()=>{
 assert.throws(()=>parseWorkerArgs([]),/group/i);
 const args=['--group','0','--session',randomBytes(12).toString('hex'),'--release',randomBytes(20).toString('hex'),'--run-id','1','--runner','test-runner'];
 assert.equal(parseWorkerArgs(args).group,0);
 args[3]='../other-session';assert.throws(()=>parseWorkerArgs(args),/session/i);
 args[3]=randomBytes(12).toString('hex');args[1]='4';assert.throws(()=>parseWorkerArgs(args),/group/i);
});
test('workflow pipe and CLI adapter validates without production traffic',()=>{
 const raw=JSON.stringify(fixture());const args=['--group','0','--session',randomBytes(12).toString('hex'),'--release',randomBytes(20).toString('hex'),'--run-id','1','--runner','test-runner','--validate-only'];
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('./worker.mjs',import.meta.url)),...args],{input:raw,encoding:'utf8',timeout:60000});
 assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).productionTraffic,0);assert.equal(JSON.parse(result.stdout).students,6);
 for(const row of JSON.parse(raw).students){assert.ok(!result.stdout.includes(row.email));assert.ok(!result.stdout.includes(row.password));}
});
test('fixture fails closed without six distinct credentials or with wrong group',()=>{
 assert.throws(()=>parseFixture('',0),/fixture/i);
 const f=fixture();assert.equal(parseFixture(JSON.stringify(f),0).students.length,6);
 assert.throws(()=>parseFixture(JSON.stringify(f),1),/group/i);
 f.students[0].password='';assert.throws(()=>parseFixture(JSON.stringify(f),0),/credential/i);
 f.students[0].password=randomBytes(20).toString('hex');f.students[1].userId=f.students[0].userId;
 assert.throws(()=>parseFixture(JSON.stringify(f),0),/distinct/i);
});
test('captured path drops queries and masks record ids',()=>{
 const id=randomBytes(12).toString('hex');const value=randomBytes(20).toString('hex');
 assert.equal(safePath('https://example.invalid/api/classroom/'+id+'?token='+value),'/api/classroom/:id');
});
test('pending stream counters are removed on completion without double counting',()=>{
 const ledger=new TrafficLedger();ledger.start('a',{actor:'student-01',kind:'transport',path:'/socket.io',method:'GET'});
 ledger.data('a',10,30);assert.equal(ledger.snapshot().pending[0].streamEncodedBytes,10);
 ledger.finish('a',50);const result=ledger.snapshot();assert.equal(result.pending.length,0);assert.equal(result.completed[0].receivedBytes,50);
});
