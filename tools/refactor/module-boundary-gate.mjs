import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const trackedFiles = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT })
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
  .map((file) => file.split(path.sep).join('/'));
const trackedSet = new Set(trackedFiles);
const failures = [];

function sourceKind(file) {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function getImportSpecifiers(file, source) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, sourceKind(file));
  const specifiers = [];

  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };

  visit(parsed);
  return specifiers;
}

function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;

  const fromDir = path.posix.dirname(fromFile);
  const rawTarget = path.posix.normalize(path.posix.join(fromDir, specifier));
  const ext = path.posix.extname(rawTarget);
  const candidates = [];

  if (ext) {
    candidates.push(rawTarget);
    if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
      const stem = rawTarget.slice(0, -ext.length);
      candidates.push(`${stem}.ts`, `${stem}.tsx`, `${stem}.js`, `${stem}.jsx`, `${stem}.mjs`, `${stem}.cjs`);
    }
  } else {
    candidates.push(rawTarget);
    for (const sourceExt of SOURCE_EXTENSIONS) candidates.push(`${rawTarget}${sourceExt}`);
    for (const sourceExt of SOURCE_EXTENSIONS) candidates.push(`${rawTarget}/index${sourceExt}`);
  }

  return candidates.find((candidate) => trackedSet.has(candidate)) || null;
}

function isGovernedNewStructure(file) {
  return (
    file.startsWith('server/src/modules/') ||
    file.startsWith('server/src/app/') ||
    file.startsWith('src/app/') ||
    file.startsWith('src/core/') ||
    file.startsWith('src/features/') ||
    file.startsWith('src/shared/')
  );
}

for (const file of trackedFiles) {
  if (!SOURCE_EXTENSIONS.includes(path.posix.extname(file))) continue;

  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const lineCount = source.split(/\r?\n/).length;

  if (isGovernedNewStructure(file) && lineCount > 700) {
    failures.push({
      rule: 'new-structure-file-size',
      file,
      lines: lineCount,
      limit: 700,
      message: 'New modularized source files must be decomposed before they become new god files.',
    });
  }

  const specifiers = getImportSpecifiers(file, source);
  for (const specifier of specifiers) {
    const target = resolveRelativeImport(file, specifier);
    if (!target) continue;

    if (file.startsWith('server/src/modules/') && (target.startsWith('server/src/routes/') || target === 'server/src/server.ts' || target.startsWith('server/src/app/'))) {
      failures.push({
        rule: 'backend-module-must-not-depend-on-composition',
        file,
        specifier,
        target,
      });
    }

    const domainMatch = file.match(/^server\/src\/modules\/([^/]+)\/domain\//);
    if (domainMatch) {
      const domain = domainMatch[1];
      const allowedDomainPrefix = `server/src/modules/${domain}/domain/`;
      const allowedShared = target.startsWith('server/src/shared/') || target.startsWith('server/src/constants/');
      const isServerTarget = target.startsWith('server/src/');
      if (isServerTarget && !target.startsWith(allowedDomainPrefix) && !allowedShared) {
        failures.push({
          rule: 'backend-domain-layer-isolation',
          file,
          specifier,
          target,
          message: 'Domain code may depend only on its own domain layer plus shared/constants contracts.',
        });
      }
    }

    if (file.startsWith('dashboards/admin/SchoolsManager/') && target === 'dashboards/admin/SchoolsManager.tsx') {
      failures.push({
        rule: 'schools-child-must-not-import-parent-manager',
        file,
        specifier,
        target,
      });
    }
  }
}

if (failures.length > 0) {
  console.error('[module-boundary-gate] FAILED');
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log('[module-boundary-gate] PASS');
console.log(JSON.stringify({
  governedPrefixes: [
    'server/src/modules/',
    'server/src/app/',
    'src/app/',
    'src/core/',
    'src/features/',
    'src/shared/',
  ],
  hardFileSizeLimit: 700,
  backendDomainIsolation: true,
  backendModuleCompositionDependencyBan: true,
  schoolsChildToParentBan: true,
}, null, 2));
