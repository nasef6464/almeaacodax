import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import tailwindConfig from '../tailwind.config.cjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const arg=name=>process.argv.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3);
const artifacts=arg('artifacts')||await mkdtemp(path.join(tmpdir(),'learning-counters-'));
await mkdir(artifacts,{recursive:true});
const bundle=await build({absWorkingDir:root,entryPoints:['scripts/fixtures/learning-counters.tsx'],bundle:true,format:'iife',write:false,plugins:[{name:'list-only',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));b.onResolve({filter:/\/(VideoModal|PaymentModal)$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'js',contents:`export const ${path.endsWith('VideoModal')?'VideoModal':'PaymentModal'}=()=>null;`}));}}]});
const css=await postcss([tailwindcss({...tailwindConfig,content:['components/SimulatedTestExperience.tsx','components/studentPaths/*.tsx','scripts/fixtures/learning-counters.tsx']})]).process(await readFile(path.join(root,'styles/main.css'),'utf8'),{from:undefined});
const server=createServer((_,res)=>{res.setHeader('content-type','text/html;charset=utf-8');res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.css}</style><div id="root" dir="rtl"></div><script>${bundle.outputFiles.find(f=>f.path.endsWith('.js'))?.text||bundle.outputFiles[0].text}</script>`);});
let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({...arg('executable')&&{executablePath:arg('executable')},...arg('channel')&&{channel:arg('channel')}});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>route.abort());
 await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'domcontentloaded',timeout:30000});
 const counters=page.getByRole('group',{name:'تصفية تدريبات المادة'});
 await counters.waitFor();
 for(const width of [320,360,390,430,1280]){
  await page.setViewportSize({width,height:844});
  const box=await counters.boundingBox();
  assert.ok(box.height<=68,`counter strip ${box.height}px must stay compact at ${width}px`);
  for(const group of await page.getByRole('group').all()){
   assert.ok((await group.boundingBox()).height<=68,'foundation and mock counters remain one compact row');
   // Read siblings in one layout snapshot; per-element protocol reads can sample different positions during layout changes.
   const positions=await group.evaluate(node=>Array.from(node.children,cell=>{const b=cell.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}));
   assert.equal(positions.length,3);
   assert.ok(positions.every(p=>Math.abs(p.y-positions[0].y)<2));
  }
  const buttons=await counters.getByRole('button').all();
  assert.equal(buttons.length,3,'one control for each filter, without duplicate counter cards');
  const bounds=await counters.locator('button').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}));
  assert.equal(bounds.length,3,'geometry snapshot must contain all filter buttons');
  assert.ok(bounds.every(b=>b.height>=44&&b.width>=44),'retain touch targets');
  assert.ok(bounds.every(b=>Math.abs(b.y-bounds[0].y)<2),'all three counters share one row');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  assert.ok((await page.getByRole('region',{name:'إنجاز تدريبات'}).boundingBox()).height<=90,'compact progress including large counts/locked label');
  await page.screenshot({path:path.join(artifacts,`counters-${width}.png`),fullPage:true});
 }
 await counters.getByRole('button',{name:'المجاني: 1',exact:true}).click();
 await page.getByText('تدريب متاح',{exact:true}).waitFor();
 assert.equal(await page.getByText('تدريب الباقة',{exact:true}).count(),0);
 assert.equal(await counters.getByRole('button',{name:'المجاني: 1',exact:true}).getAttribute('aria-pressed'),'true');
 await counters.getByRole('button',{name:'المدفوع / باقة: 1',exact:true}).click();
 await page.getByText('تدريب الباقة',{exact:true}).waitFor();
 assert.equal(await page.getByText('تدريب متاح',{exact:true}).count(),0);
 await counters.getByRole('button',{name:'تدريبات المادة: 2',exact:true}).click();
 assert.equal(await page.getByText('تدريب متاح',{exact:true}).count(),1);
 assert.equal(await page.getByText('تدريب الباقة',{exact:true}).count(),1);
 const foundation=page.getByRole('group',{name:'تصفية موضوعات التأسيس'});
 await foundation.getByRole('button',{name:'ضمن باقة: 25',exact:true}).click();
 assert.equal(await foundation.getByRole('button',{name:'ضمن باقة: 25',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await page.getByRole('group',{name:'إحصاءات الاختبارات المحاكية'}).getByRole('button').count(),0,'static mock counters must not imply a filtering action');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',artifacts,checks:['320/360/390/430/1280','single counter row','44px touch targets','large progress counts','free/paid/all filters','no duplicate filters']}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
