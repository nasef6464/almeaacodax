import React,{useEffect,useState} from 'react';
import {api} from '../../../services/api';
import type {SchoolAssessmentLearnerStatus,SchoolAssessmentReport} from '../../../types/schoolAssessments';
import {SchoolAssessmentReportView} from './SchoolAssessmentReportView';

export const SchoolAssessmentSummaryPanel:React.FC<{quizId:string;actorId:string;schoolId?:string;presentation?:'all'|'summary'|'analysis';onOpenLearners?:(status:SchoolAssessmentLearnerStatus)=>void}>=({quizId,actorId,schoolId,presentation,onOpenLearners})=>{
  const identity=JSON.stringify([actorId,quizId,schoolId]);
  const [revision,setRevision]=useState(0);
  const [state,setState]=useState<{identity:string;data?:SchoolAssessmentReport;error?:boolean}>({identity:''});
  useEffect(()=>{
    let cancelled=false;
    setState({identity});
    api.schoolAssessmentReport(quizId,schoolId).then(data=>{if(!cancelled)setState({identity,data});})
      .catch(()=>{if(!cancelled)setState({identity,error:true});});
    return ()=>{cancelled=true;};
  },[identity,revision,quizId]);
  if(state.identity!==identity||(!state.data&&!state.error))return <p role="status" className="p-4">جارٍ حساب نتائج جميع المستهدفين…</p>;
  if(state.error)return <div role="alert" className="rounded-xl bg-rose-50 p-4">تعذر تحميل ملخص الاختبار أو لا تملك صلاحية عرضه. <button className="underline" onClick={()=>setRevision(n=>n+1)}>إعادة المحاولة</button></div>;
  return <SchoolAssessmentReportView report={state.data!} presentation={presentation} onOpenLearners={onOpenLearners}/>;
};
