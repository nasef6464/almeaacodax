import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'architecture', 'generated');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const TEXT_EXTENSIONS = new Set([
  ...SOURCE_EXTENSIONS,
  '.json', '.md', '.yml', '.yaml', '.html', '.css', '.txt', '.env', '.example', '.toml', '.xml', '.svg',
]);
const RESOLVE_EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const SKIP_PREFIXES = ['node_modules/', 'dist/', 'server/dist/', '.git/'];

const posix = (value) => value.split(path.sep).join('/');
const trackedFiles = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT })
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
  .map(posix)
  .filter((file) => !SKIP_PREFIXES.some((prefix) => file.startsWith(prefix)));
const trackedSet = new Set(trackedFiles);

function readText(file) {
  const abs = path.join(ROOT, file);
  try {
    return fs.readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
}

function isLikelyText(file) {
  const ext = path.extname(file).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  const base = path.basename(file).toLowerCase();
  return ['dockerfile', 'makefile', '.gitignore', '.dockerignore', '.vercelignore', '.env.example'].includes(base)
    || base.startsWith('dockerfile.');
}

function lineCount(text) {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function classify(file) {
  if (file.startsWith('server/src/')) return 'api-source';
  if (file.startsWith('server/')) return 'api-support';
  if (file.startsWith('scripts/')) return 'test-or-ops-script';
  if (file.startsWith('tools/')) return 'tooling';
  if (file.startsWith('docs/')) return 'documentation';
  if (file.startsWith('.github/')) return 'ci';
  if (file.startsWith('public/')) return 'public-asset';
  if (/^(pages|components|dashboards|contexts|services|store|utils|hooks)\//.test(file)) return 'web-source';
  if (['App.tsx', 'index.tsx', 'types.ts'].includes(file)) return 'web-source';
  if (SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase())) return 'source-other';
  return 'support';
}

const DOMAIN_RULES = [
  ['notifications', /notification|announcement/i],
  ['auth', /auth|login|password|verify|session/i],
  ['questions', /question|skill/i],
  ['quizzes', /quiz/i],
  ['exams', /mock|exam|simulated|barcode/i],
  ['schools', /school|group|classroom|supervisor|teacher|parent/i],
  ['reports', /report|analytic|result|progress|achievement/i],
  ['payments', /payment|membership|pricing|financial|invoice|package|access/i],
  ['learning', /lesson|topic|learning|flashcard|review|library/i],
  ['courses', /course|subject|section|curriculum/i],
  ['paths', /path|qudrat|tahsili|foundation/i],
  ['users', /user|profile|favorite/i],
  ['ai', /gemini|aiassistant|ai[-_.]/i],
  ['live-sessions', /live.?session|booking/i],
  ['content', /content|homepage|blog|staticinfo/i],
  ['operations', /backup|operation|monitor|health|integration/i],
];

function guessDomain(file) {
  const normalized = file.replace(/^server\/src\/(routes|models|services)\//, '');
  for (const [domain, regex] of DOMAIN_RULES) {
    if (regex.test(normalized)) return domain;
  }
  return 'shared';
}

function migrationCandidate(file) {
  const domain = guessDomain(file);
  const base = path.posix.basename(file);
  if (file === 'App.tsx') return { target: 'apps/web/src/app/App.tsx', domain: 'app', confidence: 'explicit' };
  if (file === 'index.tsx') return { target: 'apps/web/src/app/main.tsx', domain: 'app', confidence: 'explicit' };
  if (file === 'types.ts') return { target: 'apps/web/src/shared/types/domain.ts', domain: 'shared', confidence: 'explicit' };
  if (file === 'services/api.ts') return { target: 'apps/web/src/core/api/api.ts', domain: 'core-api', confidence: 'explicit' };
  if (file === 'store/useStore.ts') return { target: 'apps/web/src/core/state/useStore.ts', domain: 'core-state', confidence: 'explicit' };
  if (file.startsWith('server/src/routes/')) return { target: `apps/api/src/modules/${domain}/http/${base}`, domain, confidence: 'review-required' };
  if (file.startsWith('server/src/models/')) return { target: `apps/api/src/modules/${domain}/infrastructure/persistence/${base}`, domain, confidence: 'review-required' };
  if (file.startsWith('server/src/services/')) return { target: `apps/api/src/modules/${domain}/application/${base}`, domain, confidence: 'review-required' };
  if (file.startsWith('server/src/middleware/')) return { target: `apps/api/src/shared/http/middleware/${base}`, domain: 'shared', confidence: 'high' };
  if (file.startsWith('server/src/config/')) return { target: `apps/api/src/infrastructure/config/${base}`, domain: 'infrastructure', confidence: 'high' };
  if (file.startsWith('server/src/')) return { target: `apps/api/src/${file.slice('server/src/'.length)}`, domain, confidence: 'review-required' };
  if (/^(pages|components|dashboards|contexts|hooks)\//.test(file)) {
    const remainder = file.replace(/^[^/]+\//, '');
    return { target: `apps/web/src/features/${domain}/${remainder}`, domain, confidence: domain === 'shared' ? 'review-required' : 'candidate' };
  }
  if (file.startsWith('services/')) return { target: `apps/web/src/core/api/${file.slice('services/'.length)}`, domain: 'core-api', confidence: 'review-required' };
  if (file.startsWith('store/')) return { target: `apps/web/src/core/state/${file.slice('store/'.length)}`, domain: 'core-state', confidence: 'review-required' };
  if (file.startsWith('utils/')) return { target: `apps/web/src/shared/lib/${file.slice('utils/'.length)}`, domain: 'shared', confidence: 'review-required' };
  return null;
}

function extractImportSpecifiers(source) {
  const specs = new Set();
  const patterns = [
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(source))) specs.add(match[1]);
  }
  return [...specs];
}

function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  const candidates = [];
  for (const ext of RESOLVE_EXTENSIONS) candidates.push(`${base}${ext}`);
  for (const ext of RESOLVE_EXTENSIONS.slice(1)) candidates.push(`${base}/index${ext}`);
  for (const candidate of candidates) {
    if (trackedSet.has(candidate)) return candidate;
  }
  return null;
}

function stronglyConnectedComponents(graph) {
  let index = 0;
  const stack = [];
  const onStack = new Set();
  const indexes = new Map();
  const low = new Map();
  const components = [];

  function visit(node) {
    indexes.set(node, index);
    low.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of graph.get(node) || []) {
      if (!indexes.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node), low.get(next)));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node), indexes.get(next)));
      }
    }

    if (low.get(node) === indexes.get(node)) {
      const component = [];
      let current;
      do {
        current = stack.pop();
        onStack.delete(current);
        component.push(current);
      } while (current !== node);
      if (component.length > 1) components.push(component.sort());
    }
  }

  for (const node of graph.keys()) if (!indexes.has(node)) visit(node);
  return components.sort((a, b) => b.length - a.length);
}

