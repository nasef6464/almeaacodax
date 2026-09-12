import { readFile } from 'node:fs/promises';

const contract = (await readFile(new URL('../dashboards/admin/SchoolsManager/SchoolContractPanel.tsx', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const services = (await readFile(new URL('../dashboards/admin/SchoolsManager/SchoolServicesCenterTab.tsx', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const failures = [];
const check = (label, condition) => {
  if (!condition) failures.push(label);
};

check('contract editor loads server state', contract.includes('api.getSchoolContract(schoolId)'));
check('contract editor is the writer', contract.includes('api.updateSchoolContract(schoolId'));
check('contract editor owns start and end dates', contract.includes('const [validFrom, setValidFrom]') && contract.includes('const [validUntil, setValidUntil]'));
check('contract editor persists both dates', contract.includes('validFrom: toIsoOrNull(validFrom)') && contract.includes('validUntil: toIsoOrNull(validUntil)'));
check('contract editor prevents reversed dates', contract.includes('validUntil < validFrom'));
check('contract editor re-reads after mutation', contract.includes('const verification = await api.getSchoolContract(schoolId)'));
check('contract editor verifies exact status', contract.includes('verified.status !== status'));
check('contract editor verifies missing modules', contract.includes('normalizedDraftModules.find((moduleId) => !verifiedModules.includes(moduleId))'));
check('contract editor verifies unexpected modules', contract.includes('verifiedModules.find((moduleId) => !normalizedDraftModules.includes(moduleId))'));
check('contract editor verifies start and end dates after save', contract.includes('verifiedValidFrom !== validFrom') && contract.includes('verifiedValidUntil !== validUntil'));
check('SCHOOL_CORE remains mandatory', contract.includes("Array.from(new Set(['SCHOOL_CORE', ...items]))"));
check('services center reads contract entitlement state', services.includes('api.getSchoolContract(schoolId)'));
check('services center cannot write contract state', !services.includes('updateSchoolContract'));
check('services center labels itself as display-only', services.includes('هذه شاشة عرض فقط'));

if (failures.length > 0) {
  console.error('School contract single-writer contract: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('School contract single-writer contract: PASS');
