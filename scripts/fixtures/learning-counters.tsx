import React from 'react';
import { createRoot } from 'react-dom/client';
import { SimulatedTestExperience } from '../../components/SimulatedTestExperience';
import { LearningCompletionSummary } from '../../components/studentPaths/LearningCompletionSummary';
import { LearningCatalogCounters } from '../../components/studentPaths/LearningCatalogCounters';
import '../../styles/main.css';
const tests = [
  {id:'free',title:'تدريب متاح',duration:'10',questions:10,type:'تدريب',level:'متوسط',isLocked:false},
  {id:'paid',title:'تدريب الباقة',duration:'10',questions:15,type:'تدريب',level:'متوسط',isLocked:true},
];
function App(){const [filter,setFilter]=React.useState('الكل');return <main className="mx-auto max-w-4xl p-3" dir="rtl">
  <LearningCompletionSummary enabled retry={()=>{}} label="تدريبات" stats={{total:1234,completed:315,locked:567}}/>
  <SimulatedTestExperience tests={tests} mode="bank" onStartTest={()=>{}}/>
  <section className="mt-6" aria-label="التأسيس">
    <LearningCompletionSummary enabled retry={()=>{}} label="موضوعات رئيسية" stats={{total:30,completed:5,locked:25}}/>
    <LearningCatalogCounters label="تصفية موضوعات التأسيس" items={[
      {label:'الكل',value:30,active:filter==='الكل',onClick:()=>setFilter('الكل')},
      {label:'المجاني',value:5,tone:'emerald',active:filter==='المجاني',onClick:()=>setFilter('المجاني')},
      {label:'ضمن باقة',value:25,tone:'amber',active:filter==='ضمن باقة',onClick:()=>setFilter('ضمن باقة')},
    ]}/>
  </section>
  <section className="mt-6" aria-label="المحاكيات">
    <LearningCompletionSummary enabled retry={()=>{}} label="اختبارات محاكية" stats={{total:40,completed:7,locked:0}}/>
    <LearningCatalogCounters label="إحصاءات الاختبارات المحاكية" items={[
      {label:'اختبار منشور',compactLabel:'الاختبارات',value:40},
      {label:'سؤال داخل المحاكيات',compactLabel:'الأسئلة',value:12500},
      {label:'قسم اختبار',compactLabel:'الأقسام',value:240,tone:'amber'},
    ]}/>
  </section>
</main>;}
createRoot(document.getElementById('root')!).render(<App/>);
