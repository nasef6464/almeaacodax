import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import tailwindConfig from '../tailwind.config.cjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const arg = name => process.argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length + 3);
const artifacts = arg('artifacts') || await mkdtemp(path.join(tmpdir(), 'teaching-image-'));
await mkdir(artifacts, { recursive: true });
const bundle = await build({ absWorkingDir: root, entryPoints: ['scripts/fixtures/teaching-image.tsx'], bundle: true,
  format: 'iife', write: false, plugins: [{ name: 'css', setup(b) { b.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' })); } }] });
const css = await postcss([tailwindcss({ ...tailwindConfig, content: ['components/results/teaching/*.tsx','scripts/fixtures/teaching-image.tsx'] })])
  .process('@tailwind base;@tailwind components;@tailwind utilities;', { from: undefined });
const katex = await readFile(path.join(root, 'node_modules/katex/dist/katex.min.css'), 'utf8');
const server = createServer(async (req, res) => {
  if (req.url.startsWith('/fonts/') && /^\/fonts\/[\w.-]+$/.test(req.url)) {
    try { res.end(await readFile(path.join(root, 'node_modules/katex/dist', req.url.slice(1)))); } catch { res.statusCode = 404; res.end(); }
    return;
  }
  res.setHeader('content-type', 'text/html;charset=utf-8');
  res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.css}\n${katex}</style><div id="root"></div><script>${bundle.outputFiles[0].text}</script>`);
});
let browser;
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch(arg('executable') ? { executablePath: arg('executable') } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('https://fixture.images/**', async route => {
    const n=Number(new URL(route.request().url()).pathname.match(/(\d+)\.png/)[1]);
    const portrait=n===3; const w=portrait?180:600,h=portrait?500:220;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="white"/><rect x="${w*.1}" y="${h*.2}" width="${w*.4}" height="${h*.3}" fill="#e0f2fe" stroke="#0e7490" stroke-width="3"/><text x="${w*.2}" y="${h*.4}" font-size="24">${['6 × 4','1/2 + 1/4','A | B','معطيات السؤال'][n]||''}</text></svg>`;
    await new Promise(r=>setTimeout(r,200));await route.fulfill({status:200,contentType:'image/svg+xml',body:svg});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByTestId('teaching-board').waitFor();await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.imageMotion.elapsed),0,'wait actual speech start');
  for(const name of ['Geometry','Fraction','Table','Arabic','No image']){
    await page.getByRole('button',{name,exact:true}).click();await page.getByRole('button',{name:'Half',exact:true}).click();
    if(name==='No image'){assert.equal(await page.getByTestId('teaching-image-overlay').count(),0);continue;}
    await page.getByTestId('teaching-image-mark').waitFor();
    assert.equal(await page.getByTestId('teaching-image-mark').getAttribute('data-progress'),'0.5');
    const mark=await page.getByTestId('teaching-image-mark').locator('path').first().getAttribute('stroke-dashoffset');
    await page.waitForTimeout(100);assert.equal(await page.getByTestId('teaching-image-mark').locator('path').first().getAttribute('stroke-dashoffset'),mark);
    for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:844});await page.waitForTimeout(100);
      const actual=await page.getByTestId('teacher-question').locator('img').boundingBox();const frame=await page.getByTestId('teaching-image-content-rect').boundingBox();
      for(const key of ['x','y','width','height'])assert.ok(Math.abs(actual[key]-frame[key])<1,`${name} ${width} ${key} actual image bounds`);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Version',exact:true}).click();assert.equal(await page.getByTestId('teaching-image-overlay').count(),0);
    await page.getByRole('button',{name:'Version',exact:true}).click();await page.getByTestId('teaching-image-overlay').waitFor();
    await page.getByTestId('teacher-question').locator('summary').click();assert.equal(await page.getByTestId('teaching-image-overlay').isVisible(),false);
    await page.getByTestId('teacher-question').locator('summary').click();await page.getByTestId('teaching-image-mark').waitFor();
    await page.screenshot({path:path.join(artifacts,name+'-390.png')});
    await page.getByTestId('teacher-question').locator('img').screenshot({path:path.join(artifacts,'source-'+name+'.png')});
    await page.getByRole('button',{name:'All',exact:true}).click();assert.equal(await page.getByTestId('teaching-image-mark').count(),3);
    await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Half',exact:true}).click();
    assert.equal(await page.getByTestId('whiteboard-marker').isVisible(),false);
    assert.equal(await page.getByTestId('teaching-image-mark').locator('path').first().evaluate(e=>getComputedStyle(e).strokeDashoffset),'0px');
    await page.emulateMedia({reducedMotion:'no-preference'});
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'PASS', syntheticExamples: 5, artifacts, checks: ['speech-start wait','paused marks','actual image bounds320/390/1280','version mismatch','collapse/reopen','portrait/landscape','reduced motion','no overflow'] }));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
