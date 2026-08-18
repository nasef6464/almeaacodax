import { spawnSync } from 'node:child_process';

const profile = process.argv[2] || 'schools';

const sharedArchitectureChecks = [
  ['architecture contract', 'node', ['tools/refactor/architecture-gate.mjs']],
  ['module boundary contract', 'node', ['tools/refactor/module-boundary-gate.mjs']],
];

const profiles = {
  schools: [
    ['frontend typecheck', 'npm', ['run', 'typecheck']],
    ['school management contract', 'npm', ['run', 'smoke:school-management']],
    ['school import parser contract', 'npm', ['run', 'smoke:schools-import-parsing']],
    ['school XLSX safety contract', 'npm', ['run', 'smoke:xlsx-safety']],
    ['frontend performance contract', 'npm', ['run', 'smoke:performance']],
    ...sharedArchitectureChecks,
  ],
  frontend: [
    ['frontend typecheck', 'npm', ['run', 'typecheck']],
    ['route loading contract', 'npm', ['run', 'smoke:route-loading']],
    ['frontend performance contract', 'npm', ['run', 'smoke:performance']],
    ...sharedArchitectureChecks,
  ],
  api: [
    ['API typecheck', 'npm', ['run', 'server:check']],
    ['runtime source contract', 'npm', ['run', 'smoke:runtime-source']],
    ['quiz integrity contract', 'npm', ['run', 'smoke:quiz-integrity-guard']],
    ['authentication security contract', 'npm', ['run', 'smoke:auth-login-security']],
    ['API security contract', 'npm', ['run', 'smoke:api-security']],
    ...sharedArchitectureChecks,
  ],
  architecture: sharedArchitectureChecks,
};

const checks = profiles[profile];
if (!checks) {
  console.error(`Unknown quick-check profile: ${profile}`);
  console.error(`Available profiles: ${Object.keys(profiles).join(', ')}`);
  process.exit(2);
}

const results = [];
for (const [name, command, args] of checks) {
  const startedAt = Date.now();
  console.log(`\n[quick-check:${profile}] START ${name}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const durationMs = Date.now() - startedAt;
  const status = result.status === 0 ? 'PASS' : 'FAIL';
  results.push({ name, status, durationMs });

  if (result.status !== 0) {
    console.error(`\n[quick-check:${profile}] FAIL ${name}`);
    console.error(JSON.stringify(results, null, 2));
    process.exit(result.status ?? 1);
  }
}

console.log(`\n[quick-check:${profile}] ALL CHECKS PASS`);
console.log(JSON.stringify(results, null, 2));
