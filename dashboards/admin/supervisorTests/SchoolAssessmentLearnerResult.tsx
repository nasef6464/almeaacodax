import React,{useEffect,useState} from 'react';
import {api} from '../../../services/api';
import type {QuizResult} from '../../../types';
import {QuizSubjectResults} from '../../../components/quiz/QuizSubjectResults';
import {QuestionContentRenderer} from '../../../components/classroom/QuestionContentRenderer';

export const SchoolAssessmentLearnerResult:React.FC<{quizId:string;resultId:string;onClose:()=>void}>=({quizId,resultId,onClose})=>{
 const [revision,setRevision]=useState(0),[state,setState]=useState<{result?:QuizResult;error?:boolean}>({});
 useEffect(()=>{let cancelled=false;setState({});
  api.schoolAssessmentLearnerResult(quizId,resultId).then(data=>{if(!cancelled)setState({result:data.result});})
   .catch(()=>{if(!cancelled)setState({error:true});});return()=>{cancelled=true;};
 },[quizId,resultId,revision]);
 return <section aria-label="تفاصيل نتيجة الطالب" className="space-y-3 rounded-xl border border-indigo-200 p-3">
  <div className="flex justify-between gap-3"><h4 className="font-bold">النتيجة المحفوظة للطالب</h4><button type="button" onClick={onClose} className="rounded-lg border p-2">إغلاق النتيجة</button></div>
  {state.error?<div role="alert"><p>تعذر تحميل النتيجة.</p><button type="button" onClick={()=>setRevision(n=>n+1)} className="rounded-lg border p-2">إعادة تحميل النتيجة</button></div>:!state.result?<p role="status">جارٍ تحميل النتيجة…</p>:<>
   <p>الدرجة الإجمالية: {state.result.score}٪</p><QuizSubjectResults result={state.result}/>
   {!Array.isArray(state.result.subjectResults)&&<p className="text-sm">تفصيل المواد غير متاح لهذه النتيجة القديمة.</p>}
   {Boolean(state.result.skillsAnalysis?.length)&&<details><summary className="cursor-pointer font-bold">جميع المهارات المحفوظة</summary><ul className="space-y-1 text-sm">{state.result.skillsAnalysis!.map((row,i)=><li key={i}>{row.skill}: {row.mastery}٪</li>)}</ul></details>}
   <details open><summary className="cursor-pointer font-bold">إجابات الطالب المحفوظة</summary>{state.result.questionReview?.length?<ol className="space-y-2">{state.result.questionReview.map((row,i)=><li key={`${row.questionId}|${i}`} className="rounded-lg bg-gray-50 p-2"><QuestionContentRenderer content={row.text||(row as typeof row&{questionText?:string}).questionText||'نص السؤال غير متاح'}/>{row.imageUrl&&<img src={row.imageUrl} alt={row.imageAlt||'صورة السؤال المحفوظة'} loading="lazy" className="my-2 max-h-72 max-w-full object-contain"/>}<p className="text-sm">{typeof row.selectedOptionIndex!=='number'||row.selectedOptionIndex<0?'دون إجابة':row.isCorrect?'إجابة صحيحة':'إجابة خاطئة'}</p>{typeof row.selectedOptionIndex==='number'&&row.selectedOptionIndex>=0&&<QuestionContentRenderer content={row.options?.[row.selectedOptionIndex]||'الإجابة المختارة غير متاحة'}/>}</li>)}</ol>:<p>تفاصيل الأسئلة غير متاحة لهذه النتيجة.</p>}</details>
  </>}
 </section>;
};
