import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'architecture', 'generated');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const TEXT_EXTENSIONS = new Set([
  ...SOURCE_EXTENSIONS,
  '.json', '.md', '.yml', '.yaml', '.html', '.css', '.txt', '.env', '.example', '.toml', '.xml', '.svg',
]);
const CODE_RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const RUNTIME_GRAPH_CATEGORIES = new Set(['web-source', 'api-source', 'source-other']);
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);
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
  try {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
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
  return text ? text.split(/\r?\n/).length : 0;
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

function scriptKindFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.tsx') return ts.ScriptKind.TSX;
  if (ext === '.jsx') return ts.ScriptKind.JSX;
  if (['.js', '.mjs', '.cjs'].includes(ext)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function parseSource(file, text) {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKindFor(file));
}

function literalValue(node) {
  if (!node) return null;
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function extractImportSpecifiers(sourceFile) {
  const specs = new Set();
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      const value = literalValue(node.moduleSpecifier);
      if (value) specs.add(value);
    } else if (ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)
      && node.moduleReference.expression) {
      const value = literalValue(node.moduleReference.expression);
      if (value) specs.add(value);
    } else if (ts.isCallExpression(node)) {
      const first = node.arguments[0];
      const value = literalValue(first);
      if (value && node.expression.kind === ts.SyntaxKind.ImportKeyword) specs.add(value);
      if (value && ts.isIdentifier(node.expression) && node.expression.text === 'require') specs.add(value);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...specs];
}

function resolveRelativeImport(fromFile, rawSpecifier) {
  if (!rawSpecifier.startsWith('.')) return null;
  const specifier = rawSpecifier.split('?')[0].split('#')[0];
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  const candidates = new Set([base]);
  const ext = path.posix.extname(base).toLowerCase();
  const sourceAliasExt = ['.js', '.jsx', '.mjs', '.cjs'].includes(ext);
  const stem = sourceAliasExt ? base.slice(0, -ext.length) : base;

  if (!ext || sourceAliasExt) {
    for (const candidateExt of CODE_RESOLVE_EXTENSIONS) {
      candidates.add(`${stem}${candidateExt}`);
      candidates.add(`${stem}/index${candidateExt}`);
    }
  }

  for (const candidate of candidates) {
    if (trackedSet.has(candidate)) return candidate;
  }
  return null;
}

function receiverRootName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return receiverRootName(expression.expression);
  if (ts.isCallExpression(expression)) return receiverRootName(expression.expression);
  return null;
}

function routePathFromMethodCall(call) {
  if (!ts.isPropertyAccessExpression(call.expression)) return null;
  const method = call.expression.name.text;
  if (!HTTP_METHODS.has(method)) return null;
  const receiver = call.expression.expression;
  const root = receiverRootName(receiver);
  if (!root || !/router$/i.test(root)) return null;

  const direct = literalValue(call.arguments[0]);
  if (direct) return { method: method.toUpperCase(), path: direct, receiver: root };

  if (ts.isCallExpression(receiver)
    && ts.isPropertyAccessExpression(receiver.expression)
    && receiver.expression.name.text === 'route') {
    const chained = literalValue(receiver.arguments[0]);
    if (chained) return { method: method.toUpperCase(), path: chained, receiver: root };
  }
  return null;
}

function collectBackendRoutes(file, sourceFile) {
  const entries = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const route = routePathFromMethodCall(node);
      if (route) entries.push({ file, ...route });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return entries;
}

