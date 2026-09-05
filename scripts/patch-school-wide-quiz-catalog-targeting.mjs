import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('../pages/Quizzes.tsx', import.meta.url);
const source = await readFile(path, 'utf8');

const beforeGroups = `        const userGroups = user.groupIds || [];\n        const isUserTargeted = targetUserIds.length > 0 && targetUserIds.includes(user.id);`;
const afterGroups = `        const userGroups = Array.from(new Set([...(user.groupIds || []), ...(user.schoolId ? [user.schoolId] : [])]));\n        const isUserTargeted = targetUserIds.length > 0 && targetUserIds.includes(user.id);`;

const beforeDeps = `    [canSeeHiddenPaths, checkAccess, hasScopedPackageAccess, user.groupIds, user.id, visiblePathIds],`;
const afterDeps = `    [canSeeHiddenPaths, checkAccess, hasScopedPackageAccess, user.groupIds, user.id, user.schoolId, visiblePathIds],`;

let next = source;
if (!next.includes(afterGroups)) {
  if (!next.includes(beforeGroups)) throw new Error('Expected directed catalog audience block not found.');
  next = next.replace(beforeGroups, afterGroups);
}
if (!next.includes(afterDeps)) {
  if (!next.includes(beforeDeps)) throw new Error('Expected canAccessQuiz dependency list not found.');
  next = next.replace(beforeDeps, afterDeps);
}
if (next === source) {
  console.log('School-wide catalog targeting patch already applied.');
  process.exit(0);
}
await writeFile(path, next, 'utf8');
console.log('School-wide quiz catalog targeting patched exactly.');