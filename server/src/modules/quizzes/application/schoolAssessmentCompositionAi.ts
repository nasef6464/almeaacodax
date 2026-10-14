import type {SchoolSpecInterpreter} from './schoolAssessmentComposition.js';
type Gateway=(input:any)=>Promise<{text:string;provider:string;usedFallback:boolean;budgetLimited?:boolean}>;
export const createSchoolSpecInterpreter=(req:any,run:Gateway):SchoolSpecInterpreter=>async(input)=>{
  const result=await run({req,endpoint:'/school-assessments/compose',capability:'authoring',message:input.prompt,
    prompt:`حوّل طلب المعلم إلى مواصفات اختيار من بنك معتمد. لا تنشئ أسئلة أو إجابات أو معرفات أسئلة.
أعد JSON فقط بنفس بنية spec المرفقة دون prompt أو حقول إضافية. التزم بالمسار والنوع والمواد والمهارات وحدود العدد والصعوبة المحددة؛ لا تسقط مادة. استخدم معرفات التصنيف المرفق فقط.
${JSON.stringify(input)}`,
    fallbackText:'',responseMimeType:'application/json',maxOutputTokens:2000});
  if(result.budgetLimited)throw Object.assign(new Error('بلغت ميزانية اقتراح المواصفات حدها؛ المعاينة اليدوية متاحة.'),{statusCode:429});
  if(result.usedFallback||result.provider==='none')throw Object.assign(new Error('مزود اقتراح المواصفات غير متاح؛ المعاينة اليدوية متاحة.'),{statusCode:503});
  try{return JSON.parse(result.text);}catch{throw Object.assign(new Error('تعذر قراءة مواصفات الاقتراح؛ عدّل الطلب أو استخدم المعاينة اليدوية.'),{statusCode:502});}
};
