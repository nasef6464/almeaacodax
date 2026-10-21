import {stripQuestionHtml} from '../../utils/quizPresentation';
export function classroomOptionPresentation(question: {examType?:string;options?:string[]}, option:string, index:number) {
 const text=stripQuestionHtml(option).trim();
 const latin=question.examType==='tahsili'||question.options?.some(value=>/^[A-D]$/i.test(stripQuestionHtml(value).trim()));
 const label=(latin?['A','B','C','D']:['أ','ب','ج','د','هـ'])[index]||String(index+1);
 const labelOnly=/^(?:[أابجدA-E]|هـ)$/i.test(text);
 return {label:labelOnly?(/^[A-E]$/i.test(text)?text.toUpperCase():text):label,text:labelOnly?'':option};
}
