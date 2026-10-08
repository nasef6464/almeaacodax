// Isolated browser fixture: no real users, provider calls, or backend writes.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { InteractiveSmartTeacher } from '../../components/results/InteractiveSmartTeacher';
import { api } from '../../services/api';
import '../../styles/main.css';
const primary = {version:1,language:'ar-SA',scenes:[
{id:'q',narration:'عندنا معادلة أسية.',actions:[{type:'write',id:'eq',kind:'formula',content:'3^{2x-1}=27'}]},
{id:'rewrite',narration:'نكتب سبعة وعشرين كقوة للثلاثة.',actions:[{type:'transform',target:'eq',content:'3^{2x-1}=3^3'},{type:'highlight',target:'eq'}]},
{id:'answer',narration:'نساوي الأسس ثم نحل.',actions:[{type:'transform',target:'eq',content:'2x-1=3'},{type:'write',id:'result',kind:'formula',content:'x=2'},{type:'box',target:'result'}]}
]};
const followup = {version:1,language:'ar-SA',scenes:[{id:'why',narration:'لأن ثلاثة مضروبة في نفسها ثلاث مرات تساوي سبعة وعشرين.',actions:[{type:'write',id:'whyEq',kind:'formula',content:'3 \\times 3 \\times 3 = 27'}]}]};
(window as any).testRequests=[];
(window as any).testSpeak=[];
class TestUtterance { text:string; onend:any; onerror:any; constructor(text:string){this.text=text;} }
(window as any).SpeechSynthesisUtterance=TestUtterance;
Object.defineProperty(window,'speechSynthesis',{value:{speak:(u:any)=>(window as any).testSpeak.push(u),pause:()=>{},resume:()=>{},cancel:()=>{}}, configurable:true});
(api as any).aiQuestionAssistant = async (payload:any) => {
(window as any).testRequests.push(payload);
await new Promise(resolve=>setTimeout(resolve,100));
if ((window as any).testFallback) return {text:'الشرح المعتمد الحالي',storyboard:{version:99}};
if ((window as any).testFailure && payload.boardContext) throw new Error('تعذر مراجعة المحاولة');
if ((window as any).testMixed) return {text:'نراجع الناتج.',storyboard:{version:1,language:'ar-SA',scenes:[{id:'mixed',narration:'نراجع الناتج.',actions:[
  {type:'write',id:'arabic',kind:'formula',content:'الخطوة 1: نضرب الآحاد.\\\\$2 \\times 5 = 10$\\\\آحاد الناتج هو صفر.'},
  {type:'write',id:'english',kind:'formula',content:'Step 1: Multiply: 2 \\times 5 = 10.Step 2: Multiply: 0 \\times 8 = 0.'},
  {type:'write',id:'reply',kind:'text',content:'العملية هي \\textbf{ضرب}.\\nركز على الآحاد.'},
] }]}};
const storyboard=(window as any).testEnglish ? {version:1,language:'en-US',scenes:[{id:'grammar',narration:'Focus on the verb.',actions:[{type:'write',id:'sentence',kind:'text',content:'She has been studying for two hours.'},{type:'highlight',target:'sentence'}]}]} : payload.boardContext ? followup : primary;
if ((window as any).testPractice && storyboard === primary) return {text:'شرح مع تدريب',storyboard:{...primary,scenes:primary.scenes.map((scene,index)=>index===0 ? {...scene,checkpoint:{prompt:'كيف نكتب 27 كقوة للثلاثة؟',hints:['فكر في الضرب المتكرر.','احسب عدد مرات ضرب ثلاثة في نفسها.']}} : scene)}};
return {text:storyboard.scenes.map(s=>s.narration).join('\n'),storyboard};
};
function Demo(){const [open,setOpen]=React.useState(true);return <><button onClick={()=>setOpen(true)}>فتح</button>{open&&<InteractiveSmartTeacher isOpen onClose={()=>setOpen(false)} questionId="test-question" context="result_review" resultId="test-result" tutorSessionId="test-session"/>}</>;}
createRoot(document.getElementById('root')!).render(<Demo/>);

