import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'architecture', 'generated');
fs.mkdirSync(OUT_DIR, { recursive: true });

const COUPLED_TARGET = /(?:^|\.\.\/)(App\.tsx|index\.tsx|types\.ts|components\/|contexts\/|dashboards\/|pages\/|services\/|store\/|utils\/|hooks\/|styles\/)/;
const SCRIPT_EXT = /\.(?:mjs|cjs|js|ts)$/i;

const files = execFileSync('git', ['ls-files', '-z', 'scripts', 'tools'], { cwd: ROOT })
  .toString('utf8')
  .split('\0')
  .filter((file) => file && SCRIPT_EXT.test(file));

function literalValue(node) {
  if (!node) return null;
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function isImportMetaUrl(node) {
  return ts.isPropertyAccessExpression(node)
    && node.name.text === 'url'
    && ts.isMetaProperty(node.expression)
    && node.expression.keywordToken === ts.SyntaxKind.ImportKeyword;
}

const coupled = [];
const missingNewUrlTargets = [];
const allRelativeNewUrlTargets = [];

for (const file of files) {
  const abs = path.join(ROOT, file);
  const source = fs.readFileSync(abs, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const localCouplings = [];

  const visit = (node) => {
    if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const value = node.text;
      if (COUPLED_TARGET.test(value)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        localCouplings.push({ value, line: line + 1 });
      }
    }

    if (ts.isNewExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'URL'
      && node.arguments?.length >= 2
      && isImportMetaUrl(node.arguments[1])) {
      const value = literalValue(node.arguments[0]);
      if (value && value.startsWith('.') && !value.includes('${')) {
        const resolved = path.resolve(path.dirname(abs), value.split('?')[0].split('#')[0]);
        const exists = fs.existsSync(resolved);
        const item = {
          file,
          value,
          resolved: path.relative(ROOT, resolved).split(path.sep).join('/'),
          exists,
        };
        allRelativeNewUrlTargets.push(item);
        if (!exists) missingNewUrlTargets.push(item);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  if (localCouplings.length) coupled.push({ file, references: localCouplings });
}

const summary = {
  scannedScriptFiles: files.length,
  sourceCoupledScripts: coupled.length,
  sourceCoupledReferences: coupled.reduce((sum, item) => sum + item.references.length, 0),
  relativeNewUrlTargets: allRelativeNewUrlTargets.length,
  missingRelativeNewUrlTargets: missingNewUrlTargets.length,
};

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  summary,
  sourceCoupledScripts: coupled,
  missingRelativeNewUrlTargets,
};

fs.writeFileSync(path.join(OUT_DIR, 'SOURCE_REFERENCE_AUDIT.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(
  path.join(OUT_DIR, 'SOURCE_REFERENCE_AUDIT.md'),
  `# Source Reference Audit\n\n| Metric | Value |\n|---|---:|\n| Scripts/tool files scanned | ${summary.scannedScriptFiles} |\n| Scripts coupled to current frontend source paths | ${summary.sourceCoupledScripts} |\n| Coupled source-path string references | ${summary.sourceCoupledReferences} |\n| Relative \`new URL(..., import.meta.url)\` targets checked | ${summary.relativeNewUrlTargets} |\n| Missing relative URL targets | ${summary.missingRelativeNewUrlTargets} |\n\n## Why this matters\n\nMany existing smoke/audit scripts validate source text directly. Runtime source cannot be moved safely until these path-coupled checks are either updated atomically or made path-independent. This audit makes that hidden refactor cost visible before any file move.\n\n## Coupled scripts\n\n${coupled.map((item) => `- \`${item.file}\` — ${item.references.length} reference(s)`).join('\n') || '- None'}\n\n## Missing relative targets\n\n${missingNewUrlTargets.map((item) => `- \`${item.file}\` -> \`${item.value}\` (resolved: \`${item.resolved}\`)`).join('\n') || '- None'}\n`,
);

console.log(JSON.stringify(summary, null, 2));
