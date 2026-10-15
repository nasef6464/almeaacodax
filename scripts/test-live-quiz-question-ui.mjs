import assert from 'node:assert/strict';import{createServer}from'node:http';import{build}from'esbuild';import{chromium}from'playwright';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from'react';import{createRoot}from'react-dom/client';import{api}from'./services/api';import{useLiveQuizQuestion}from'./hooks/useLiveQuizQuestion';
window.requests=[];window.bank={id:'q1',text:'original',options:['A','B']};let resolveOld;window.lag=false;
api.getQuiz=async(id,options)=>{window.requests.push({id,options});if(window.lag)return new Promise(r=>{resolveOld=r;window.deliver=()=>r({questions:[{id:'q1',text:'stale',options:['A','B']}]})});return{questions:[{...window.bank}]}};
function App(){const[q,setQ]=React.useState(window.bank),[active,setActive]=React.useState(true),[answer,setAnswer]=React.useState(0),[id,setId]=React.useState('q1');window.finish=()=>setActive(false);window.move=()=>{setId('q2');setQ({id:'q2',text:'second',options:['A','B']})};
useLiveQuizQuestion({quizId:'quiz',question:q,active,onQuestion:next=>setQ(next),onOptionsChanged:()=>setAnswer(-1)});
return <><p>{q.text}</p><span>answer:{answer}</span><button onClick={()=>setAnswer(1)}>choose</button></>};createRoot(document.getElementById('root')).render(<App/>);
`},bundle:true,format:'iife',platform:'browser',write:false,define:{'import.meta.env':'{}'}});
const server=createServer((_,res)=>{res.setHeader('content-type','text/html;charset=utf-8');res.end('<main id="root"></main><script>'+bundle.outputFiles[0].text+'</script>')});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.argv.includes('--chrome')?{channel:'chrome'}:{})});
try{const page=await browser.newPage();await page.clock.install();await page.goto('http://127.0.0.1:'+server.address().port);await page.getByText('original',{exact:true}).waitFor();
await page.evaluate(()=>{window.bank={...window.bank,text:'corrected'};window.dispatchEvent(new Event('focus'))});await page.getByText('corrected',{exact:true}).waitFor();await page.getByText('answer:0',{exact:true}).waitFor();
await page.evaluate(()=>{window.bank={...window.bank,options:['B','A']}});await page.clock.fastForward(30001);await page.getByText('answer:-1',{exact:true}).waitFor();
assert.ok(await page.evaluate(()=>window.requests.every(r=>r.options.questionId==='q1')),'Only displayed question may be fetched');
await page.evaluate(()=>{window.lag=true;window.dispatchEvent(new Event('focus'))});await page.waitForFunction(()=>Boolean(window.deliver));await page.evaluate(()=>{window.lag=false;window.bank={id:'q2',text:'second',options:['A','B']};window.move()});await page.getByText('second',{exact:true}).waitFor();await page.evaluate(()=>window.deliver());assert.equal(await page.getByText('stale',{exact:true}).count(),0);
await page.evaluate(()=>window.finish());const count=await page.evaluate(()=>window.requests.length);await page.clock.fastForward(60001);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));assert.equal(await page.evaluate(()=>window.requests.length),count);
console.log('PASS live correction: focus/poll refresh,current-question-only,choice reset,late navigation ignored,finished attempt stops requests');
}finally{await browser.close();await new Promise(r=>server.close(r));}
