import assert from 'node:assert/strict';
import {composeSchoolAssessment} from '../server/src/modules/quizzes/application/schoolAssessmentComposition.js';
import {createSchoolSpecInterpreter} from '../server/src/modules/quizzes/application/schoolAssessmentCompositionAi.js';

const selected:any[]=[];
const context:any={pathId:'p',subjects:[{id:'math',name:'رياضيات',skillIds:['fractions','ratios']},{id:'chem',name:'كيمياء',skillIds:['atoms']}],
  select:async(spec:any,excluded:string[])=>{
    selected.push(spec);
    const questions=(spec.subjectId==='math'?[{id:'q1',key:'canonical1'},{id:'q2',key:'canonical2'}]:[{id:'q1_copy',key:'canonical1'},{id:'q3',key:'canonical3'}]).filter(q=>!excluded.includes(q.key));
    return {available:questions.length,questions:questions.slice(0,spec.count)};
  }};
const normal:any={kind:'normal',pathId:'p',subjectSpecs:[{subjectId:'math',skillIds:['fractions'],count:2}]};
const manual=await composeSchoolAssessment(context,normal);
assert.deepEqual(manual.draft.questionIds,['q1','q2']);
assert.equal(manual.draft.isPublished,false);
assert.equal(manual.coverage[0].requested,2);
const mock=await composeSchoolAssessment(context,{...normal,kind:'mock',subjectSpecs:[...normal.subjectSpecs,{subjectId:'chem',skillIds:['atoms'],count:2}]});
assert.deepEqual(mock.draft.questionIds,['q1','q2','q3']);
assert.equal(mock.draft.mockExam.sections.length,2);
assert.equal(mock.coverage[1].available,1);
assert.equal(mock.coverage[1].selected,1);
assert.ok(mock.warnings.length);
await assert.rejects(()=>composeSchoolAssessment(context,{...normal,subjectSpecs:[{subjectId:'foreign',skillIds:[],count:1}]}));
await assert.rejects(()=>composeSchoolAssessment(context,{...normal,subjectSpecs:[{subjectId:'math',skillIds:['atoms'],count:1}]}));
await assert.rejects(()=>composeSchoolAssessment(context,{...normal,prompt:'اختر اختبارًا'}),{statusCode:503});
for(const invalid of [{...normal,pathId:'foreign'},{...normal,subjectSpecs:[{subjectId:'chem',skillIds:['atoms'],count:1}]},{...normal,questionIds:['hacked']},{...normal,subjectSpecs:[{subjectId:'math',skillIds:['ratios'],count:1}]},{...normal,subjectSpecs:[{subjectId:'math',skillIds:['fractions'],count:-1}]}]){
  await assert.rejects(()=>composeSchoolAssessment(context,{...normal,prompt:'اختر اختبارًا'},async()=>invalid));
}
const ai=await composeSchoolAssessment(context,{...normal,prompt:'سؤال واحد فقط'},async()=>({...normal,subjectSpecs:[{subjectId:'math',skillIds:['fractions'],count:1}]}));
assert.equal(ai.coverage[0].requested,1);
assert.equal(selected.some(spec=>spec.subjectId==='foreign'),false);
console.log('PASS composition: manual,normal,mock,canonical uniqueness,explicit shortage,AI confinement and unavailable provider');
const aiInput:any={spec:normal,prompt:'سؤال واحد',subjects:context.subjects};
for(const [result,statusCode] of [
  [{provider:'none',usedFallback:true,text:''},503],
  [{provider:'openai',usedFallback:false,budgetLimited:true,text:''},429],
  [{provider:'openai',usedFallback:false,text:'malformed'},502],
] as const){
  await assert.rejects(()=>createSchoolSpecInterpreter({},async()=>({...result}))(aiInput),{statusCode});
}
let gatewayInput:any;
const interpreted=await createSchoolSpecInterpreter({},async input=>{gatewayInput=input;return {provider:'openai',usedFallback:false,text:JSON.stringify(normal)};})(aiInput);
assert.deepEqual(interpreted,normal);assert.equal(gatewayInput.capability,'authoring');assert.equal(gatewayInput.fallbackText,'');
assert.equal(gatewayInput.maxOutputTokens,2000);
console.log('PASS existing authoring gateway: explicit unavailable,budget,malformed errors; no invented fallback');
