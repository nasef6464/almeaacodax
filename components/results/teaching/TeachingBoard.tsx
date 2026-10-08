import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { BoardElement } from './boardState';
import { spokenTeachingText } from './spokenMath';
import { readableBoardText } from './boardText';

const Formula: React.FC<{ content: string }> = ({ content }) => {
  const html = React.useMemo(() => {
    try { return katex.renderToString(content, {
      displayMode: false, throwOnError: true, trust: false, maxExpand: 100, maxSize: 10,
    }); } catch { return null; }
  }, [content]);
  return html ? <span dir="ltr" className="inline-block max-w-full overflow-x-auto align-middle" dangerouslySetInnerHTML={{ __html: html }} />
    : <span className="whitespace-pre-wrap">{content}</span>;
};

/** Providers can label prose plus equations as formula. Keep prose readable and math isolated. */
const BoardContent: React.FC<{ content: string; kind: 'text' | 'formula' }> = ({ content, kind }) => {
  const withoutTextCommands = content.replace(/\\(?:text|textbf|mathrm|operatorname)\{[^{}]*\}/g, '');
  const mixed = kind === 'text' || /[\u0600-\u06ff]|[A-Za-z]{3,}\s+[A-Za-z]{3,}|\bStep\b|\$/.test(withoutTextCommands);
  if (!mixed) return <div className="text-center text-xl sm:text-2xl"><Formula content={content} /></div>;
  const readable = readableBoardText(content).replace(/\\\\/g, '\n')
    .replace(/\\textbf\{([^{}]*)\}/g, '$1').replace(/(?<=[.!?])(?=Step\s*\d)/g, '\n');
  const parts = readable.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\([\s\S]+?\\\)|\d+(?:\s*(?:\\times|\\div|[+\-=×÷*/])\s*\d+)+)/g);
  return <p dir="auto" className="whitespace-pre-wrap break-words text-lg leading-8">{parts.map((part, index) => {
    const math = /^(?:\$|\\\(|\d+(?:\s*(?:\\times|\\div|[+\-=×÷*/])))/.test(part);
    return math ? <Formula key={index} content={part.replace(/^\$\$|\$\$$|^\$|\$$|^\\\(|\\\)$/g, '')} /> : <React.Fragment key={index}>{part}</React.Fragment>;
  })}</p>;
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
            <BoardContent content={element.content} kind={element.kind} />
          </div>
        </div>
      ))}
    </div>
    <p className="border-t border-slate-700 pt-4 text-base leading-8 text-slate-300" aria-live="polite" aria-atomic="true">{spokenTeachingText(narration, language)}</p>
    <style>{`.teaching-writing{clip-path:inset(0 calc(100% - var(--reveal)) 0 0)}.teaching-writing-rtl{clip-path:inset(0 0 0 calc(100% - var(--reveal)))}@media(prefers-reduced-motion:reduce){.teaching-writing{clip-path:none}}`}</style>
  </div>
);
