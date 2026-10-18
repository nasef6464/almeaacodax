import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {teachingRegionSourceKey,validateTeachingRegions,approvedTeachingRegions,invalidateStaleTeachingRegions} from '../server/src/modules/ai/contracts/verifiedTeachingRegions';
import {attachVerifiedTeachingRegions} from '../server/src/modules/ai/application/verifiedTeachingRegions';
import {teachingImageIdentity} from '../server/src/modules/ai/application/teachingImageIdentity';
import {sanitizeQuestionForLearner} from '../server/src/modules/quizzes/presentation/questionPresentation';
import {reviewQuestionAiContext} from '../server/src/modules/quizzes/presentation/reviewQuestionPresentation';
import {QuestionModel} from '../server/src/models/Question';
import {questionBaseSchema} from '../server/src/modules/quizzes/http/questionQuerySchemas';
const source={imageUrl:'https://images.example/questions/a.png',sourceMeta:{imageHash:'a'.repeat(64)}};
const areas={sourceKey:teachingRegionSourceKey(source)!,approved:true,items:[{id:'r1',label:'الطول',x:.43,y:.78,width:.06,height:.2},{id:'r2',label:'العرض',x:.77,y:.4,width:.05,height:.17}]};
const q={...source,aiContext:{teachingRegions:areas}};
assert.deepEqual(approvedTeachingRegions(q),areas);
const legacy=createHash('sha256').update(JSON.stringify([source.imageUrl,source.sourceMeta.imageHash])).digest('hex');
assert.equal(teachingImageIdentity(source)?.version,legacy,'legacy question identities remain stable');
const identity=teachingImageIdentity(q)!;assert.notEqual(identity.version,legacy);
assert.notEqual(teachingImageIdentity({...q,aiContext:{teachingRegions:{...areas,items:[...areas.items].reverse()}}})?.version,identity.version,'order invalidates cached plans');
for(const invalid of [
 {...areas,items:[]}, {...areas,items:Array(5).fill(areas.items[0])}, {...areas,items:[areas.items[0],areas.items[0]]},
 ...[-.1,Infinity,NaN].map(x=>({...areas,items:[{...areas.items[0],x}]})),
 {...areas,items:[{...areas.items[0],width:0}]}, {...areas,items:[{...areas.items[0],width:.9}]},
 {...areas,items:[{...areas.items[0],kind:'path'}]}, {...areas,approved:'true'},
])assert.equal(validateTeachingRegions(invalid),null);
assert.ok(validateTeachingRegions({...areas,approved:false,items:[]}),'empty unapproved draft is valid');
for(const changed of [{...q,imageUrl:source.imageUrl+'-new'},{...q,sourceMeta:{imageHash:'b'.repeat(64)}},{...q,aiContext:{teachingRegions:{...areas,approved:false}}}]) {
 assert.equal(approvedTeachingRegions(changed),null);assert.equal(invalidateStaleTeachingRegions(changed).aiContext.teachingRegions.approved,false);
}
assert.equal(q.aiContext.teachingRegions.approved,true,'invalidation must not mutate the source');
assert.equal(approvedTeachingRegions({...q,aiContext:{teachingRegions:{...areas,toObject:'malformed'}}}),null);
const base=JSON.stringify({version:1,language:'ar-SA',scenes:[{id:'given',narration:'نحدد المعطيات.',actions:[{type:'write',id:'g',kind:'formula',content:'6 × 4'}]},{id:'solution',narration:'المساحة24.',actions:[{type:'write',id:'answer',kind:'text',content:'24'}]}]});
const request={boardMode:'storyboard_v2',helpLevel:'steps',imageVersion:identity.version};
const plan=JSON.parse(attachVerifiedTeachingRegions(base,request,q,true));
assert.equal(plan.version,2);assert.equal(plan.image.version,identity.version);
assert.deepEqual(plan.image.marks,areas.items.map((a,i)=>({id:'region'+i,sceneId:'given',kind:'box',x:a.x,y:a.y,width:a.width,height:a.height})));
assert.deepEqual(plan.scenes,JSON.parse(base).scenes,'reference/scenes remain unchanged');
for(const [r,current] of [[{...request,boardMode:'storyboard_v1'},true],[{...request,imageVersion:'stale'},true],[{...request,boardContext:'private'},true],[{...request,helpLevel:'follow_up'},true],[request,false]] as const)assert.equal(attachVerifiedTeachingRegions(base,r,q,current),base);
assert.equal(attachVerifiedTeachingRegions('trusted plain explanation',request,q,true),'trusted plain explanation');
const safe=sanitizeQuestionForLearner(q);assert.equal(safe.aiContext,undefined);assert.equal(safe.teachingImageVersion,identity.version);
assert.deepEqual(reviewQuestionAiContext({...q.aiContext,readableText:'readable'}),{readableText:'readable'},'owned review keeps learning text without staff approval/source binding metadata');
const payload={...q,text:'question',subject:'math',pathId:'fixture',skillIds:['fixture'],options:['24','20'],correctOptionIndex:0};
assert.equal(questionBaseSchema.safeParse(payload).success,true);
assert.equal(questionBaseSchema.safeParse({...payload,aiContext:{teachingRegions:{...areas,items:Array(5).fill(areas.items[0])}}}).success,false);
const stored=new QuestionModel(payload);await stored.validate();assert.deepEqual(stored.toObject().aiContext?.teachingRegions?.items.map((a:any)=>a.id),['r1','r2']);
await assert.rejects(new QuestionModel({...payload,aiContext:{teachingRegions:{...areas,items:Array(5).fill(areas.items[0])}}}).validate());
console.log('Verified teaching regions: validation, source binding, deterministic marks, cache identity, learner privacy PASS');