const files = [];
const graph = new Map();
const unresolvedRelativeImports = [];
const frontendRoutes = new Set();
const backendRouteEntries = [];
const envKeys = new Set();
const migrationCandidates = [];

for (const file of trackedFiles) {
  const abs = path.join(ROOT, file);
  const stat = fs.statSync(abs);
  const text = isLikelyText(file) ? readText(file) : null;
  const ext = path.extname(file).toLowerCase();
  const category = classify(file);
  const loc = text === null ? 0 : lineCount(text);
  const domain = guessDomain(file);

  files.push({ file, category, domain, bytes: stat.size, lines: loc, sha256: text === null ? null : sha256(text) });

  const candidate = migrationCandidate(file);
  if (candidate) migrationCandidates.push({ source: file, ...candidate });

  if (text && SOURCE_EXTENSIONS.has(ext)) {
    const deps = [];
    for (const specifier of extractImportSpecifiers(text)) {
      if (!specifier.startsWith('.')) continue;
      const resolved = resolveRelativeImport(file, specifier);
      if (resolved) deps.push(resolved);
      else unresolvedRelativeImports.push({ file, specifier });
    }
    graph.set(file, [...new Set(deps)].sort());

    if (category === 'web-source' || file === 'App.tsx') {
      const routeRegex = /<Route\b[^>]*\bpath\s*=\s*["']([^"']+)["']/g;
      let match;
      while ((match = routeRegex.exec(text))) frontendRoutes.add(match[1]);
    }

    if (file.startsWith('server/src/routes/')) {
      const routeRegex = /\brouter\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g;
      let match;
      while ((match = routeRegex.exec(text))) {
        backendRouteEntries.push({ file, method: match[1].toUpperCase(), path: match[2] });
      }
    }

    const envPatterns = [
      /process\.env\.([A-Z][A-Z0-9_]*)/g,
      /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
      /\benv\.([A-Z][A-Z0-9_]*)/g,
    ];
    for (const regex of envPatterns) {
      let match;
      while ((match = regex.exec(text))) envKeys.add(match[1]);
    }
  }
}

