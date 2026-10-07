import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export interface InteractiveWhiteboardCanvasProps {
  text: string;
  onAskAboutStep?: (stepPrompt: string) => void;
  onSpeakText?: (speechText: string) => void;
  isPending?: boolean;
}

export interface ParsedStep {
  id: string;
  index: number;
  title: string;
  type: 'concept' | 'calc' | 'result' | 'flow';
  body: string;
  equations: string[];
}

/**
 * Render KaTeX math formula safely
 */
export const renderKaTeX = (latex: string, isBlock = false): string => {
  try {
    return katex.renderToString(latex.trim(), {
      throwOnError: false,
      displayMode: isBlock,
    });
  } catch {
    return latex;
  }
};

/**
 * Parses teacher explanation text into pedagogical chalkboard steps
 */
export const parseChalkboardSteps = (rawText: string): ParsedStep[] => {
  const clean = rawText.trim();
  if (!clean) return [];

  // Match explicit steps or split into smart pedagogical chunks
  const stepDelimiters = /(?:^|\n)(?=(?:[*#\s]*الخطوة\s*[:\d]|[*#\s]*\d+[\.\)]\s*|[*#\s]*(?:📌|🔢|💡|📐|🎯|✅)|أولاً|ثانياً|ثالثاً|رابعاً|القاعدة\s*الذهبية|السر\s*الجبري|طريقة\s*الحل|الاستنتاج|النتيجة))/gi;
  let chunks = clean.split(stepDelimiters).map((c) => c.trim()).filter(Boolean);

  if (chunks.length <= 1) {
    const paragraphs = clean.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length > 1) {
      chunks = paragraphs;
    } else {
      const sentences = clean.split(/(?<=[.!?؟])\s+/).filter(Boolean);
      if (sentences.length >= 3) {
        chunks = [
          sentences.slice(0, Math.ceil(sentences.length / 2)).join(' '),
          sentences.slice(Math.ceil(sentences.length / 2)).join(' '),
        ];
      } else {
        chunks = [clean];
      }
    }
  }

  return chunks.map((chunk, idx) => {
    let title = `الخطوة ${idx + 1}`;
    let type: ParsedStep['type'] = 'calc';

    if (/قاعدة|مفهوم|الفكرة|سر|ذهبية|📌/i.test(chunk)) {
      title = `الخطوة ${idx + 1}: السر الجبري والقاعدة الذهبية`;
      type = 'concept';
    } else if (/حساب|تعويض|ضرب|قسمة|أس|معادلة|🔢|📐/i.test(chunk)) {
      title = `الخطوة ${idx + 1}: خطوات التطبيق والحل`;
      type = 'calc';
    } else if (/خيار|إجابة|نتيجة|أخيراً|💡|🎯|✅/i.test(chunk)) {
      title = `الخطوة ${idx + 1}: النتيجة والخيار النهائي`;
      type = 'result';
    } else if (idx === 0) {
      title = 'الخطوة 1: فكرة المسألة والمعطيات';
      type = 'concept';
    } else if (idx === chunks.length - 1) {
      title = `الخطوة ${idx + 1}: الاستنتاج النهائي`;
      type = 'result';
    }

    // Extract LaTeX equations ($$..$$ or $..$)
    const equations: string[] = [];
    const blockMathRegex = /\$\$([\s\S]+?)\$\$/g;
    let match: RegExpExecArray | null;
    while ((match = blockMathRegex.exec(chunk)) !== null) {
      if (match[1]) equations.push(match[1].trim());
    }
    const inlineMathRegex = /(?<!\$)\$([^\$\n]+?)\$(?!\$)/g;
    while ((match = inlineMathRegex.exec(chunk)) !== null) {
      if (match[1] && !equations.includes(match[1].trim())) {
        equations.push(match[1].trim());
      }
    }

    return {
      id: `step-${idx}-${Date.now()}`,
      index: idx + 1,
      title,
      type,
      body: chunk,
      equations,
    };
  });
};

/**
 * Formats mathematical content into themed KaTeX blocks (Dark Slate or Whiteboard)
 */
export const ChalkboardMathContent: React.FC<{ content: string; isDark?: boolean }> = ({ content, isDark = true }) => {
  const parts = useMemo(() => {
    const tokens: Array<{ type: 'text' | 'inline-math' | 'block-math'; value: string }> = [];
    let remaining = content;

    while (remaining.length > 0) {
      const blockIdx = remaining.indexOf('$$');
      const inlineIdx = remaining.search(/(?<!\$)\$([^\$\n]+?)\$(?!\$)/);

      if (blockIdx === -1 && inlineIdx === -1) {
        tokens.push({ type: 'text', value: remaining });
        break;
      }

      if (blockIdx !== -1 && (inlineIdx === -1 || blockIdx <= inlineIdx)) {
        if (blockIdx > 0) tokens.push({ type: 'text', value: remaining.slice(0, blockIdx) });
        const endBlock = remaining.indexOf('$$', blockIdx + 2);
        if (endBlock !== -1) {
          tokens.push({
            type: 'block-math',
            value: remaining.slice(blockIdx + 2, endBlock),
          });
          remaining = remaining.slice(endBlock + 2);
        } else {
          tokens.push({ type: 'text', value: remaining.slice(blockIdx) });
          break;
        }
      } else if (inlineIdx !== -1) {
        if (inlineIdx > 0) tokens.push({ type: 'text', value: remaining.slice(0, inlineIdx) });
        const match = remaining.slice(inlineIdx).match(/^\$([^\$\n]+?)\$/);
        if (match) {
          tokens.push({ type: 'inline-math', value: match[1] });
          remaining = remaining.slice(inlineIdx + match[0].length);
        } else {
          tokens.push({ type: 'text', value: remaining.slice(inlineIdx, inlineIdx + 1) });
          remaining = remaining.slice(inlineIdx + 1);
        }
      }
    }

    return tokens;
  }, [content]);

  return (
    <div className={`space-y-3 leading-relaxed ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      {parts.map((part, i) => {
        if (part.type === 'block-math') {
          return (
            <div
              key={i}
              dir="ltr"
              className={`my-3 overflow-x-auto rounded-2xl p-4 text-center text-xl font-bold shadow-inner ${
                isDark
                  ? 'border border-emerald-500/30 bg-slate-900/90 text-emerald-300'
                  : 'border border-violet-200 bg-violet-50/80 text-violet-900 shadow-sm'
              }`}
              dangerouslySetInnerHTML={{ __html: renderKaTeX(part.value, true) }}
            />
          );
        }
        if (part.type === 'inline-math') {
          return (
            <span
              key={i}
              dir="ltr"
              className={`mx-1 inline-block rounded-lg px-2 py-0.5 font-bold ${
                isDark
                  ? 'border border-emerald-500/20 bg-emerald-950/40 text-emerald-300'
                  : 'border border-violet-200 bg-violet-100/80 text-violet-950'
              }`}
              dangerouslySetInnerHTML={{ __html: renderKaTeX(part.value, false) }}
            />
          );
        }
        return (
          <span key={i} className={`whitespace-pre-wrap leading-8 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            {part.value}
          </span>
        );
      })}
    </div>
  );
};
