import type {QuizResult} from '../../../types';

export function assessmentSectionSummaries(results:Pick<QuizResult,'sectionResults'>[]){
 const groups=new Map<string,{sectionId:string;subjectId:string;name:string;scoreSum:number;passCount:number;count:number}>();
 for(const result of results)for(const section of result.sectionResults||[]){
  const sectionId=String(section.sectionId),subjectId=String(section.subjectId||'');
  const key=JSON.stringify([subjectId,sectionId]);
  const row=groups.get(key)||{sectionId,subjectId,name:[section.subjectName,section.sectionName||sectionId].filter(Boolean).join(' — '),scoreSum:0,passCount:0,count:0};
  row.scoreSum+=Number(section.score||0);row.passCount+=section.score>=60?1:0;row.count++;
  groups.set(key,row);
 }
 return [...groups].map(([key,row])=>({key,sectionId:row.sectionId,subjectId:row.subjectId,sectionName:row.name,attempts:row.count,
  avgScore:Math.round(row.scoreSum/row.count),passRate:Math.round(row.passCount/row.count*100),
 })).sort((a,b)=>a.avgScore-b.avgScore);
}
