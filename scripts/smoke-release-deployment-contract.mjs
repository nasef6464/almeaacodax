import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const vercel = JSON.parse(read('vercel.json'));
const apiRewrite = vercel.rewrites?.find((item) => item.source === '/api/:path*');
assert(apiRewrite, 'vercel.json must define the canonical /api rewrite');
assert(/^https:\/\/[^/]+\.onrender\.com\/api\/:path\*$/.test(apiRewrite.destination), 'Vercel /api rewrite must target a Render API origin over HTTPS');
const activeRenderOrigin = new URL(apiRewrite.destination.replace('/api/:path*', '')).origin;

const compose = read('docker-compose.yml');
assert(
  compose.includes('http://127.0.0.1:4000/api/health/ready'),
  'Docker backend healthcheck must use readiness, not the compatibility health endpoint',
);

const postDeploy = read('.github/workflows/post-deploy-smoke.yml');
assert(postDeploy.includes('npm run smoke:release-identity'), 'post-deploy workflow must verify release identity');
assert(
  postDeploy.includes('EXPECTED_RELEASE_SHA: ${{ github.sha }}'),
  'post-deploy release identity must compare against the exact GitHub SHA',
);

const roleGate = read('.github/workflows/platform-v3-live-role-gate.yml');
const roleWait = roleGate.indexOf('- name: Wait for published release before role authentication');
const roleAuth = roleGate.indexOf('- name: Production role auth smoke');
assert(roleWait >= 0 && roleAuth > roleWait, 'live role auth must wait for the published revision first');
const waitStep = roleGate.slice(roleWait, roleAuth);
assert(waitStep.includes("if: github.event_name != 'pull_request'"), 'PR role gate must not wait on production');
assert(waitStep.includes('EXPECTED_RELEASE_SHA: ${{ github.sha }}'), 'role wait must check the exact workflow revision');
assert(waitStep.includes('RELEASE_API_BASE: ${{ env.UI_AUDIT_API_BASE_URL }}'), 'role wait and auth must use the same API origin');
assert(waitStep.includes('run: npm run smoke:release-identity'), 'role wait must reuse the existing identity/readiness verifier');

const health = read('server/src/routes/health.routes.ts');
const sentry = read('server/src/observability/sentry.ts');
assert(
  health.includes('from "../observability/releaseIdentity.js"'),
  'health route must consume the canonical runtime release identity helper',
);
assert(
  sentry.includes('from "./releaseIdentity.js"') && sentry.includes('release:'),
  'Sentry must tag events with the same runtime release identity',
);

const deploymentGuide = read('docs/DEPLOYMENT.md');
assert(
  deploymentGuide.includes(activeRenderOrigin),
  'canonical deployment guide must match the Render origin selected by vercel.json',
);
assert(
  !deploymentGuide.includes('Student@123') &&
    !deploymentGuide.includes('Teacher@123') &&
    !deploymentGuide.includes('Parent@123'),
  'canonical deployment guide must not publish reusable test-account passwords',
);

console.log('Release/deployment contract passed.');
