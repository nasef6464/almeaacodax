import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../pages/QuizPage.tsx', import.meta.url);
const source = await readFile(path, 'utf8');

const before = `    const hasExplicitTargets = (foundQuiz.targetUserIds || []).length > 0 || (foundQuiz.targetGroupIds || []).length > 0;
    if (!isStaffViewer && ((foundQuiz.mode || 'regular') === 'central' || hasExplicitTargets)) {
      const userGroups = user.groupIds || [];
      const isUserTargeted =
        (foundQuiz.targetUserIds || []).length === 0 || (foundQuiz.targetUserIds || []).includes(user.id);
      const isGroupTargeted =
        (foundQuiz.targetGroupIds || []).length === 0 ||
        (foundQuiz.targetGroupIds || []).some((id) => userGroups.includes(id));

      if (!isUserTargeted || !isGroupTargeted) {
        setHasAccess(false);
        setAccessMessage('هذا اختبار مركزي موجّه لطلاب محددين فقط.');
        return;
      }
    }`;

const after = `    const targetUserIds = foundQuiz.targetUserIds || [];
    const targetGroupIds = foundQuiz.targetGroupIds || [];
    const hasExplicitTargets = targetUserIds.length > 0 || targetGroupIds.length > 0;
    if (!isStaffViewer && ((foundQuiz.mode || 'regular') === 'central' || hasExplicitTargets)) {
      const userGroups = Array.from(new Set([...(user.groupIds || []), ...(user.schoolId ? [user.schoolId] : [])]));
      const isUserTargeted = targetUserIds.length > 0 && targetUserIds.includes(user.id);
      const isGroupTargeted = targetGroupIds.length > 0 && targetGroupIds.some((id) => userGroups.includes(id));

      // Direct student targeting and school/class targeting are additive, matching the API contract.
      if (hasExplicitTargets && !isUserTargeted && !isGroupTargeted) {
        setHasAccess(false);
        setAccessMessage('هذا اختبار مدرسي موجّه لطلاب محددين فقط.');
        return;
      }
    }`;

if (source.includes(after)) {
  console.log('Audience patch already applied.');
  process.exit(0);
}
if (!source.includes(before)) {
  throw new Error('Expected QuizPage audience block not found; refusing broad modification.');
}
const next = source.replace(before, after);
if (next === source || next.split(after).length !== 2) {
  throw new Error('Audience patch was not applied exactly once.');
}
await writeFile(path, next, 'utf8');
console.log('QuizPage school-directed audience gate patched exactly once.');