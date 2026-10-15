type QuestionChoice={id:string;options:string[];imageUrl?:string;sourceMeta?:{imageHash?:string;imageVersion?:number}};
// Exact choice identity (not an authorization token or grading key).
export const quizOptionSignature=(question:QuestionChoice)=>JSON.stringify([question.options,question.imageUrl||'',question.sourceMeta?.imageHash||'',question.sourceMeta?.imageVersion||0]);
export const quizAnswerSignatures=(questions:QuestionChoice[],answers:Record<string,number>)=>Object.fromEntries(questions.filter(q=>answers[q.id]!==undefined).map(q=>[q.id,quizOptionSignature(q)]));
export const restoreQuizAnswers=(questions:QuestionChoice[],answers:Record<string,unknown>,signatures:Record<string,string>={})=>Object.fromEntries(questions.filter(q=>Number.isInteger(answers[q.id])&&Number(answers[q.id])>=0&&Number(answers[q.id])<q.options.length&&signatures[q.id]===quizOptionSignature(q)).map(q=>[q.id,Number(answers[q.id])]));

export const mergeRestoredQuizAnswers=(questions:QuestionChoice[],current:Record<string,number>,saved:Record<string,unknown>,signatures:Record<string,string>={})=>({...restoreQuizAnswers(questions,saved,signatures),...current});
