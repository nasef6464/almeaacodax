import { sanitizeArabicText } from './sanitizeMojibakeArabic';

const decodeBasicHtmlEntities = (value: string) => {
  let output = value;

  for (let i = 0; i < 2; i += 1) {
    output = output
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&amp;/gi, '&');
  }

  return output;
};

export const normalizeQuestionHtml = (value?: string | null) => {
  const normalized = decodeBasicHtmlEntities(sanitizeArabicText(value) || '');

  return normalized
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/<\s*(script|style|object|embed|link|meta|base)[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|object|embed|link|meta|base)\b[^>]*\/?\s*>/gi, '')
    .replace(/\s(?:on[a-z]+|srcdoc)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:href|src|xlink:href)\s*=\s*(["'])\s*(?:javascript:|data:text\/html|vbscript:)[\s\S]*?\1/gi, '')
    .replace(/\s(?:href|src|xlink:href)\s*=\s*(?:javascript:|data:text\/html|vbscript:)[^\s>]*/gi, '')
    .replace(/\sstyle\s*=\s*(["'])[\s\S]*?(?:expression\s*\(|javascript:|vbscript:|data:text\/html)[\s\S]*?\1/gi, '')
    .trim();
};

export const hasInlineQuestionMedia = (value?: string | null) => /<(img|svg|table|iframe)\b/i.test(normalizeQuestionHtml(value));


const QUESTION_BLANK_PATTERN = /(?:\.{3,}|…{2,}|_{3,}|ـ{3,})/g;

/**
 * Presentation-only decoration for Arabic verbal questions.
 * Storage text is never mutated: only visible blank markers are wrapped after sanitization.
 */
export const formatQuestionHtmlForDisplay = (value?: string | null) => {
  const normalized = normalizeQuestionHtml(value);
  if (!normalized) return '';

  return normalized
    .split(/(<[^>]+>)/g)
    .map((part) =>
      part.startsWith('<')
        ? part
        : part.replace(
            QUESTION_BLANK_PATTERN,
            (blank) => `<span class="question-blank" dir="ltr">${blank}</span>`,
          ),
    )
    .join('');
};
