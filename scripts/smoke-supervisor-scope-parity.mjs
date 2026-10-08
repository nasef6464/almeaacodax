import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const load = async (file) => {
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
};
const { resolveSupervisorSchoolScope } = await load('utils/supervisorSchoolScope.ts');
const { buildSupervisorDirectScope, appendSchoolWideChildGroups } = await load('server/src/modules/quizzes/application/quizSupervisorScope.ts');
const groups = [
  { id: 'school-a', type: 'SCHOOL' },
  { id: 'class-a', type: 'CLASS', parentId: 'school-a', supervisorIds: ['class-supervisor'] },
  { id: 'class-b', type: 'CLASS', parentId: 'school-a' },
  { id: 'private-a', type: 'PRIVATE_GROUP', parentId: 'school-a' },
  { id: 'school-b', type: 'SCHOOL', supervisorIds: ['school-supervisor'] },
  { id: 'class-c', type: 'CLASS', parentId: 'school-b' },
];
const cases = [
  ['class assignment excludes parent and siblings', { id: 'u', groupIds: ['class-a'] }, ['class-a']],
  ['direct supervisor relation stays class-only', { id: 'class-supervisor' }, ['class-a']],
  ['explicit school covers its classes and private groups', { id: 'u', schoolId: 'school-a' }, ['school-a', 'class-a', 'class-b', 'private-a']],
  ['school group assignment covers its children', { id: 'u', groupIds: ['school-a'] }, ['school-a', 'class-a', 'class-b', 'private-a']],
  ['school supervisor relation covers only its school', { id: 'school-supervisor' }, ['school-b', 'class-c']],
  ['private group does not widen to school', { id: 'u', groupIds: ['private-a'] }, ['private-a']],
  ['multiple class assignments stay explicit', { id: 'u', groupIds: ['class-a', 'class-c'] }, ['class-a', 'class-c']],
  ['missing assignments fail closed', { id: 'u' }, []],
  ['unloaded assignment is retained without inferring a school', { id: 'u', groupIds: ['unloaded'] }, ['unloaded']],
];
for (const [name, user, expected] of cases) {
  const actual = resolveSupervisorSchoolScope(user, groups);
  const direct = buildSupervisorDirectScope({ schoolId: user.schoolId, managedGroupIds: user.groupIds,
    seedGroups: groups.filter((group) => user.groupIds?.includes(group.id)),
    directlySupervisedGroups: groups.filter((group) => group.supervisorIds?.includes(user.id)),
  });
  const server = appendSchoolWideChildGroups(direct, groups.filter((group) =>
    direct.schoolIds.includes(group.parentId) && ['CLASS', 'PRIVATE_GROUP'].includes(group.type),
  ));
  assert.deepEqual([...actual.groupIds].sort(), [...expected].sort(), name);
  assert.deepEqual([...actual.schoolIds].sort(), [...server.schoolIds].sort(), name);
  assert.deepEqual([...actual.groupIds].sort(), [...new Set([...server.groupIds, ...server.schoolIds])].sort(), name);
  console.log(`PASS ${name}`);
}
for (const file of ['dashboards/admin/SupervisorDashboard.tsx', 'dashboards/admin/AdminDashboard.tsx', 'dashboards/admin/supervisorTests/useSupervisorAssessmentScope.ts']) {
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(source.includes('resolveSupervisorSchoolScope(user, groups)'), `${file} must reuse the verified scope`);
  assert.ok(!/if \(\w+\.parentId\) \w+\.add\(\w+\.parentId\)/.test(source), `${file} must not promote class parents`);
}
console.log(`Supervisor frontend/server scope parity: ${cases.length} behavioral cases PASS; 3 consumers PASS.`);
