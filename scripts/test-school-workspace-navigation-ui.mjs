import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import config from '../tailwind.config.cjs';
const arg=name=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3);
const artifacts=arg('artifacts')||'scratch/school-workspace-navigation';await mkdir(artifacts,{recursive:true});
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';
import {DashboardSectionBreadcrumb,DashboardSectionNav} from './components/DashboardSectionNav';
import {DashboardLayout} from './components/DashboardLayout';
window.calls=[];
const items=[{id:'overview',label:'نظرة عامة'},{id:'students',label:'متابعة الطلاب'},{id:'tests',label:'الاختبارات والتحليل'},{id:'skills',label:'خريطة المهارات'},{id:'reports',label:'تقارير الأداء'}];
const groups=[{label:'الرئيسية',ids:['overview']},{label:'الطلاب والاختبارات',ids:['students','tests']},{label:'المهارات والتقارير',ids:['skills','reports']}];
function App(){const [active,setActive]=React.useState('overview');const [restricted,setRestricted]=React.useState(false);window.setActive=setActive;window.restrict=setRestricted;return <DashboardLayout workspaceTitle="مساحة المدرسة" sidebar={<DashboardSectionNav collapsible items={restricted?items.slice(0,1):items} groups={groups} activeId={active} onSelect={id=>{setActive(id);window.calls.push(id)}}/>}><DashboardSectionBreadcrumb items={items} groups={groups} activeId={active} homeLabel="لوحة المدرسة" onHome={()=>setActive('overview')}/><h1>القسم: {active}</h1></DashboardLayout>}
createRoot(document.getElementById('root')).render(<App/>);
`},bundle:true,write:false,plugins:[{name:'header-only',setup(b){b.onResolve({filter:/^\.\/Header$/},()=>({path:'header',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'jsx',resolveDir:process.cwd(),contents:"import React from 'react';export const Header=()=> <header style={{height:64}}>المنصة</header>"}));}}]});
const css=await postcss([tailwindcss({...config,content:['components/DashboardSectionNav.tsx','components/DashboardLayout.tsx']})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined});
const server=createServer((_,res)=>{res.setHeader('content-type','text/html;charset=utf-8');res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.css}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;try{
 browser=await chromium.launch(arg('executable')?{executablePath:arg('executable')}:{});
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}`);
  const mobile=width<768;if(mobile){await page.getByText('مساحة المدرسة',{exact:true}).waitFor();await page.getByRole('button',{name:'فتح أقسام لوحة التحكم',exact:true}).click();}
  const nav=page.getByRole('navigation',{name:'أقسام اللوحة',exact:true}).filter({visible:true});
  await nav.getByRole('button',{name:'نظرة عامة',exact:true}).waitFor();
  assert.equal(await nav.locator('details[open]').count(),1,'Only the current group starts expanded');
  assert.equal(await nav.getByRole('button',{name:'خريطة المهارات',exact:true}).isVisible(),false);
  const skillGroup=nav.locator('summary').filter({hasText:'المهارات والتقارير'});
  if(mobile)await skillGroup.click();else{await skillGroup.focus();await page.keyboard.press('Enter');}
  assert.equal(await nav.locator('details[open]').count(),1,'Opening a group removes competing expanded groups');
  await nav.getByRole('button',{name:'خريطة المهارات',exact:true}).click();
  await page.getByRole('heading',{name:'القسم: skills',exact:true}).waitFor();
  assert.equal(await page.getByRole('navigation',{name:'مسار الصفحة',exact:true}).locator('[aria-current="page"]').innerText(),'خريطة المهارات');
  if(mobile){await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByRole('button',{name:'فتح أقسام لوحة التحكم',exact:true}).click();}
  await nav.getByRole('button',{name:'خريطة المهارات',exact:true}).waitFor();
  await page.screenshot({path:artifacts+'/'+width+'.png'});
  assert.equal(await nav.getByRole('button',{name:'خريطة المهارات',exact:true}).getAttribute('aria-current'),'page');
  await page.evaluate(()=>window.setActive('tests'));
  await nav.getByRole('button',{name:'الاختبارات والتحليل',exact:true}).waitFor();
  assert.equal(await nav.getByRole('button',{name:'الاختبارات والتحليل',exact:true}).getAttribute('aria-current'),'page','External/deep-link selection opens its group');
  if(mobile)await page.getByRole('button',{name:'إغلاق القائمة',exact:true}).click();
  await page.getByRole('button',{name:'لوحة المدرسة',exact:true}).click();await page.getByRole('heading',{name:'القسم: overview',exact:true}).waitFor();
  if(mobile)await page.getByRole('button',{name:'فتح أقسام لوحة التحكم',exact:true}).click();
  await page.evaluate(()=>{window.restrict(true);window.setActive('overview')});
  await nav.getByRole('button',{name:'نظرة عامة',exact:true}).waitFor();
  await nav.locator('summary').nth(1).waitFor({state:'detached'});
  assert.equal(await nav.locator('summary').count(),1,'No empty or unauthorized groups');
  assert.deepEqual(await page.evaluate(()=>window.calls),['skills']);assert.deepEqual(errors,[]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close();
 }
 console.log('PASS school navigation390/1280: one expanded group,discover/select skill,mobile drawer stays for grouping then closes on selection,current destination,reopen,external selection,restricted entries,no overflow.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
