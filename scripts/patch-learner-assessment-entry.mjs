import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const baseline = 'abb57058e379c336269ec9463d1a29cd98486f0d';
const runtimeFiles = [
  'pages/QuizPage.tsx',
  'services/apiGroups/quizzesApi.ts',
  'scripts/smoke-supervisor-dashboard-contract.mjs',
];

for (const path of runtimeFiles) {
  const source = execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
  await writeFile(new URL(`../${path}`, import.meta.url), source, 'utf8');
}

const auditFile = new URL('./live-assessment-commercial-audit.mjs', import.meta.url);
let audit = await readFile(auditFile, 'utf8');
const staleClick = '    await freshStudent.page.getByTestId(`student-directed-test-${createdQuizId}`).click();';
const directedCtaClick = '    await freshStudent.page.getByTestId(`student-directed-test-${createdQuizId}`).getByRole("link", { name: /دخول الاختبار|إعادة الدخول/ }).click();';
if (!audit.includes(directedCtaClick)) {
  const count = audit.split(staleClick).length - 1;
  if (count !== 1) throw new Error(`directed assessment card click: expected exactly one stale selector, found ${count}`);
  audit = audit.replace(staleClick, directedCtaClick);
  await writeFile(auditFile, audit, 'utf8');
}

console.log('Restored the pre-entry runtime and corrected only the E2E navigation target.');
