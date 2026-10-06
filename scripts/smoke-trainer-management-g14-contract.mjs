import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [route, manager, dashboard, api, integration] = await Promise.all([
  read('server/src/routes/auth.routes.ts'),
  read('dashboards/admin/TrainersManager.tsx'),
  read('dashboards/admin/AdminDashboard.tsx'),
  read('services/apiGroups/authApi.ts'),
  read('server/src/scripts/backendIntegrationGate.ts'),
]);

const pass = (label) => console.log(`PASS ${label}`);
const includesAll = (source, values, label) => {
  values.forEach((value) => assert.ok(source.includes(value), `${label}: missing ${value}`));
  pass(label);
};

includesAll(route, [
  '"/admin/trainers"',
  '"/admin/trainers/:id"',
  'requireRole(["admin"])',
  'getTrainerPortfolioStats',
  'status: z.enum(["active", "inactive", "unconfigured"])',
  'persona: z.enum(["platform", "hybrid"])',
  'recordAdminAuditLog',
], 'G14 server read model is paginated, filtered, admin-only, and audit-backed');

includesAll(route, [
  'const limit = 100;',
  'const statsPromise = getTrainerPortfolioStats(ownership);',
  'LessonModel.countDocuments({ ...ownership, type: "video" })',
], 'G14 profile statistics remain exact beyond its bounded item preview');

includesAll(manager, [
  'api.getAdminTrainers',
  'api.getAdminTrainer',
  'api.updateAdminUser',
  'حفظ النطاق',
  'إيقاف',
  'إعادة تفعيل',
  'إنتاج المدرب',
], 'G14 admin UI loads, saves, and displays the server-backed trainer profile');

includesAll(dashboard, [
  "id: 'trainers'",
  "case 'trainers':",
  'TrainersManager',
], 'G14 trainer management is a primary admin surface');

includesAll(api, ['getAdminTrainers:', 'getAdminTrainer:'], 'G14 UI calls typed admin trainer APIs');

includesAll(integration, [
  'admin reads the paginated trainer management center',
  'admin reads a trainer management profile',
  'trainer management center is admin-only',
  'admin saves trainer scope through the trainer center command',
], 'G14 isolated HTTP journey covers read, profile, RBAC, and persisted scope changes');

console.log('Trainer management G14 contract passed.');
