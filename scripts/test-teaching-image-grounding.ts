import assert from 'node:assert/strict';
import {generateTeachingImageLesson,teachingImageSchema,teachingImageInstruction} from '../server/src/modules/ai/application/teachingImageLesson';

const identity={url:'https://images.example/questions/v2/geometry.png',version:'synthetic'};
const base={format:'compact_v1',mode:'lesson',language:'ar-SA',narration:'نحدد المعطيات.',board:'6',kind:'formula',prompt:'ما المساحة؟',explanation:'نضرب الطول بالعرض.',solution:['6 \\times 4 = 24'],solutionKind:'formula'};
let calls=0;
const generate=async(marks:unknown)=>generateTeachingImageLesson({identity,prompt:'reference',fallback:'مرجع',expected:{mode:'lesson',trustedAnswer:'24'},loadImage:async()=>({data:'synthetic',mimeType:'image/png'}),callVision:async()=>{calls++;return {text:JSON.stringify({...base,marks}),imageSentToProvider:true};}});
const lesson=await generate([
  {sceneId:'given',kind:'box',box_2d:[780,440,990,500]},
  {sceneId:'solution',kind:'ellipse',box_2d:[400,770,570,820]},
  {sceneId:'given',kind:'arrow',from_2d:[100,250],to_2d:[900,470]},
]);
assert.ok(lesson.storyboard?.image,'native model boxes must compile into the existing public image contract');
assert.deepEqual(lesson.storyboard.image.marks,[
  {id:'mark0',sceneId:'given',kind:'box',x:.44,y:.78,width:.06,height:.21},
  {id:'mark1',sceneId:'solution',kind:'ellipse',x:.77,y:.4,width:.05,height:.17},
  {id:'mark2',sceneId:'given',kind:'arrow',from:{x:.25,y:.1},to:{x:.47,y:.9}},
]);
const invalid=[[-1,0,50,50],[0,0,1001,1000],[500,20,300,40],[0,100,10,100],[0,0,10],[0,0,10,20,30],[0,0,10,NaN],[0,0,'10',20],[0,0,10.5,20]];
for(const box_2d of invalid){const r=await generate([{sceneId:'given',kind:'box',box_2d}]);assert.ok(r.storyboard?.scenes.at(-1)?.narration.includes('24'));assert.equal(r.storyboard.image,undefined,'invalid native coordinates discard annotation layer, preserving trusted explanation');}
for(const mark of [
  {sceneId:'given',kind:'box',x:.1,y:.1,width:.2,height:.2},
  {sceneId:'given',kind:'box',box_2d:[0,0,20,20],x:.1},
  {sceneId:'given',kind:'arrow',from_2d:[10,20],to_2d:[10,20]},
  {sceneId:'given',kind:'arrow',from_2d:[10,20,30],to_2d:[20,30]},
])assert.equal((await generate([mark])).storyboard?.image,undefined);
const schema:any=teachingImageSchema('lesson');
const shape=schema.properties.marks.items.anyOf[0];
assert.ok(shape.required.includes('box_2d'));assert.equal(shape.properties.box_2d.minItems,4);assert.equal(shape.properties.box_2d.maxItems,4);
assert.equal(shape.properties.box_2d.items.maximum,1000);assert.equal(shape.properties.x,undefined);
assert.match(teachingImageInstruction,/ymin.*xmin.*ymax.*xmax/);
assert.doesNotMatch(teachingImageInstruction,/دون الهوامش/,'coordinate reference must include the original image margins');
assert.equal(calls,14,'one provider call per fixture, no retries');
console.log('Native image grounding conversion/validation PASS (synthetic; not live region accuracy)');
