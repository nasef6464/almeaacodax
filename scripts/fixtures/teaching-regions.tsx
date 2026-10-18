import React from 'react';
import {createRoot} from 'react-dom/client';
import {QuestionTeachingRegionsEditor} from '../../dashboards/admin/builders/QuestionTeachingRegionsEditor';
import {TeachingBoard} from '../../components/results/teaching/TeachingBoard';
import {boardAt} from '../../components/results/teaching/boardState';
import {approvedTeachingRegions,type VerifiedTeachingRegions} from '../../server/src/modules/ai/contracts/verifiedTeachingRegions';
function Demo(){
 const [revision,setRevision]=React.useState(1),[value,setValue]=React.useState<VerifiedTeachingRegions|undefined>(),[saved,setSaved]=React.useState<VerifiedTeachingRegions|undefined>();
 const question={imageUrl:`https://fixture.images/questions/${revision}.svg`,sourceMeta:{imageVersion:revision},aiContext:{teachingRegions:value}};
 const regions=approvedTeachingRegions(question);const plan:any={version:2,language:'ar-SA',scenes:[{id:'given',narration:'نحدد المعطيات.',actions:[]}],...(regions?{image:{url:question.imageUrl,version:'fixture',marks:regions.items.map((a,i)=>({id:'region'+i,sceneId:'given',kind:'box',x:a.x,y:a.y,width:a.width,height:a.height}))}}:{})};
 (window as any).regionsDraft=value;
 return <main className="mx-auto max-w-2xl p-3" dir="rtl"><QuestionTeachingRegionsEditor question={question} value={value} onChange={setValue}/>
 <button onClick={()=>{setSaved(JSON.parse(JSON.stringify(value)));}}>حفظ السؤال</button><button onClick={()=>setValue(saved)}>إعادة التحميل</button><button onClick={()=>setRevision(r=>r+1)}>تغيير الصورة</button>
 <TeachingBoard elements={boardAt(plan,0,2000,true)} narration="نحدد المعطيات." language="ar-SA" question={{text:'مثال اصطناعي',imageUrl:question.imageUrl,teachingImageVersion:'fixture'}} imagePlayback={{plan,sceneIndex:0,elapsedMs:2000}}/></main>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