function collectRouterMounts(file, sourceFile) {
  const mounts = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'use') {
      const receiver = receiverRootName(node.expression.expression);
      const prefix = literalValue(node.arguments[0]);
      if (receiver && prefix && (receiver === 'app' || /router$/i.test(receiver))) {
        const mounted = node.arguments[1]?.getText(sourceFile) || '';
        mounts.push({ file, receiver, prefix, mounted });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return mounts;
}

function collectFrontendRoutes(sourceFile) {
  const routes = [];
  const visit = (node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(sourceFile);
      if (tag === 'Route' || tag.endsWith('.Route')) {
        for (const prop of node.attributes.properties) {
          if (!ts.isJsxAttribute(prop) || prop.name.getText(sourceFile) !== 'path') continue;
          if (prop.initializer && ts.isStringLiteral(prop.initializer)) routes.push(prop.initializer.text);
          else if (prop.initializer && ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
            const value = literalValue(prop.initializer.expression);
            if (value) routes.push(value);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return routes;
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
      if (!graph.has(next)) continue;
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
const nonRuntimeUnresolvedRelativeImports = [];
const frontendRoutes = new Set();
const backendRouteEntries = [];
const routerMounts = [];
const envKeys = new Set();
const migrationCandidates = [];

for (const file of trackedFiles) {
  const stat = fs.statSync(path.join(ROOT, file));
  const text = isLikelyText(file) ? readText(file) : null;
  const ext = path.extname(file).toLowerCase();
  const category = classify(file);
  const loc = text === null ? 0 : lineCount(text);
  const domain = guessDomain(file);

  files.push({ file, category, domain, bytes: stat.size, lines: loc, sha256: text === null ? null : sha256(text) });

  const candidate = migrationCandidate(file);
  if (candidate) migrationCandidates.push({ source: file, ...candidate });

  if (!text || !SOURCE_EXTENSIONS.has(ext)) continue;
  const sourceFile = parseSource(file, text);
  const deps = [];
  for (const specifier of extractImportSpecifiers(sourceFile)) {
    if (!specifier.startsWith('.')) continue;
    const resolved = resolveRelativeImport(file, specifier);
    if (resolved) deps.push(resolved);
    else {
      const item = { file, specifier };
      if (RUNTIME_GRAPH_CATEGORIES.has(category)) unresolvedRelativeImports.push(item);
      else nonRuntimeUnresolvedRelativeImports.push(item);
    }
  }

  if (RUNTIME_GRAPH_CATEGORIES.has(category)) graph.set(file, [...new Set(deps)].sort());

  if (category === 'web-source') {
    for (const route of collectFrontendRoutes(sourceFile)) frontendRoutes.add(route);
  }

  if (file.startsWith('server/src/routes/')) {
    backendRouteEntries.push(...collectBackendRoutes(file, sourceFile));
  }

  if (file === 'server/src/app.ts' || file === 'server/src/routes/index.ts') {
    routerMounts.push(...collectRouterMounts(file, sourceFile));
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

const cycles = stronglyConnectedComponents(graph);
const sourceFiles = files.filter((item) => SOURCE_EXTENSIONS.has(path.extname(item.file).toLowerCase()));
const runtimeSourceFiles = files.filter((item) => RUNTIME_GRAPH_CATEGORIES.has(item.category));
const allHotspots = [...runtimeSourceFiles]
  .filter((item) => item.lines >= 400)
  .sort((a, b) => b.lines - a.lines || b.bytes - a.bytes);

const categoryStats = {};
for (const item of files) {
  categoryStats[item.category] ??= { files: 0, bytes: 0, lines: 0 };
  categoryStats[item.category].files += 1;
  categoryStats[item.category].bytes += item.bytes;
  categoryStats[item.category].lines += item.lines;
}

const domainStats = {};
for (const item of runtimeSourceFiles) {
  domainStats[item.domain] ??= { files: 0, lines: 0, bytes: 0 };
  domainStats[item.domain].files += 1;
  domainStats[item.domain].lines += item.lines;
  domainStats[item.domain].bytes += item.bytes;
}

const crossDomainEdges = [];
for (const [source, deps] of graph.entries()) {
  const sourceDomain = guessDomain(source);
  for (const target of deps) {
    if (!graph.has(target)) continue;
    const targetDomain = guessDomain(target);
    if (sourceDomain !== targetDomain) crossDomainEdges.push({ source, sourceDomain, target, targetDomain });
  }
}

backendRouteEntries.sort((a, b) => a.file.localeCompare(b.file) || a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
routerMounts.sort((a, b) => a.file.localeCompare(b.file) || a.prefix.localeCompare(b.prefix));
unresolvedRelativeImports.sort((a, b) => a.file.localeCompare(b.file) || a.specifier.localeCompare(b.specifier));
nonRuntimeUnresolvedRelativeImports.sort((a, b) => a.file.localeCompare(b.file) || a.specifier.localeCompare(b.specifier));

const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString('utf8').trim(),
  summary: {
    trackedFiles: files.length,
    sourceFiles: sourceFiles.length,
    runtimeSourceFiles: runtimeSourceFiles.length,
    sourceLines: sourceFiles.reduce((sum, item) => sum + item.lines, 0),
    runtimeSourceLines: runtimeSourceFiles.reduce((sum, item) => sum + item.lines, 0),
    frontendRoutes: frontendRoutes.size,
    backendRouteEntries: backendRouteEntries.length,
    routerMounts: routerMounts.length,
    runtimeRelativeImportEdges: [...graph.values()].reduce((sum, deps) => sum + deps.length, 0),
    unresolvedRuntimeRelativeImports: unresolvedRelativeImports.length,
    unresolvedNonRuntimeRelativeImports: nonRuntimeUnresolvedRelativeImports.length,
    dependencyCycles: cycles.length,
    crossDomainImportEdges: crossDomainEdges.length,
    hotspots400Lines: allHotspots.length,
    migrationCandidates: migrationCandidates.length,
  },
  categoryStats,
  domainStats,
  hotspots: allHotspots,
  frontendRoutes: [...frontendRoutes].sort(),
  backendRouteEntries,
  routerMounts,
  envKeys: [...envKeys].sort(),
  unresolvedRelativeImports,
  nonRuntimeUnresolvedRelativeImports,
  cycles,
  crossDomainEdges,
  migrationCandidates: migrationCandidates.sort((a, b) => a.source.localeCompare(b.source)),
  files,
};

const routeFiles = files.filter((item) => item.file === 'App.tsx' || item.file === 'server/src/app.ts' || item.file === 'server/src/routes/index.ts' || item.file.startsWith('server/src/routes/'));
const manifest = {
  schemaVersion: 2,
  generatedAt: report.generatedAt,
  gitHead: report.gitHead,
  frontendRoutes: report.frontendRoutes,
  backendRouteEntries: report.backendRouteEntries,
  routerMounts: report.routerMounts,
  envKeys: report.envKeys,
  routeSourceHashes: Object.fromEntries(routeFiles.map((item) => [item.file, item.sha256])),
};

const migrationMap = {
  schemaVersion: 2,
  generatedAt: report.generatedAt,
  sourceGitHead: report.gitHead,
  warning: 'Candidate ownership map only. review-required entries must not be moved automatically until domain ownership is approved by architecture checks.',
  entries: report.migrationCandidates,
};

fs.writeFileSync(path.join(OUT_DIR, 'CURRENT_REPOSITORY_AUDIT.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(OUT_DIR, 'BASELINE_CONTRACT_MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(OUT_DIR, 'MIGRATION_MAP_V2_CANDIDATE.json'), `${JSON.stringify(migrationMap, null, 2)}\n`);

const topHotspots = allHotspots.slice(0, 35);
const markdown = `# Current Repository Architecture Audit\n\nGenerated from commit \`${report.gitHead}\` using the TypeScript AST for imports and route extraction.\n\n## Executive snapshot\n\n| Metric | Value |\n|---|---:|\n| Tracked files | ${report.summary.trackedFiles} |\n| Source files (including scripts/tooling) | ${report.summary.sourceFiles} |\n| Runtime source files | ${report.summary.runtimeSourceFiles} |\n| Source lines | ${report.summary.sourceLines.toLocaleString('en-US')} |\n| Runtime source lines | ${report.summary.runtimeSourceLines.toLocaleString('en-US')} |\n| Frontend route literals | ${report.summary.frontendRoutes} |\n| Backend HTTP route entries | ${report.summary.backendRouteEntries} |\n| Router mount points | ${report.summary.routerMounts} |\n| Runtime relative import edges | ${report.summary.runtimeRelativeImportEdges} |\n| Unresolved runtime relative imports | ${report.summary.unresolvedRuntimeRelativeImports} |\n| Unresolved non-runtime relative imports | ${report.summary.unresolvedNonRuntimeRelativeImports} |\n| Runtime dependency cycles | ${report.summary.dependencyCycles} |\n| Cross-domain runtime import edges | ${report.summary.crossDomainImportEdges} |\n| Runtime hotspots >= 400 lines | ${report.summary.hotspots400Lines} |\n| Candidate migration-map entries | ${report.summary.migrationCandidates} |\n\n## Largest runtime source hotspots\n\n| File | Lines | Bytes | Domain candidate |\n|---|---:|---:|---|\n${topHotspots.map((item) => `| \`${item.file}\` | ${item.lines} | ${item.bytes} | ${item.domain} |`).join('\n')}\n\n## Baseline safety evidence\n\n- \`BASELINE_CONTRACT_MANIFEST.json\` captures current frontend route literals, backend HTTP route entries, router mount points, environment-key usage, and hashes of route sources.\n- \`MIGRATION_MAP_V2_CANDIDATE.json\` is deliberately a **candidate** map; ambiguous ownership is marked for review and must not be treated as an automatic move instruction.\n- Runtime imports are parsed with the TypeScript compiler AST and Node/TypeScript ESM \`.js\` specifiers are resolved back to tracked TypeScript source files.\n- Cycles and cross-domain edges are measured only on runtime source, so test/audit scripts do not pollute architecture gates.\n\n## Architectural interpretation\n\nThe target remains a modular monolith. The audit is intended to reduce file size, clarify domain ownership, and create enforceable boundaries without changing the product's URL/API contracts or database behavior during the structural phase.\n`;
fs.writeFileSync(path.join(OUT_DIR, 'CURRENT_REPOSITORY_AUDIT.md'), markdown);

console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.unresolvedRuntimeRelativeImports > 0) {
  console.warn(`[repository-audit] baseline contains ${report.summary.unresolvedRuntimeRelativeImports} unresolved runtime relative import(s); inspect generated report before structural migration.`);
}
