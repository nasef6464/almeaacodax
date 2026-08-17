import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const baselineContractsPath = path.join(ROOT, 'docs', 'architecture', 'baseline', 'CONTRACTS_PRE_STRUCTURAL.json');
const baselineAuditPath = path.join(ROOT, 'docs', 'architecture', 'baseline', 'REPOSITORY_PRE_STRUCTURAL.json');
const progressiveBudgetPath = path.join(ROOT, 'docs', 'architecture', 'ARCHITECTURE_BUDGET.json');
const currentAuditPath = path.join(ROOT, 'docs', 'architecture', 'generated', 'CURRENT_REPOSITORY_AUDIT.json');

for (const file of [baselineContractsPath, baselineAuditPath, progressiveBudgetPath, currentAuditPath]) {
  if (!fs.existsSync(file)) {
    throw new Error(`[architecture-gate] required evidence file is missing: ${path.relative(ROOT, file)}`);
  }
}

const baselineContracts = JSON.parse(fs.readFileSync(baselineContractsPath, 'utf8'));
const baselineAudit = JSON.parse(fs.readFileSync(baselineAuditPath, 'utf8'));
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

const routeSignature = (entry) => `${entry.receiver}|${entry.method}|${entry.path}`;
const mountSignature = (entry) => `${entry.receiver}|${entry.prefix}|${entry.mounted}`;

requireExact(
  'frontend route literals changed during structural refactor',
  baselineContracts.frontendRoutes || [],
  currentAudit.frontendRoutes || [],
);

requireExact(
  'backend HTTP route contract changed during structural refactor',
  (baselineContracts.backendRouteEntries || []).map(routeSignature),
  (currentAudit.backendRouteEntries || []).map(routeSignature),
);

requireExact(
  'router mount contract changed during structural refactor',
  (baselineContracts.routerMounts || []).map(mountSignature),
  (currentAudit.routerMounts || []).map(mountSignature),
);

requireExact(
  'runtime environment-key contract changed during structural refactor',
  baselineContracts.envKeys || [],
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
const currentHotspots = currentAudit.summary?.hotspots400Lines ?? Number.MAX_SAFE_INTEGER;
if (currentHotspots > hotspotsLimit) {
  failures.push({
    label: 'runtime >=400-line hotspot budget exceeded',
    immutableBaseline: baselineHotspots,
    progressiveLimit: hotspotsLimit,
    current: currentHotspots,
    hotspots: (currentAudit.hotspots || []).slice(0, 20),
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
  envKeys: currentAudit.envKeys?.length || 0,
  unresolvedRuntimeRelativeImports: currentUnresolved,
  unresolvedRuntimeRelativeImportsLimit: unresolvedLimit,
  dependencyCycles: currentCycles,
  dependencyCyclesLimit: cyclesLimit,
  hotspots400Lines: currentHotspots,
  hotspots400LinesLimit: hotspotsLimit,
}, null, 2));
