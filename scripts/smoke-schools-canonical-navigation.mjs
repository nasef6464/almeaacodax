import { readFile } from 'node:fs/promises';

const contracts = (await readFile(new URL('../dashboards/admin/SchoolsManager/contracts.ts', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const workspace = (await readFile(new URL('../dashboards/admin/SchoolsManager/workspaceViewModel.ts', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const failures = [];
const check = (label, condition) => {
  if (!condition) failures.push(label);
};

check('defines the seven canonical tabs', [
  "'overview'", "'people'", "'academic'", "'services'", "'contract'", "'reports'", "'settings'",
].every((fragment) => contracts.includes(fragment)));
check('legacy aliases remain compatibility-only', contracts.includes("export type LegacySchoolWorkspaceTab = 'dashboard' | 'packages' | 'relations' | 'import'"));
check('classes route to academic', /label: 'فصول دراسية'[\s\S]{0,300}tab: 'academic'/.test(workspace));
check('students route to people', /label: 'طلاب مسجلون'[\s\S]{0,500}tab: 'people'/.test(workspace));
check('supervisors route to people', /label: 'مشرفون'[\s\S]{0,300}tab: 'people'/.test(workspace));
check('packages route to contract', /label: 'باقة\/مسارات'[\s\S]{0,400}tab: 'contract'/.test(workspace));
check('access operating step routes to contract', /id: 'access'[\s\S]{0,700}tab: 'contract'/.test(workspace));
check('reports route to reports', /id: 'reports'[\s\S]{0,700}tab: 'reports'/.test(workspace));
check('new decision cards do not emit legacy relation/import/package destinations', !/tab: '(relations|import|packages)'/.test(workspace));

if (failures.length > 0) {
  console.error('School canonical navigation: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('School canonical navigation: PASS');
