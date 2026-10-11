import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {parseFixture} from './client.mjs';
import {safePath,TrafficLedger} from './traffic.mjs';
const fixture=()=>({group:0,students:Array.from({length:6},(_,i)=>({index:i,userId:randomBytes(12).toString('hex'),email:randomBytes(8).toString('hex'),password:randomBytes(20).toString('hex')}))});
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
