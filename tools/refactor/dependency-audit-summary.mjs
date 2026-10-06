import fs from 'node:fs';

const [label = 'audit', auditPath = ''] = process.argv.slice(2);
if (!auditPath) {
  console.error('Usage: node tools/refactor/dependency-audit-summary.mjs <label> <audit-json-path>');
  process.exit(2);
}

let audit;
try {
  audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
} catch (error) {
  console.error(`[dependency-audit] ${label}: unable to parse ${auditPath}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

if (audit?.error) {
  console.error(`[dependency-audit] ${label}: npm audit returned an audit error`);
  console.error(JSON.stringify(audit.error, null, 2));
  process.exit(2);
}

const metadata = audit?.metadata?.vulnerabilities || {};
const vulnerabilities = Object.entries(audit?.vulnerabilities || {})
  .map(([name, value]) => {
    const item = value || {};
    const via = Array.isArray(item.via)
      ? item.via.map((entry) => {
          if (typeof entry === 'string') return { dependency: entry };
          return {
            source: entry?.source ?? null,
            name: entry?.name ?? null,
            title: entry?.title ?? null,
            url: entry?.url ?? null,
            severity: entry?.severity ?? null,
            range: entry?.range ?? null,
          };
        })
      : [];

    return {
      name,
      severity: item.severity || 'unknown',
      isDirect: Boolean(item.isDirect),
      range: item.range || '',
      nodes: Array.isArray(item.nodes) ? item.nodes : [],
      effects: Array.isArray(item.effects) ? item.effects : [],
      fixAvailable: item.fixAvailable ?? false,
      via,
    };
  })
  .sort((a, b) => {
    const rank = { critical: 5, high: 4, moderate: 3, low: 2, info: 1, unknown: 0 };
    return (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0) || a.name.localeCompare(b.name);
  });

const summary = {
  label,
  totals: {
    info: Number(metadata.info || 0),
    low: Number(metadata.low || 0),
    moderate: Number(metadata.moderate || 0),
    high: Number(metadata.high || 0),
    critical: Number(metadata.critical || 0),
    total: Number(metadata.total || 0),
  },
  vulnerablePackages: vulnerabilities.length,
  directVulnerablePackages: vulnerabilities.filter((item) => item.isDirect).map((item) => item.name),
  vulnerabilities,
};

console.log(`\n===== DEPENDENCY AUDIT: ${label} =====`);
console.log(JSON.stringify(summary, null, 2));
console.log(`===== END DEPENDENCY AUDIT: ${label} =====\n`);
