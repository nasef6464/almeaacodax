import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import config from '../tailwind.config.cjs';
const arg=n=>process.argv.find(v=>v.startsWith('--'+n+'='))?.slice(n.length+3);
const artifacts=arg('artifacts')||'scratch/teaching-regions-ui';await mkdir(artifacts,{recursive:true});
const bundle=await build({entryPoints:['scripts/fixtures/teaching-regions.tsx'],bundle:true,write:false,format:'iife',plugins:[{name:'css',setup(b){b.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));}}]});
const css=await postcss([tailwindcss({...config,content:['components/results/teaching/*.tsx','dashboards/admin/builders/QuestionTeachingRegionsEditor.tsx','scripts/fixtures/teaching-regions.tsx']})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined});
const server=createServer((_,res)=>{res.setHeader('content-type','text/html;charset=utf-8');res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.css}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch(arg('executable')?{executablePath:arg('executable')}:{});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fixture.images/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="220"><rect width="600" height="220" fill="white"/><rect x="110" y="40" width="330" height="130" fill="#e0f2fe" stroke="#0e7490"/><text x="270" y="210" font-size="36">6</text><text x="465" y="115" font-size="36">4</text></svg>'}));
 await page.goto(`http://127.0.0.1:${server.address().port}`);const editor=page.getByTestId('teaching-regions-editor');const image=editor.locator('img');await image.evaluate(i=>i.decode());
 const draw=async(x,y,w,h)=>{await editor.getByRole('button',{name:'تحديد منطقة',exact:true}).click();const b=await image.boundingBox();await page.mouse.move(b.x+b.width*x,b.y+b.height*y);await page.mouse.down();await page.mouse.move(b.x+b.width*(x+w),b.y+b.height*(y+h),{steps:5});await page.mouse.up();};
 await draw(.44,.78,.06,.21);await draw(.77,.4,.05,.17);
 assert.equal(await editor.getByTestId('region-item').count(),2);assert.equal(await page.getByTestId('teaching-image-mark').count(),0,'drafts must not reach playback');
 await editor.getByLabel('اسم المنطقة 1').fill('الطول6');await editor.getByRole('button',{name:'اعتماد المناطق',exact:true}).click();assert.equal(await page.getByTestId('teaching-image-mark').count(),2);
 const saved=await page.evaluate(()=>window.regionsDraft);assert.ok(saved.approved);assert.ok(Math.abs(saved.items[0].x-.44)<.005);assert.ok(Math.abs(saved.items[0].y-.78)<.005);
 await page.getByRole('button',{name:'حفظ السؤال',exact:true}).click();await editor.getByRole('button',{name:'حذف المنطقة 1',exact:true}).click();assert.equal(await page.getByTestId('teaching-image-mark').count(),0);await page.getByRole('button',{name:'إعادة التحميل',exact:true}).click();assert.equal(await page.getByTestId('teaching-image-mark').count(),2);
 await page.screenshot({path:artifacts+'/approved-390.png'});
 await page.getByRole('button',{name:'تغيير الصورة',exact:true}).click();await image.evaluate(i=>i.decode());assert.equal(await page.getByTestId('teaching-image-mark').count(),0);assert.equal(await editor.getByTestId('region-item').count(),0);assert.equal(await editor.getByRole('button',{name:'اعتماد المناطق',exact:true}).isEnabled(),false);
 await draw(.1,.1,.2,.2);await draw(.4,.4,.2,.2);await draw(.2,.6,.2,.2);await draw(.7,.1,.2,.2);assert.equal(await editor.getByRole('button',{name:'تحديد منطقة',exact:true}).isEnabled(),false);
 await editor.getByRole('button',{name:'حذف المنطقة 4',exact:true}).click();await editor.getByRole('button',{name:'تحديد منطقة',exact:true}).click();await editor.getByTestId('region-image-surface').press('Enter');assert.equal(await editor.getByTestId('region-item').count(),4,'keyboard can add a region for numeric adjustment');
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:artifacts+'/editor-'+width+'.png'});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',artifacts,checks:['mobile drawing','approval before playback','source bounds','save/reopen','image replacement','max4','keyboard','320/390/1280 no overflow'],realProviderCalls:0,productionWrites:0}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
