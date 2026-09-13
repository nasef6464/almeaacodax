import React from 'react';
import { normalizeQuestionHtml } from '../../utils/questionHtml';

interface QuestionContentRendererProps {
  content?: string | null;
  className?: string;
  imageClassName?: string;
  asHeading?: boolean;
}

export const QuestionContentRenderer: React.FC<QuestionContentRendererProps> = ({
  content,
  className = '',
  imageClassName = '',
  asHeading = false,
}) => {
  if (!content) return null;

  const normalized = normalizeQuestionHtml(content);
  const containsHtml = /<[a-z][\s\S]*>/i.test(normalized);

  if (containsHtml) {
    return (
      <div
        className={`question-content-html overflow-hidden break-words text-slate-900 dark:text-white leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-[360px] sm:[&_img]:max-h-[440px] [&_img]:object-contain [&_img]:rounded-2xl [&_img]:mx-auto [&_img]:my-3 [&_img]:block [&_img]:shadow-xs [&_table]:w-full [&_table]:border-collapse ${imageClassName} ${className}`}
        dangerouslySetInnerHTML={{ __html: normalized }}
      />
    );
  }

  if (asHeading) {
    return (
      <h1 className={`break-words text-slate-900 dark:text-white leading-relaxed ${className}`}>
        {content}
      </h1>
    );
  }

  return (
    <span className={`break-words text-slate-900 dark:text-white leading-relaxed ${className}`}>
      {content}
    </span>
  );
};
