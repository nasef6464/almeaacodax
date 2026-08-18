import { spawnSync } from 'node:child_process';

const applyCardProjection = spawnSync('node', ['tools/refactor/apply-school-card-readiness-projection.mjs'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});
if (applyCardProjection.status !== 0) {
    console.error('[school-portfolio-projection-phase-review] Failed to apply school card readiness projection');
    process.exit(applyCardProjection.status ?? 1);
}

const applyPortfolioCardPresentation = spawnSync('node', ['tools/refactor/apply-school-portfolio-card-presentation.mjs'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});
if (applyPortfolioCardPresentation.status !== 0) {
    console.error('[school-portfolio-projection-phase-review] Failed to apply school portfolio card presentation extraction');
    process.exit(applyPortfolioCardPresentation.status ?? 1);
}

const applyWorkspaceControlsPresentation = spawnSync('node', ['tools/refactor/apply-school-workspace-controls-presentation.mjs'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});
if (applyWorkspaceControlsPresentation.status !== 0) {
    console.error('[school-portfolio-projection-phase-review] Failed to apply school workspace controls presentation extraction');
    process.exit(applyWorkspaceControlsPresentation.status ?? 1);
}

const checks = [
    ['git diff whitespace validation', 'git', ['diff', '--check']],
    ['frontend typecheck', 'npm', ['run', 'typecheck']],
    ['API typecheck', 'npm', ['run', 'server:check']],
    ['frontend production build', 'npm', ['run', 'build']],
    ['API production build', 'npm', ['run', 'server:build']],
    ['architecture contract', 'node', ['tools/refactor/architecture-gate.mjs']],
    ['module boundary contract', 'node', ['tools/refactor/module-boundary-gate.mjs']],
    ['school portfolio projection boundary', 'node', ['scripts/smoke-schools-portfolio-projection-boundary-contract.mjs']],
    ['school card readiness projection boundary', 'node', ['scripts/smoke-schools-card-readiness-projection-boundary-contract.mjs']],
    ['school portfolio card presentation boundary', 'node', ['scripts/smoke-schools-portfolio-card-boundary-contract.mjs']],
    ['school workspace controls presentation boundary', 'node', ['scripts/smoke-schools-workspace-controls-boundary-contract.mjs']],
    ['school readiness view-model contract', 'node', ['scripts/smoke-schools-readiness-viewmodel-contract.mjs']],
    ['school portfolio filter presentation contract', 'node', ['scripts/smoke-schools-portfolio-filter-boundary-contract.mjs']],
    ['school management contract', 'node', ['scripts/smoke-school-management-contract.mjs']],
    ['school XLSX safety contract', 'node', ['scripts/smoke-xlsx-safety-contract.mjs']],
    ['frontend performance contract', 'npm', ['run', 'smoke:performance']],
    ['route loading contract', 'npm', ['run', 'smoke:route-loading']],
    ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
];

const results = [];
for (const [name, command, args] of checks) {
    const startedAt = Date.now();
    console.log(`\n[school-portfolio-projection-phase-review] START ${name}`);
    const result = spawnSync(command, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });
    const durationMs = Date.now() - startedAt;
    results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', durationMs });
    if (result.status !== 0) {
        console.error(`\n[school-portfolio-projection-phase-review] FAIL ${name}`);
        console.error(JSON.stringify(results, null, 2));
        process.exit(result.status ?? 1);
    }
}

const stageVerifiedFiles = spawnSync('git', [
    'add',
    'dashboards/admin/SchoolsManager.tsx',
    'scripts/smoke-school-management-contract.mjs',
], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});
if (stageVerifiedFiles.status !== 0) {
    console.error('[school-portfolio-projection-phase-review] Failed to stage verified school projection changes');
    process.exit(stageVerifiedFiles.status ?? 1);
}

console.log('\n[school-portfolio-projection-phase-review] ALL CHECKS PASS');
console.log(JSON.stringify(results, null, 2));