const cycles = stronglyConnectedComponents(graph);
const sourceFiles = files.filter((item) => SOURCE_EXTENSIONS.has(path.extname(item.file).toLowerCase()));
const hotspots = [...sourceFiles]
  .filter((item) => item.lines >= 400)
  .sort((a, b) => b.lines - a.lines || b.bytes - a.bytes)
  .slice(0, 80);

const categoryStats = {};
for (const item of files) {
  categoryStats[item.category] ??= { files: 0, bytes: 0, lines: 0 };
  categoryStats[item.category].files += 1;
  categoryStats[item.category].bytes += item.bytes;
  categoryStats[item.category].lines += item.lines;
}

const domainStats = {};
for (const item of sourceFiles) {
  domainStats[item.domain] ??= { files: 0, lines: 0, bytes: 0 };
  domainStats[item.domain].files += 1;
  domainStats[item.domain].lines += item.lines;
  domainStats[item.domain].bytes += item.bytes;
}

const crossDomainEdges = [];
for (const [source, deps] of graph.entries()) {
  const sourceDomain = guessDomain(source);
  for (const target of deps) {
    const targetDomain = guessDomain(target);
    if (sourceDomain !== targetDomain) crossDomainEdges.push({ source, sourceDomain, target, targetDomain });
  }
}

