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
const artifacts = arg('artifacts') || await mkdtemp(path.join(tmpdir(), 'teaching-motion-'));
await mkdir(artifacts, { recursive: true });
const bundle = await build({ absWorkingDir: root, entryPoints: ['scripts/fixtures/teaching-motion.tsx'], bundle: true,
  format: 'iife', write: false, plugins: [{ name: 'css', setup(b) { b.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' })); } }] });
const css = await postcss([tailwindcss({ ...tailwindConfig, content: ['components/results/teaching/*.tsx','scripts/fixtures/teaching-motion.tsx'] })])
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
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByTestId('teaching-board').waitFor();
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.motion.elapsed), 0, 'visuals wait for actual speech start');
  await page.evaluate(() => window.speech.onstart());
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const elapsed = await page.evaluate(() => window.motion.elapsed);
  assert.ok(elapsed > 0);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.motion.elapsed), elapsed);
  for (const [index, name] of ['جمع','كسور','هندسة','عربي','English'].entries()) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.getByRole('button', { name: 'Writing', exact: true }).click();
    await page.getByTestId('whiteboard-marker').waitFor();
    await page.screenshot({ path: path.join(artifacts, `example-${index + 1}-390.png`) });
    if (index === 1) {
      await page.getByRole('button', { name: 'Second line', exact: true }).click();
      const line = await page.getByTestId('teaching-formula-line').nth(1).boundingBox();
      const tip = await page.getByTestId('whiteboard-marker').boundingBox();
      assert.ok(tip.y >= line.y && tip.y <= line.y + line.height, 'nib follows actual unequal-height formula rows');
    }
    await page.getByRole('button', { name: 'Underline', exact: true }).click();
    assert.equal(await page.getByTestId('whiteboard-ink').locator('path').getAttribute('stroke-dashoffset'), '0.5');
    const point = await page.getByTestId('whiteboard-marker').getAttribute('style');
    await page.waitForTimeout(180);
    assert.equal(await page.getByTestId('whiteboard-marker').getAttribute('style'), point, 'paused hand must stay on the actual mark');
    await page.getByRole('button', { name: 'Box', exact: true }).click();
    assert.equal(await page.getByTestId('whiteboard-ink').locator('path').getAttribute('stroke-dashoffset'), '0.5');
    assert.equal(await page.locator('details').last().getAttribute('open'), null, 'transcript stays optional');
    await page.getByText('نص الشرح', { exact: true }).click();
    assert.ok(await page.locator('details').last().getAttribute('open') !== null);
    await page.getByText('نص الشرح', { exact: true }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Writing', exact: true }).click();
  assert.equal(await page.getByTestId('whiteboard-marker').isVisible(), false);
  assert.equal(await page.locator('.teaching-writing').evaluate(e => getComputedStyle(e).clipPath), 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: 'كسور', exact: true }).click();
  await page.getByRole('button', { name: 'Box', exact: true }).click();
  await page.getByRole('button', { name: 'تبديل لون السبورة', exact: true }).click();
  await page.screenshot({ path: path.join(artifacts, 'dark-1280.png') });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'PASS', syntheticExamples: 5, artifacts, checks: ['speech-start gate','pause','deterministic marks and hand','Arabic/English/fractions/geometry','optional transcript','reduced motion','390/1280','no overflow'] }));
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
