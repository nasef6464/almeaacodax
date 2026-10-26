import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {partialRequestSchema} from '../utils/partialRequestSchema.js';
import * as auth from '../modules/auth/http/authSchemas.js';
import * as studyPlans from '../modules/content/http/studyPlanSchemas.js';
import * as school from '../modules/content/http/schoolOperationsSchemas.js';
import * as learning from '../modules/content/http/learningContentSchemas.js';
import * as integrations from '../modules/content/http/platformIntegrationSchemas.js';
import * as submissions from '../modules/quizzes/http/submissionSchemas.js';
import * as quizzes from '../modules/quizzes/http/quizDefinitionSchema.js';

const inputs: unknown[] = [undefined,null,{},[],true,0,'',
  {email:'student@example.invalid',password:'TestPassword123'},
  {email:'٠١٢٣٤٥٦٧٨٩',password:'x'},
  {email:'student+test@example.invalid',password:'TestPassword123',name:'طالب تجريبي'},
  {email:'invalid',password:'short',name:'x'},
  {id:'fixture',title:'درس تجريبي',name:'خطة تجريبية',pathId:'path',subjectId:'subject',startDate:'2026-10-26',endDate:'2026-11-09'},
  {studentId:'learner',pathId:'path',subjectId:'subject',skillId:'skill'},
  {title:'اختبار',pathId:'path',subjectId:'subject'},
  {title:'تعديل عنوان فقط'},
  {questionId:'question'},
  {questionId:'question',activityType:'quiz',quizId:'quiz'},
  {questionId:'question',activityType:'practice',quizId:'quiz'},
  {answers:{q1:'2',q2:null,q3:-1}},
  {answers:{q1:'not-a-number'}},
  {rows:[{name:'طالب تجريبي',email:'student@example.invalid'}]},
  {questionIds:['one'],settings:{randomize:false},access:{isFree:true}},
  {role:'teacher',name:'معلم تجريبي',email:'teacher@example.invalid',password:'TestPassword123'},
  {dailyMinutes:30,subjectIds:['subject'],courseIds:[],skipCompletedQuizzes:false},
  {providers:{zoom:{enabled:false}}},
  {nationalId:'١٢٣٤٥٦٧٨٩٠',password:'TestPassword123'},
];
const snapshot: Record<string, unknown[]> = {};
const baseline = new URL('../../../scripts/fixtures/validation-compatibility-baseline.json',import.meta.url);
const recording = process.argv.includes('--record');
const expected = recording ? null : JSON.parse(readFileSync(baseline,'utf8'));
if (recording) assert.equal(createRequire(import.meta.url)('zod/package.json').version,'3.25.76','Never overwrite the legacy contract baseline using the upgraded validator');
let successfulCases = 0;
for (const [group, schemas] of Object.entries({auth,studyPlans,school,learning,integrations,submissions,quizzes})) {
  for (const [name, candidate] of Object.entries(schemas)) {
    if (typeof (candidate as any)?.safeParse !== 'function') continue;
    const variants: Array<[string, any]> = [[name,candidate]];
    if (typeof (candidate as any).partial === 'function' && (recording || expected[`${group}.${name}.partial`])) variants.push([`${name}.partial`,recording ? (candidate as any).partial() : partialRequestSchema(candidate as any)]);
    for (const [variant,schema] of variants) snapshot[`${group}.${variant}`] = inputs.map(input => {
      const result = schema.safeParse(input);
      if (result.success) successfulCases++;
      // Invalid requests must remain rejected. Built-in wording and issue counts may differ after the security fix.
      return result.success ? {success:true,data:result.data} : {success:false};
    });
  }
}
if (recording) {
  mkdirSync(new URL('./',baseline),{recursive:true});
  writeFileSync(baseline,JSON.stringify(snapshot,null,2)+'\n');
  console.log(`RECORDED validation baseline: ${Object.keys(snapshot).length} schema variants, ${successfulCases} accepted fixtures.`);
} else {
  for (const [name, cases] of Object.entries(expected)) assert.deepEqual(snapshot[name],cases,`validation compatibility changed: ${name}`);
  assert.deepEqual(Object.keys(snapshot),Object.keys(expected));
  console.log(`PASS validation compatibility: ${Object.keys(snapshot).length} schema variants × ${inputs.length} inputs; ${successfulCases} accepted fixtures retain exact parsed values.`);
}