const appSource = readText('server/src/app.ts') || '';
const apiMounts = [];
const mountRegex = /app\.use\(\s*["'`]([^"'`]+)["'`]\s*,\s*([A-Za-z0-9_]+)/g;
let mountMatch;
while ((mountMatch = mountRegex.exec(appSource))) apiMounts.push({ prefix: mountMatch[1], router: mountMatch[2] });

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString('utf8').trim(),
  summary: {
    trackedFiles: files.length,
    sourceFiles: sourceFiles.length,
    sourceLines: sourceFiles.reduce((sum, item) => sum + item.lines, 0),
    frontendRoutes: frontendRoutes.size,
    backendRouteEntries: backendRouteEntries.length,
    apiMounts: apiMounts.length,
    relativeImportEdges: [...graph.values()].reduce((sum, deps) => sum + deps.length, 0),
    unresolvedRelativeImports: unresolvedRelativeImports.length,
    dependencyCycles: cycles.length,
    crossDomainImportEdges: crossDomainEdges.length,
    hotspots400Lines: hotspots.length,
    migrationCandidates: migrationCandidates.length,
  },
  categoryStats,
  domainStats,
  hotspots,
  frontendRoutes: [...frontendRoutes].sort(),
  backendRouteEntries: backendRouteEntries.sort((a, b) => a.file.localeCompare(b.file) || a.path.localeCompare(b.path)),
  apiMounts: apiMounts.sort((a, b) => a.prefix.localeCompare(b.prefix)),
  envKeys: [...envKeys].sort(),
  unresolvedRelativeImports: unresolvedRelativeImports.sort((a, b) => a.file.localeCompare(b.file)),
  cycles,
  crossDomainEdges,
  migrationCandidates: migrationCandidates.sort((a, b) => a.source.localeCompare(b.source)),
  files,
};

const manifest = {
  schemaVersion: 1,
  generatedAt: report.generatedAt,
  gitHead: report.gitHead,
  frontendRoutes: report.frontendRoutes,
  backendRouteEntries: report.backendRouteEntries,
  apiMounts: report.apiMounts,
  envKeys: report.envKeys,
  routeSourceHashes: Object.fromEntries(
    files
      .filter((item) => item.file === 'App.tsx' || item.file === 'server/src/app.ts' || item.file.startsWith('server/src/routes/'))
      .map((item) => [item.file, item.sha256]),
  ),
};

const migrationMap = {
  schemaVersion: 1,
  generatedAt: report.generatedAt,
  sourceGitHead: report.gitHead,
  warning: 'Candidate ownership map only. review-required entries must not be moved automatically until domain ownership is approved by architecture checks.',
  entries: report.migrationCandidates,
};

fs.writeFileSync(path.join(OUT_DIR, 'CURRENT_REPOSITORY_AUDIT.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(OUT_DIR, 'BASELINE_CONTRACT_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(OUT_DIR, 'MIGRATION_MAP_V2_CANDIDATE.json'), `${JSON.stringify(migrationMap, null, 2)}\n`);

const topHotspots = hotspots.slice(0, 30);
const markdown = `# Current Repository Architecture Audit\n\nGenerated from commit \`${report.gitHead}\`.\n\n## Executive snapshot\n\n| Metric | Value |\n|---|---:|\n| Tracked files | ${report.summary.trackedFiles} |\n| Source files | ${report.summary.sourceFiles} |\n| Source lines | ${report.summary.sourceLines.toLocaleString('en-US')} |\n| Frontend route literals | ${report.summary.frontendRoutes} |\n| Backend router method entries | ${report.summary.backendRouteEntries} |\n| API mount points | ${report.summary.apiMounts} |\n| Relative import edges | ${report.summary.relativeImportEdges} |\n| Unresolved relative imports | ${report.summary.unresolvedRelativeImports} |\n| Dependency cycles | ${report.summary.dependencyCycles} |\n| Cross-domain import edges | ${report.summary.crossDomainImportEdges} |\n| Source hotspots >= 400 lines | ${report.summary.hotspots400Lines} |\n| Candidate migration-map entries | ${report.summary.migrationCandidates} |\n\n## Largest source hotspots\n\n| File | Lines | Bytes | Domain candidate |\n|---|---:|---:|---|\n${topHotspots.map((item) => `| \`${item.file}\` | ${item.lines} | ${item.bytes} | ${item.domain} |`).join('\n')}\n\n## Baseline safety evidence\n\n- \`BASELINE_CONTRACT_MANIFEST.json\` captures current frontend route literals, backend route entries, API mount points, environment-key usage, and hashes of route sources.\n- \`MIGRATION_MAP_V2_CANDIDATE.json\` is deliberately a **candidate** map; ambiguous ownership is marked for review and must not be treated as an automatic move instruction.\n- Unresolved imports and cycles are measured before migration so structural changes cannot silently make the graph worse.\n\n## Architectural interpretation\n\nThe target remains a modular monolith. The audit is intended to reduce file size, clarify domain ownership, and create enforceable boundaries without changing the product's URL/API contracts or database behavior during the structural phase.\n`;
fs.writeFileSync(path.join(OUT_DIR, 'CURRENT_REPOSITORY_AUDIT.md'), markdown);

console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.unresolvedRelativeImports > 0) {
  console.warn(`[repository-audit] baseline contains ${report.summary.unresolvedRelativeImports} unresolved relative import(s); inspect generated report before structural migration.`);
}
