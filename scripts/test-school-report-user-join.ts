import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isolatedMongo, mongoose } from './live-session-test-fixture.js';

const close = await isolatedMongo();
try {
  const { SchoolSkillAggregateModel } = await import('../server/src/models/SchoolSkillAggregate.js');
  await SchoolSkillAggregateModel.init();
  await SchoolSkillAggregateModel.collection.insertMany(Array.from({ length: 1100 }, (_, i) => ({
    schoolId: 'isolated', classId: 'a', userId: String(new mongoose.Types.ObjectId()),
    pathId: 'math', subjectId: 'math', skillId: 'skill', totalEvidence: 1,
  })));
  const target = await SchoolSkillAggregateModel.findOne().lean();
  const plan = await SchoolSkillAggregateModel.find({ userId: target!.userId }).explain('executionStats');
  const observation = { inventory: 1100, returned: plan.executionStats.nReturned,
    docsExamined: plan.executionStats.totalDocsExamined, keysExamined: plan.executionStats.totalKeysExamined };
  fs.writeFileSync('scratch/school-report-user-join.json', JSON.stringify(observation, null, 2));
  console.log(JSON.stringify(observation));
  assert.equal(observation.returned, 1);
  assert.equal(observation.docsExamined, 1, 'each authorized-user equality join must use an index');
} finally { await close(); }
