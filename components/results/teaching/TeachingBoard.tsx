import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { BoardElement } from './boardState';

const Formula: React.FC<{ content: string }> = ({ content }) => {
  const html = React.useMemo(() => katex.renderToString(content, {
    displayMode: true, throwOnError: false, trust: false, maxExpand: 100, maxSize: 10,
  }), [content]);
  return <div dir="ltr" className="overflow-x-auto text-center text-xl sm:text-2xl" dangerouslySetInnerHTML={{ __html: html }} />;
};

export const TeachingBoard: React.FC<{ elements: BoardElement[]; narration: string; language: string }> = ({ elements, narration, language }) => (
  <div className="flex min-h-64 flex-col gap-5 p-3 sm:p-6" data-testid="teaching-board" dir={language.startsWith('ar') ? 'rtl' : 'ltr'}>
    <div className="min-h-48 space-y-5" aria-label="خطوات السبورة">
      {elements.map(element => (
        <div key={element.id} className={`rounded-xl px-4 py-3 transition-colors motion-reduce:transition-none ${
          element.emphasis === 'box' ? 'border-2 border-emerald-400 bg-emerald-500/10' :
          element.emphasis === 'highlight' ? 'bg-amber-400/15 text-amber-200' : 'text-slate-100'
        }`}>
          <div key={element.content} className={`teaching-writing ${element.kind === 'text' && language.startsWith('ar') ? 'teaching-writing-rtl' : ''}`} style={{ '--reveal': `${Math.round(element.progress * 100)}%` } as React.CSSProperties}>
            {element.kind === 'formula' ? <Formula content={element.content} /> : <p className="whitespace-pre-wrap text-lg leading-8">{element.content}</p>}
          </div>
        </div>
      ))}
    </div>
    <p className="border-t border-slate-700 pt-4 text-base leading-8 text-slate-300" aria-live="polite" aria-atomic="true">{narration}</p>
    <style>{`.teaching-writing{clip-path:inset(0 calc(100% - var(--reveal)) 0 0)}.teaching-writing-rtl{clip-path:inset(0 0 0 calc(100% - var(--reveal)))}@media(prefers-reduced-motion:reduce){.teaching-writing{clip-path:none}}`}</style>
  </div>
);
