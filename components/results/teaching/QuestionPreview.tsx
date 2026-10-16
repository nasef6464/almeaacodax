import React from 'react';
import { normalizeQuestionHtml } from '../../../utils/questionHtml';

export type TeacherQuestionPreview = { text?: string; imageUrl?: string; imageAlt?: string; options?: string[] };

/** Display only the question already authorized and loaded by the parent page. */
export function QuestionPreview({ question, compact = false }: { question?: TeacherQuestionPreview; compact?: boolean }) {
  if (!question?.text && !question?.imageUrl) return null;
  return <details open={!compact} className="shrink-0 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-100" data-testid="teacher-question">
    <summary className="cursor-pointer px-3 py-2 text-sm font-bold">السؤال</summary>
    <div className="max-h-36 space-y-2 overflow-auto px-3 pb-3 text-sm leading-7">
      {question.text && <div className="question-html [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(question.text) }} />}
      {question.imageUrl && <img src={question.imageUrl} alt={question.imageAlt || 'صورة السؤال'} className="mx-auto max-h-32 max-w-full rounded-lg object-contain" />}
      {question.options?.length ? <div className="grid grid-cols-2 gap-2">{question.options.map((option, index) => <div key={index} className="rounded-lg bg-slate-950/50 px-2" dangerouslySetInnerHTML={{ __html: normalizeQuestionHtml(option) }} />)}</div> : null}
    </div>
  </details>;
}
