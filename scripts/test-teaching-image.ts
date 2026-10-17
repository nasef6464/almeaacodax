import assert from 'node:assert/strict';
import { validateTeachingImageStoryboard } from '../server/src/modules/ai/contracts/teachingImageStoryboard';
import { teachingImageIdentity } from '../server/src/modules/ai/application/teachingImageIdentity';
import { sanitizeQuestionForLearner } from '../server/src/modules/quizzes/presentation/questionPresentation';
const mark = { id: 'area', sceneId: 'given', kind: 'box', x: .1, y: .2, width: .3, height: .4 };
const plan = { version: 2, language: 'ar-SA', scenes: [{id:'given',narration:'نحدد المساحة.',actions:[]}],
  image: {url:'https://images.example/questions/a.webp',version:'v1',marks:[mark]} };
assert.equal(validateTeachingImageStoryboard(plan)?.image?.marks.length,1);
assert.equal(validateTeachingImageStoryboard({...plan,image:{...plan.image,marks:Array.from({length:4},(_,i)=>({...mark,id:'m'+i}))}})?.image?.marks.length,4);
for (const marks of [[...Array(5)].map((_,i)=>({...mark,id:'m'+i})),[{...mark,x:NaN}],[{...mark,y:Infinity}],[{...mark,x:-.1}],[{...mark,width:1}],[{...mark,height:0}],[mark,mark],[{...mark,sceneId:'missing'}],[{...mark,kind:'path',d:'<script>'}],[{id:'a',sceneId:'given',kind:'arrow',from:{x:.1,y:.1},to:{x:.1,y:.1}}]]) {
  const parsed=validateTeachingImageStoryboard({...plan,image:{...plan.image,marks}});
  assert.ok(parsed?.scenes.length,'invalid marks keep valid narration'); assert.equal(parsed?.image,undefined);
}
assert.equal(validateTeachingImageStoryboard({...plan,scenes:[{...plan.scenes[0],narration:'<script>x</script>'}]}),null);
const question={imageUrl:plan.image.url,sourceMeta:{imageHash:'a'.repeat(64)},correctOptionIndex:1,explanation:'private'};
const identity=teachingImageIdentity(question)!;assert.ok(identity.version);
assert.notEqual(identity.version,teachingImageIdentity({...question,sourceMeta:{imageHash:'b'.repeat(64)}})?.version);
assert.equal(teachingImageIdentity({imageUrl:plan.image.url}),null);
const safe=sanitizeQuestionForLearner(question); assert.equal(safe.teachingImageVersion,identity.version);
assert.equal('correctOptionIndex' in safe,false);assert.equal('sourceMeta' in safe,false);
console.log('Teaching image contract/identity PASS');
