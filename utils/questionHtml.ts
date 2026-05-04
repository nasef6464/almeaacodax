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
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .trim();
};

export const hasInlineQuestionMedia = (value?: string | null) => /<(img|svg|table|iframe)\b/i.test(normalizeQuestionHtml(value));
