import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const baselineContractsPath = path.join(ROOT, 'docs', 'architecture', 'baseline', 'CONTRACTS_PRE_STRUCTURAL.json');
const baselineAuditPath = path.join(ROOT, 'docs', 'architecture', 'baseline', 'REPOSITORY_PRE_STRUCTURAL.json');
const approvedExtensionsPath = path.join(ROOT, 'docs', 'architecture', 'APPROVED_CONTRACT_EXTENSIONS.json');
const approvedMigrationsPath = path.join(ROOT, 'docs', 'architecture', 'APPROVED_CONTRACT_MIGRATIONS.json');
const progressiveBudgetPath = path.join(ROOT, 'docs', 'architecture', 'ARCHITECTURE_BUDGET.json');
const currentAuditPath = path.join(ROOT, 'docs', 'architecture', 'generated', 'CURRENT_REPOSITORY_AUDIT.json');

for (const file of [baselineContractsPath, baselineAuditPath, approvedExtensionsPath, approvedMigrationsPath, progressiveBudgetPath, currentAuditPath]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[architecture-gate] required evidence file is missing: ${path.relative(ROOT, file)}`);
  }
}

const baselineContracts = JSON.parse(fs.readFileSync(baselineContractsPath, 'utf8'));
const baselineAudit = JSON.parse(fs.readFileSync(baselineAuditPath, 'utf8'));
const approvedExtensions = JSON.parse(fs.readFileSync(approvedExtensionsPath, 'utf8'));
const approvedMigrations = JSON.parse(fs.readFileSync(approvedMigrationsPath, 'utf8'));
const progressiveBudget = JSON.parse(fs.readFileSync(progressiveBudgetPath, 'utf8'));
const currentAudit = JSON.parse(fs.readFileSync(currentAuditPath, 'utf8'));
const failures = [];

function multiset(values) {
  const out = new Map();
  for (const value of values) out.set(value, (out.get(value) || 0) + 1);
  return out;
}

function diffMultisets(expectedValues, actualValues) {
  const expected = multiset(expectedValues);
  const actual = multiset(actualValues);
  const missing = [];
  const added = [];
  for (const [value, count] of expected) {
    const delta = count - (actual.get(value) || 0);
    for (let i = 0; i < delta; i += 1) missing.push(value);
  }
  for (const [value, count] of actual) {
    const delta = count - (expected.get(value) || 0);
    for (let i = 0; i < delta; i += 1) added.push(value);
  }
  return { missing, added };
}

function requireExact(label, expectedValues, actualValues) {
  const { missing, added } = diffMultisets(expectedValues, actualValues);
  if (missing.length || added.length) {
    failures.push({ label, missing: missing.slice(0, 30), added: added.slice(0, 30), missingCount: missing.length, addedCount: added.length });
  }
}

function finiteBudget(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function applyReviewedReplacements(values, replacements, label) {
  const next = [...values];
  const seenFrom = new Set();
  const seenTo = new Set();
  for (const replacement of replacements) {
    const from = replacement?.from;
    const to = replacement?.to;
    const reason = replacement?.reason;
    if (!from || !to || !reason || from === to || seenFrom.has(from) || seenTo.has(to)) {
      failures.push({ label: `${label} contains an invalid replacement`, replacement });
      continue;
    }
    seenFrom.add(from);
    seenTo.add(to);
    const index = next.indexOf(from);
    if (index < 0) {
      failures.push({ label: `${label} references a signature outside the immutable baseline`, replacement });
      continue;
    }
    next[index] = to;
  }
  return next;
}

const routeSignature = (entry) => `${entry.receiver}|${entry.method}|${entry.path}`;
const mountSignature = (entry) => `${entry.receiver}|${entry.prefix}|${entry.mounted}`;
const approvedFrontendRoutes = approvedExtensions.frontendRoutes || [];
const approvedBackendRouteSignatures = approvedExtensions.backendRouteSignatures || [];
const approvedRouterMountSignatures = approvedExtensions.routerMountSignatures || [];
const approvedEnvKeys = approvedExtensions.envKeys || [];
const approvedBackendRouteReplacements = approvedMigrations.backendRouteSignatureReplacements || [];

requireExact(
  'frontend route literals changed outside the immutable baseline and approved product extensions',
  [...(baselineContracts.frontendRoutes || []), ...approvedFrontendRoutes],
  currentAudit.frontendRoutes || [],
);

const migratedBaselineBackendRoutes = applyReviewedReplacements(
  (baselineContracts.backendRouteEntries || []).map(routeSignature),
  approvedBackendRouteReplacements,
  'approved backend route ownership migrations',
);
requireExact(
  'backend HTTP route contract changed outside the immutable baseline, reviewed ownership migrations, and approved product extensions',
  [...migratedBaselineBackendRoutes, ...approvedBackendRouteSignatures],
  (currentAudit.backendRouteEntries || []).map(routeSignature),
);

requireExact(
  'router mount contract changed outside the immutable baseline and approved product extensions',
  [
    ...(baselineContracts.routerMounts || []).map(mountSignature),
    ...approvedRouterMountSignatures,
  ],
  (currentAudit.routerMounts || []).map(mountSignature),
);

requireExact(
  'runtime environment-key contract changed outside the immutable baseline and approved product extensions',
  [...(baselineContracts.envKeys || []), ...approvedEnvKeys],
  currentAudit.envKeys || [],
);

const baselineUnresolved = baselineAudit.summary?.unresolvedRuntimeRelativeImports ?? Number.MAX_SAFE_INTEGER;
const unresolvedBudget = finiteBudget(progressiveBudget.maxUnresolvedRuntimeRelativeImports, baselineUnresolved);
const unresolvedLimit = Math.min(baselineUnresolved, unresolvedBudget);
const currentUnresolved = currentAudit.summary?.unresolvedRuntimeRelativeImports ?? Number.MAX_SAFE_INTEGER;
if (currentUnresolved > unresolvedLimit) {
  failures.push({
    label: 'unresolved runtime relative import budget exceeded',
    immutableBaseline: baselineUnresolved,
    progressiveLimit: unresolvedLimit,
    current: currentUnresolved,
    samples: (currentAudit.unresolvedRelativeImports || []).slice(0, 30),
  });
}

const baselineCycles = baselineAudit.summary?.dependencyCycles ?? Number.MAX_SAFE_INTEGER;
const cyclesBudget = finiteBudget(progressiveBudget.maxDependencyCycles, baselineCycles);
const cyclesLimit = Math.min(baselineCycles, cyclesBudget);
const currentCycles = currentAudit.summary?.dependencyCycles ?? Number.MAX_SAFE_INTEGER;
if (currentCycles > cyclesLimit) {
  failures.push({
    label: 'runtime dependency cycle budget exceeded',
    immutableBaseline: baselineCycles,
    progressiveLimit: cyclesLimit,
    current: currentCycles,
    cycles: (currentAudit.cycles || []).slice(0, 10),
  });
}

const baselineHotspots = baselineAudit.summary?.hotspots400Lines ?? Number.MAX_SAFE_INTEGER;
const hotspotsBudget = finiteBudget(progressiveBudget.maxHotspots400Lines, baselineHotspots);
const hotspotsLimit = Math.min(baselineHotspots, hotspotsBudget);
const testFilePattern = /(?:^|\/)[^/]+\.(?:e2e|test|spec)\.[cm]?[jt]sx?$/i;
const ciEvidenceFiles = new Set(['server/src/scripts/backendIntegrationGate.ts']);
const runtimeHotspots = (currentAudit.hotspots || []).filter((entry) => {
  const file = entry.file || '';
  return !testFilePattern.test(file) && !ciEvidenceFiles.has(file);
});
const currentHotspots = runtimeHotspots.length;
if (currentHotspots > hotspotsLimit) {
  failures.push({
    label: 'runtime >=400-line hotspot budget exceeded',
    immutableBaseline: baselineHotspots,
    progressiveLimit: hotspotsLimit,
    current: currentHotspots,
    hotspots: runtimeHotspots.slice(0, 20),
  });
}

if (failures.length > 0) {
  console.error('[architecture-gate] FAILED');
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log('[architecture-gate] PASS');
console.log(JSON.stringify({
  frontendRoutes: currentAudit.frontendRoutes?.length || 0,
  backendRouteEntries: currentAudit.backendRouteEntries?.length || 0,
  routerMounts: currentAudit.routerMounts?.length || 0,
  envKeys: currentAudit.envKeys || [],
  approvedContractExtensions: {
    frontendRoutes: approvedFrontendRoutes.length,
    backendRouteEntries: approvedBackendRouteSignatures.length,
    routerMounts: approvedRouterMountSignatures.length,
    envKeys: approvedEnvKeys.length,
  },
  approvedContractMigrations: {
    backendRouteOwnershipReplacements: approvedBackendRouteReplacements.length,
  },
  unresolvedRuntimeRelativeImports: currentUnresolved,
  unresolvedRuntimeRelativeImportsLimit: unresolvedLimit,
  dependencyCycles: currentCycles,
  dependencyCyclesLimit: cyclesLimit,
  hotspots400Lines: currentHotspots,
  hotspots400LinesLimit: hotspotsLimit,
}, null, 2));
