import React from 'react';
import { PenLine, Moon, Sun } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { BoardElement } from './boardState';
import { spokenTeachingText } from './spokenMath';
import { readableBoardText, readableBoardProse } from './boardText';
import { QuestionPreview, type TeacherQuestionPreview } from './QuestionPreview';
import { WhiteboardInk } from './WhiteboardInk';
import { WhiteboardWriting } from './WhiteboardWriting';
import {TeachingImageOverlay} from './TeachingImageOverlay';
import type {TeachingStoryboardV2} from '../../../server/src/modules/ai/contracts/teachingImageStoryboard';

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
  if (!mixed) return <div className="space-y-2 text-center text-xl sm:text-2xl">{readableBoardText(content).split(/\r?\n/).filter(line => line.trim()).map((line, index) => <div key={index} data-testid="teaching-formula-line"><Formula content={line} /></div>)}</div>;
  const readable = readableBoardText(content).replace(/\\\\/g, '\n')
    .replace(/\\textbf\{([^{}]*)\}/g, '$1').replace(/(?<=[.!?])(?=Step\s*\d)/g, '\n');
  const parts = readable.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\([\s\S]+?\\\)|\d+(?:\s*(?:\\times|\\div|[+\-=×÷*/])\s*\d+)+)/g);
  return <p dir="auto" className="whitespace-pre-wrap break-words text-lg leading-8">{parts.map((part, index) => {
    const math = /^(?:\$|\\\(|\d+(?:\s*(?:\\times|\\div|[+\-=×÷*/])))/.test(part);
    return math ? <Formula key={index} content={part.replace(/^\$\$|\$\$$|^\$|\$$|^\\\(|\\\)$/g, '')} /> : <React.Fragment key={index}>{readableBoardProse(part)}</React.Fragment>;
  })}</p>;
};

export const TeachingBoard: React.FC<{ elements: BoardElement[]; narration: string; language: string; question?: TeacherQuestionPreview; questionCompact?: boolean; imagePlayback?:{plan:TeachingStoryboardV2;sceneIndex:number;elapsedMs:number} }> = ({ elements, narration, language, question, questionCompact, imagePlayback }) => {
  const [dark, setDark] = React.useState(false);
  const activeElement = elements.find(element => element.active) || elements[elements.length - 1];
  const activeRow = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    activeRow.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }, [activeElement?.id, activeElement?.content]);
  return <div className={`whiteboard-page relative flex min-h-full flex-col gap-4 overflow-x-clip ${dark ? 'bg-slate-950 text-slate-100' : 'bg-[#fdfefb] text-slate-900'}`}
    data-testid="teaching-board" data-surface="whiteboard" data-theme={dark ? 'dark' : 'paper'} dir={language.startsWith('ar') ? 'rtl' : 'ltr'}>
    <div className={`sticky top-0 z-10 flex items-center justify-between border-b px-4 py-2 ${dark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-[#fdfefb]/95'}`}>
      <span className={`inline-flex items-center gap-2 text-xs font-bold ${dark ? 'text-slate-400' : 'text-slate-500'}`}><PenLine size={15} /> السبورة</span>
      <button type="button" onClick={() => setDark(value => !value)} aria-label="تبديل لون السبورة" aria-pressed={dark}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs ${dark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
        {dark ? <Sun size={16} /> : <Moon size={16} />}{dark ? 'خلفية بيضاء' : 'خلفية داكنة'}
      </button>
    </div>
    <QuestionPreview question={question} compact={questionCompact} onBoard dark={dark} imageOverlay={imagePlayback&&<TeachingImageOverlay {...imagePlayback} imageUrl={question?.imageUrl} expectedImageVersion={question?.teachingImageVersion}/>}/>
    <div className="min-h-48 space-y-5 px-3 py-3 sm:px-6" aria-label="خطوات السبورة">
      {elements.map((element, index) => {
        const current = element.id === activeElement?.id;
        const rtl = language.startsWith('ar') && (element.kind === 'text' || /[\u0600-\u06ff]/.test(element.content));
        const ink = element.history ? (dark ? 'text-slate-400' : 'text-slate-500')
          : element.emphasis === 'box' ? (dark ? 'text-emerald-300' : 'text-emerald-800')
          : element.emphasis === 'highlight' ? (dark ? 'text-amber-200' : 'text-amber-900') : '';
        return <div key={element.id} ref={current ? activeRow : undefined} aria-current={current ? 'step' : undefined}
          data-board-history={element.history ? 'true' : undefined} className={`grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-2 scroll-mt-20 ${ink}`}>
          <span aria-hidden="true" className={`pt-2 text-center text-xs tabular-nums ${current ? (dark ? 'text-cyan-300' : 'text-cyan-700') : 'text-slate-400'}`}>{index + 1}</span>
          <div className="min-w-0 text-center">
            <div className="whiteboard-ink-track relative inline-block max-w-full px-3 py-2"
              style={{ '--reveal': `${Math.round(element.progress * 100)}%` } as React.CSSProperties}>
              <WhiteboardWriting key={element.content} progress={element.progress} rtl={rtl} active={current}>
                <BoardContent content={element.content} kind={element.kind} />
              </WhiteboardWriting>
              {element.emphasis && <WhiteboardInk key={`${element.emphasis}:${element.content}`} kind={element.emphasis} progress={element.inkProgress ?? 1} active={current} />}
            </div>
          </div>
        </div>;
      })}
    </div>
    <details className={`mx-4 mt-auto border-t py-3 text-sm ${dark ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
      <summary className="min-h-11 cursor-pointer py-3 text-xs">نص الشرح</summary>
      <p className="leading-7" aria-live="polite" aria-atomic="true">{spokenTeachingText(narration, language)}</p>
    </details>
    <style>{`.whiteboard-page{background-image:linear-gradient(transparent 31px,rgba(100,116,139,.045) 32px);background-size:100% 32px}.whiteboard-ink-track{isolation:isolate}.whiteboard-hand{filter:drop-shadow(1px 2px 1px rgba(15,23,42,.12));transform-origin:0 0}@media(prefers-reduced-motion:reduce){.teaching-writing{clip-path:none!important}.whiteboard-hand{display:none}.whiteboard-ink path,[data-testid=teaching-image-mark] path{stroke-dashoffset:0}}`}</style>
  </div>;
};
