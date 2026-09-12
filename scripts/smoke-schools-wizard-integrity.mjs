import { readFile } from 'node:fs/promises';

const modal = (await readFile(new URL('../dashboards/admin/SchoolsManager/NewSchoolWizardModal.tsx', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const provisioning = (await readFile(new URL('../dashboards/admin/SchoolsManager/useSchoolWizardProvisioning.ts', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const leadership = (await readFile(new URL('../dashboards/admin/SchoolsManager/NewSchoolWizardLeadershipStep.tsx', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const failures = [];
const check = (label, condition) => {
  if (!condition) failures.push(label);
};

check('wizard UI delegates provisioning to a focused hook', modal.includes('useSchoolWizardProvisioning'));
check('keeps a checkpoint for the created school', provisioning.includes('const [provisionedSchool, setProvisionedSchool]'));
check('reuses the checkpoint instead of creating a duplicate school', provisioning.includes('if (provisionedSchool) return provisionedSchool'));
check('tracks created classes across retries', provisioning.includes('const [createdClassNames, setCreatedClassNames]'));
check('skips classes already created on the server', provisioning.includes('if (!className || completed.has(className)) continue'));
check('does not swallow class creation failures', provisioning.includes('const failures: string[] = []') && provisioning.includes('throw new Error(`تم إنشاء المدرسة والعقد، لكن تعذر إنشاء'));
check('does not contain the old non-critical contract swallow', !modal.includes('Contract setup non-critical error') && !provisioning.includes('Contract setup non-critical error'));
check('verifies contract state after saving', provisioning.includes('const verification = await api.getSchoolContract(schoolId)'));
check('verifies every expected module', provisioning.includes('expectedModules.find((moduleId) => !verifiedModules.includes(moduleId))'));
check('creates a real school_admin account', provisioning.includes("role: 'school_admin'"));
check('attaches director access through the server membership API', provisioning.includes('api.updateSchoolDirectorAccess(schoolId, resolvedDirectorId'));
check('verifies active director membership', provisioning.includes("membership.status !== 'active'"));
check('does not persist director password into school metadata', !/metadata:\s*\{[\s\S]{0,700}directorPassword/.test(provisioning));
check('resets server checkpoints after completed/closed provisioning', provisioning.includes('resetCheckpoint()'));
check('modal remains below hotspot boundary', modal.split(/\r?\n/).length < 400);
check('provisioning hook remains below hotspot boundary', provisioning.split(/\r?\n/).length < 400);
check('leadership UI asks for an explicit temporary password', leadership.includes('كلمة المرور المؤقتة'));
check('leadership UI documents real director account semantics', leadership.includes('حساب مدير مدرسة حقيقي'));

if (failures.length > 0) {
  console.error('School wizard integrity: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('School wizard integrity: PASS');
