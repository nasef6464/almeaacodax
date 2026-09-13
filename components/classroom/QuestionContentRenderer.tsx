import React from 'react';
import { normalizeQuestionHtml } from '../../utils/questionHtml';

interface QuestionContentRendererProps {
  content?: string | null;
  className?: string;
  imageClassName?: string;
  asHeading?: boolean;
}

const ALLOWED_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'div', 'em', 'i', 'img', 'li', 'ol', 'p', 'span', 'strong', 'sub', 'sup',
  'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul',
]);
const GLOBAL_ALLOWED_ATTRIBUTES = new Set(['dir', 'lang', 'title']);
const SAFE_IMAGE_DATA_URL = /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const isSafeUrl = (value: string, allowImageData = false) => {
  const normalized = value.trim();
  if (!normalized) return false;
  if (allowImageData && SAFE_IMAGE_DATA_URL.test(normalized)) return true;
  if (normalized.startsWith('/') || normalized.startsWith('./') || normalized.startsWith('../') || normalized.startsWith('#')) return true;
  try {
    const parsed = new URL(normalized, 'https://almeaa.invalid');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
};

const sanitizeRichQuestionHtml = (value: string) => {
  const normalized = normalizeQuestionHtml(value);
  if (typeof DOMParser === 'undefined') return escapeHtml(normalized.replace(/<[^>]*>/g, ''));

  const documentNode = new DOMParser().parseFromString(`<div>${normalized}</div>`, 'text/html');
  const root = documentNode.body.firstElementChild;
  if (!root) return '';

  const nodes = Array.from(root.querySelectorAll('*'));
  nodes.forEach((element) => {
    const tag = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      element.replaceWith(documentNode.createTextNode(element.textContent || ''));
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      const allowedForTag =
        (tag === 'img' && ['src', 'alt', 'width', 'height', 'loading'].includes(name))
        || (tag === 'a' && ['href', 'target', 'rel'].includes(name))
        || (['td', 'th'].includes(tag) && ['colspan', 'rowspan'].includes(name));

      if (!GLOBAL_ALLOWED_ATTRIBUTES.has(name) && !allowedForTag) {
        element.removeAttribute(attribute.name);
        return;
      }
      if (tag === 'img' && name === 'src' && !isSafeUrl(value, true)) element.removeAttribute(attribute.name);
      if (tag === 'a' && name === 'href' && !isSafeUrl(value)) element.removeAttribute(attribute.name);
    });

    if (tag === 'a') {
      element.setAttribute('rel', 'noopener noreferrer');
      if (element.getAttribute('target') !== '_blank') element.removeAttribute('target');
    }
    if (tag === 'img') element.setAttribute('loading', 'lazy');
  });

  return root.innerHTML;
};

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
    const safeHtml = sanitizeRichQuestionHtml(normalized);
    return (
      <div
        className={`question-content-html overflow-hidden break-words text-slate-900 dark:text-white leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_img]:max-w-full [&_img]:h-auto [&_img]:max-h-[360px] sm:[&_img]:max-h-[440px] [&_img]:object-contain [&_img]:rounded-2xl [&_img]:mx-auto [&_img]:my-3 [&_img]:block [&_img]:shadow-xs [&_table]:w-full [&_table]:border-collapse ${imageClassName} ${className}`}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
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
