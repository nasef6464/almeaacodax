import { readFile } from 'node:fs/promises';

const modal = (await readFile(new URL('../dashboards/admin/SchoolsManager/NewSchoolWizardModal.tsx', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const leadership = (await readFile(new URL('../dashboards/admin/SchoolsManager/NewSchoolWizardLeadershipStep.tsx', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const failures = [];
const check = (label, condition) => {
  if (!condition) failures.push(label);
};

check('keeps a checkpoint for the created school', modal.includes('const [provisionedSchool, setProvisionedSchool]'));
check('reuses the checkpoint instead of creating a duplicate school', modal.includes('if (provisionedSchool) return provisionedSchool'));
check('tracks created classes across retries', modal.includes('const [createdClassNames, setCreatedClassNames]'));
check('skips classes already created on the server', modal.includes('if (!className || completed.has(className)) continue'));
check('does not swallow class creation failures', modal.includes('const failures: string[] = []') && modal.includes('throw new Error(`تم إنشاء المدرسة والعقد، لكن تعذر إنشاء'));
check('does not contain the old non-critical contract swallow', !modal.includes('Contract setup non-critical error'));
check('verifies contract state after saving', modal.includes('const verification = await api.getSchoolContract(schoolId)'));
check('verifies every expected module', modal.includes('expectedModules.find((moduleId) => !verifiedModules.includes(moduleId))'));
check('creates a real school_admin account', modal.includes("role: 'school_admin'"));
check('attaches director access through the server membership API', modal.includes('api.updateSchoolDirectorAccess(schoolId, resolvedDirectorId'));
check('verifies active director membership', modal.includes("membership.status !== 'active'"));
check('does not persist director password into school metadata', !/metadata:\s*\{[\s\S]{0,700}directorPassword/.test(modal));
check('leadership UI asks for an explicit temporary password', leadership.includes('كلمة المرور المؤقتة'));
check('leadership UI documents real director account semantics', leadership.includes('حساب مدير مدرسة حقيقي'));

if (failures.length > 0) {
  console.error('School wizard integrity: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('School wizard integrity: PASS');
