import fs from 'node:fs';

const [auditPath = '', ...packageNames] = process.argv.slice(2);
if (!auditPath || packageNames.length === 0) {
  console.error('Usage: node tools/refactor/assert-audit-packages-clean.mjs <audit-json-path> <package> [package...]');
  process.exit(2);
}

let audit;
try {
  audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
} catch (error) {
  console.error(`Unable to parse npm audit JSON at ${auditPath}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

if (audit?.error) {
  console.error('npm audit returned an error instead of vulnerability data.');
  console.error(JSON.stringify(audit.error, null, 2));
  process.exit(2);
}

const vulnerabilities = audit?.vulnerabilities || {};
const remaining = packageNames.filter((name) => Boolean(vulnerabilities[name]));
const totals = audit?.metadata?.vulnerabilities || {};

console.log(JSON.stringify({
  checkedPackages: packageNames,
  remaining,
  totals,
}, null, 2));

if (remaining.length > 0) {
  console.error(`Targeted vulnerable packages remain in npm audit: ${remaining.join(', ')}`);
  process.exit(1);
}
