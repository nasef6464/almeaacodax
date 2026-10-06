import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(path, needle) {
  const content = read(path);
  assert(content.includes(needle), `${path} must include: ${needle}`);
}

assertIncludes('app/SeoRouteMeta.tsx', 'export const SeoRouteMeta: React.FC = () => {');
assertIncludes('app/SeoRouteMeta.tsx', "SEO_DEFAULT_IMAGE_PATH");
assertIncludes('app/SeoRouteMeta.tsx', "'noindex, nofollow'");
assertIncludes('app/SeoRouteMeta.tsx', "'index, follow'");
assertIncludes('app/resolveSeoRouteMeta.ts', "SEO_PRIVATE_PREFIXES");
assertIncludes('app/SeoRouteMeta.tsx', "link[rel=\"canonical\"]");
assertIncludes('app/SeoRouteMeta.tsx', 'meta[property="og:image"]');
assertIncludes('app/SeoRouteMeta.tsx', 'meta[name="twitter:image"]');
assertIncludes('App.tsx', "<SeoRouteMeta />");

assertIncludes('index.html', '<meta property="og:image" content="https://almeaacodax.vercel.app/images/homepage-hero-boy-platform.webp" />');
assertIncludes('index.html', '<meta name="twitter:card" content="summary_large_image" />');
assertIncludes('index.html', '<meta name="twitter:image" content="https://almeaacodax.vercel.app/images/homepage-hero-boy-platform.webp" />');
assertIncludes('public/robots.txt', 'Sitemap: https://almeaacodax.vercel.app/sitemap.xml');
assertIncludes('public/robots.txt', 'Disallow: /admin-dashboard');
assertIncludes('public/robots.txt', 'Disallow: /quiz');
assertIncludes('public/robots.txt', 'Disallow: /results');
assertIncludes('public/sitemap.xml', '<loc>https://almeaacodax.vercel.app/</loc>');
assertIncludes('public/sitemap.xml', '<lastmod>2026-05-12</lastmod>');
assertIncludes('public/site.webmanifest', '"display": "standalone"');

const vercel = JSON.parse(read('vercel.json'));
const headers = Array.isArray(vercel.headers) ? vercel.headers : [];
const privateHeader = headers.find((entry) => String(entry.source || '').includes('admin-dashboard') && String(entry.source || '').includes('results'));
assert(privateHeader, 'vercel.json must include a private-route X-Robots-Tag header block');
const xRobots = (privateHeader.headers || []).find((header) => String(header.key || '').toLowerCase() === 'x-robots-tag');
assert(xRobots?.value === 'noindex, nofollow', 'private route header must be noindex, nofollow');

console.log('SEO contract passed: public metadata exists and private app routes are noindex protected.');
