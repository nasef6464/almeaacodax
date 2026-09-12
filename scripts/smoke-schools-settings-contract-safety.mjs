import { readFile } from 'node:fs/promises';

const source = (await readFile(new URL('../dashboards/admin/SchoolsManager/SchoolSettingsSafetyTab.tsx', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const failures = [];
const check = (label, condition) => {
  if (!condition) failures.push(label);
};

check('reads the authoritative contract before lifecycle changes', source.includes('api.getSchoolContract(schoolId)'));
check('preserves the current module set during status changes', source.includes('modules: currentModules'));
check('preserves validFrom when changing status', source.includes('validFrom: contract.validFrom || null'));
check('preserves validUntil when changing status', source.includes('validUntil: contract.validUntil || null'));
check('re-reads the contract after the mutation', source.includes('const verified = await api.getSchoolContract(schoolId)'));
check('verifies the server status after mutation', source.includes('verifiedContract.status !== expectedStatus'));
check('verifies modules were not dropped', source.includes('currentModules.find((moduleId: string) => !verifiedModules.includes(moduleId))'));
check('does not reset contract modules to SCHOOL_CORE only', !source.includes("modules: ['SCHOOL_CORE']"));
check('does not fake archive success with alert', !source.includes("alert('تم أرشفة المدرسة"));
check('explicitly refuses fake archive mutation', source.includes('الأرشفة الدائمة ليست موصولة بعملية خادمية معتمدة'));
check('only exposes a persisted school-name save action', source.includes('حفظ اسم المدرسة'));

if (failures.length > 0) {
  console.error('School settings contract safety: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('School settings contract safety: PASS');
