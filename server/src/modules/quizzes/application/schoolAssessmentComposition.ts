import {randomUUID} from 'node:crypto';
import {z} from 'zod';

const subjectSpec=z.object({
  subjectId:z.string().min(1).max(200),
  skillIds:z.array(z.string().min(1).max(200)).max(100).default([]),
  count:z.number().int().min(1).max(200),
  difficulty:z.enum(['Easy','Medium','Hard']).optional(),
}).strict();
export const schoolCompositionSchema=z.object({
  kind:z.enum(['normal','mock']),pathId:z.string().min(1).max(200),
  subjectSpecs:z.array(subjectSpec).min(1).max(20),
  prompt:z.string().trim().min(1).max(2000).optional(),
}).strict().superRefine((value,ctx)=>{
  if(value.kind==='normal'&&value.subjectSpecs.length!==1)
    ctx.addIssue({code:'custom',message:'الاختبار العادي لمادة واحدة؛ اختر محاكيًا لمجموعة مواد.'});
  if(new Set(value.subjectSpecs.map(s=>s.subjectId)).size!==value.subjectSpecs.length)
    ctx.addIssue({code:'custom',message:'أضف كل مادة مرة واحدة ثم عدّل أقسامها في المعاينة.'});
  if(value.subjectSpecs.reduce((sum,s)=>sum+s.count,0)>500)
    ctx.addIssue({code:'custom',message:'الحد الأقصى للمعاينة 500 سؤال.'});
});
export type SchoolCompositionSpec=z.infer<typeof schoolCompositionSchema>;
export type SchoolCompositionSubject={id:string;name:string;skillIds:string[];skills?:{id:string;name:string}[]};
export type SchoolSpecInterpreter=(input:{spec:Omit<SchoolCompositionSpec,'prompt'>;prompt:string;subjects:SchoolCompositionSubject[]})=>Promise<unknown>;
export type CompositionContext={
  pathId:string;subjects:SchoolCompositionSubject[];
  select:(spec:SchoolCompositionSpec['subjectSpecs'][number],excluded:string[])=>Promise<{available:number;questions:{id:string;key:string;aliases?:string[]}[]}>;
};
const fail=(statusCode:number,message:string):never=>{throw Object.assign(new Error(message),{statusCode});};

export async function composeSchoolAssessment(context:CompositionContext,raw:unknown,interpret?:SchoolSpecInterpreter){
  const requested=schoolCompositionSchema.parse(raw);
  const authorize=(spec:SchoolCompositionSpec)=>{
    if(spec.pathId!==context.pathId)fail(403,'مسار خارج نطاق المعاينة.');
    for(const item of spec.subjectSpecs){
      const subject=context.subjects.find(s=>s.id===item.subjectId);
      if(!subject||item.skillIds.some(id=>!subject.skillIds.includes(id)))fail(403,'مادة أو مهارة خارج النطاق المسموح.');
    }
  };
  authorize(requested);
  let spec=requested;
  if(requested.prompt){
    if(!interpret)fail(503,'خدمة اقتراح المواصفات غير متاحة؛ يمكنك المعاينة يدويًا.');
    const {prompt,...filters}=requested;
    // Only the selected taxonomy is sent; no learners, question bodies or keys.
    const subjects=context.subjects.filter(s=>filters.subjectSpecs.some(item=>item.subjectId===s.id)).map(s=>{
      const selected=filters.subjectSpecs.find(item=>item.subjectId===s.id)!;
      const skillIds=selected.skillIds.length?selected.skillIds:s.skillIds; return {...s,skillIds,skills:s.skills?.filter(skill=>skillIds.includes(skill.id))};
    });
    const aiInput={spec:filters,prompt,subjects};
    if(JSON.stringify(aiInput).length>30000)fail(422,'حدد مهارات أكثر دقة لتقليل حجم الاقتراح؛ المعاينة اليدوية متاحة.');
    const answer=await interpret!(aiInput);
    if(answer&&typeof answer==='object'&&Object.hasOwn(answer,'prompt'))fail(400,'استجابة مواصفات غير صالحة.');
    spec=schoolCompositionSchema.parse(answer);
    authorize(spec);
    if(spec.kind!==requested.kind||spec.pathId!==requested.pathId||spec.subjectSpecs.length!==requested.subjectSpecs.length)fail(400,'الاقتراح غيّر نوع الاختبار أو مساره.');
    for(const item of spec.subjectSpecs){
      const original=requested.subjectSpecs.find(s=>s.subjectId===item.subjectId);
      if(!original||item.count>original.count||(original.difficulty&&item.difficulty!==original.difficulty)
        ||(original.skillIds.length&&(!item.skillIds.length||item.skillIds.some(id=>!original.skillIds.includes(id)))))
        fail(400,'الاقتراح تجاوز المواد أو المهارات أو حدود العدد المحددة.');
    }
  }
  const used=new Set<string>(),questionIds:string[]=[],sections:any[]=[],coverage:any[]=[],warnings:string[]=[];
  for(const item of spec.subjectSpecs){
    const subject=context.subjects.find(s=>s.id===item.subjectId)!;
    const selection=await context.select(item,[...used]);
    const unique:typeof selection.questions=[];
    for(const question of selection.questions){
      if(unique.length===item.count)break;
      const identities=[question.key,...(question.aliases||[])];
      if(identities.some(key=>used.has(key)))continue;
      identities.forEach(key=>used.add(key));unique.push(question);
    }
    const ids=unique.map(q=>q.id);questionIds.push(...ids);
    coverage.push({subjectId:item.subjectId,skillIds:item.skillIds,requested:item.count,available:selection.available,selected:ids.length});
    if(ids.length<item.count)warnings.push(`${subject.name}: طُلب ${item.count} والمتاح المطابق غير المكرر ${selection.available}؛ اختر عددًا أو شروطًا أخرى.`);
    sections.push({id:'section_'+randomUUID(),title:subject.name,subjectId:item.subjectId,questionIds:ids,order:sections.length,domain:'general'});
  }
  const draft:any={title:spec.kind==='mock'?'محاكي مقترح':'اختبار مقترح',pathId:spec.pathId,subjectId:spec.subjectSpecs[0].subjectId,
    type:'quiz',quizKind:spec.kind==='mock'?'mock':'test',questionIds,skillIds:[...new Set(spec.subjectSpecs.flatMap(s=>s.skillIds))],
    mode:'central',isPublished:false,showOnPlatform:false,targetGroupIds:[],targetUserIds:[]};
  if(spec.kind==='mock')draft.mockExam={enabled:true,presentationMode:'flexible',sections};
  return {draft,coverage,warnings};
}
