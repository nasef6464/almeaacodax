import React, { useMemo, useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { FunctionSquare, PencilRuler, Sigma } from 'lucide-react';
import { QuestionDrawingPad } from './QuestionDrawingPad';
import { normalizeQuestionHtml } from '../utils/questionHtml';

if (typeof window !== 'undefined') {
  (window as any).katex = katex;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const WORD_PASTE_PATTERN = /(?:class="?Mso|mso-|<o:p|xmlns:o|urn:schemas-microsoft-com:office:word|<!--\[if)/i;
const RICH_PASTE_PATTERN = /<(table|img|sup|sub|span|math|mfrac|msup|msub|annotation|svg)\b/i;
const SAFE_WORD_STYLE_PROPERTIES = new Set([
  'text-align',
  'direction',
  'vertical-align',
  'border',
  'border-collapse',
  'padding',
  'background',
  'background-color',
  'color',
  'font-weight',
  'font-style',
  'font-family',
  'font-size',
  'line-height',
  'text-decoration',
  'width',
  'height',
  'display',
]);

const SAFE_WORD_ATTRIBUTES = new Set([
  'src',
  'alt',
  'title',
  'width',
  'height',
  'colspan',
  'rowspan',
]);

const LEGACY_FONT_SIZE_MAP: Record<string, string> = {
  '1': '10px',
  '2': '13px',
  '3': '16px',
  '4': '18px',
  '5': '24px',
  '6': '32px',
  '7': '48px',
};

const mathTemplates = [
  { label: 'كسر عربي', formula: '\\frac{\\text{س}}{\\text{ص}}' },
  { label: 'كسر إنجليزي', formula: '\\frac{x}{y}' },
  { label: 'عدد كسري', formula: '1\\frac{3}{5}' },
  { label: 'كسر داخل قوس', formula: '\\left(\\frac{444}{555}\\div\\frac{666}{333}\\right)' },
  { label: 'جذر', formula: '\\sqrt{\\text{س}}' },
  { label: 'جذر تربيعي', formula: '\\sqrt{a^2+b^2}' },
  { label: 'جذر مع كسر', formula: '\\sqrt{\\frac{\\text{س}}{\\text{ص}}}' },
  { label: 'أس', formula: '\\text{س}^{2}+\\text{ص}^{2}' },
  { label: 'زاوية', formula: 'm\\angle \\text{س} = 45^\\circ' },
  { label: 'قوس دائرة', formula: 'm\\widehat{AB}=120^\\circ' },
  { label: 'قانون دائرة', formula: 'm\\angle 1=\\frac{1}{2}m\\widehat{AB}' },
  { label: 'نسبة', formula: '\\text{أ}:\\text{ب} = 3:5' },
  { label: 'متتابعة', formula: '1,\\ 3,\\ 5,\\ \\ldots' },
  { label: 'متتابعة كسور', formula: '\\frac{1}{5},\\ \\frac{3}{5},\\ \\frac{7}{5},\\ \\ldots' },
  { label: 'اختيار قدرات', formula: '\\frac{444}{555}\\div\\frac{666}{333}' },
];

const mathSymbols = ['±', '×', '÷', '≈', '≠', '≤', '≥', '∞', '√', '∠', '°', 'π', '²', '³', '½', '⅓', '¼'];

const cleanInlineStyle = (style: string) =>
  style
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const [rawProperty, ...rawValue] = item.split(':');
      const property = rawProperty?.trim().toLowerCase();
      const value = rawValue.join(':').trim().toLowerCase();

      if (!property || property.startsWith('mso-')) return false;
      if (!SAFE_WORD_STYLE_PROPERTIES.has(property)) return false;
      return !/(expression\s*\(|javascript:|vbscript:|data:text\/html)/i.test(value);
    })
    .join('; ');

const unwrapElement = (element: Element) => {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
};

const insertCleanedHtmlDirectly = (root: HTMLElement, html: string) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const commonAncestor = range?.commonAncestorContainer;
  const canInsertAtSelection = Boolean(commonAncestor && root.contains(commonAncestor));

  root.focus();
  if (range && canInsertAtSelection) {
    range.deleteContents();
    range.insertNode(fragment);
    selection?.removeAllRanges();
    return;
  }

  root.append(fragment);
};

const cleanWordPasteHtml = (html: string) => {
  if (typeof window === 'undefined' || !html.trim()) return normalizeQuestionHtml(html);

  const source = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<xml[\s\S]*?<\/xml>/gi, '')
    .replace(/<\/?o:[^>]*>/gi, '')
    .replace(/\sxmlns(?::\w+)?=(["'])[\s\S]*?\1/gi, '');

  const document = new DOMParser().parseFromString(source, 'text/html');

  document.body.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();

      if (name === 'class' && /\bMso/i.test(attribute.value)) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (name === 'style') {
        const cleanedStyle = cleanInlineStyle(attribute.value);
        if (cleanedStyle) {
          element.setAttribute('style', cleanedStyle);
        } else {
          element.removeAttribute(attribute.name);
        }
        return;
      }

      if (SAFE_WORD_ATTRIBUTES.has(name)) return;

      if (name.startsWith('xmlns') || name === 'lang' || name === 'face') {
        element.removeAttribute(attribute.name);
      }
    });

    const tagName = element.tagName.toLowerCase();
    if (tagName === 'font') {
      const face = element.getAttribute('face');
      const size = element.getAttribute('size');
      const color = element.getAttribute('color');
      const fontSize = size ? LEGACY_FONT_SIZE_MAP[size] || size : '';
      const fontStyles = [
        face ? `font-family: ${face}` : '',
        fontSize ? `font-size: ${fontSize}` : '',
        color ? `color: ${color}` : '',
      ].filter(Boolean);

      if (fontStyles.length) {
        const span = document.createElement('span');
        span.setAttribute('style', cleanInlineStyle(fontStyles.join('; ')));
        while (element.firstChild) {
          span.appendChild(element.firstChild);
        }
        element.replaceWith(span);
        return;
      }

      unwrapElement(element);
      return;
    }

    if (tagName === 'span' && !element.attributes.length) {
      unwrapElement(element);
    }
  });

  return normalizeQuestionHtml(document.body.innerHTML);
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<ReactQuill | null>(null);
  const [showDrawingPad, setShowDrawingPad] = useState(false);
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        [{ direction: 'rtl' }, { align: [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ script: 'sub' }, { script: 'super' }],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        ['link', 'image', 'video', 'formula'],
        [{ color: [] }, { background: [] }],
        ['clean'],
      ],
      table: true,
      clipboard: {
        matchVisual: false,
      },
    }),
    [],
  );

  const insertFormulaTemplate = (formula: string) => {
    const editor = editorRef.current?.getEditor();
    if (!editor) return;

    const range = editor.getSelection(true);
    const insertAt = range?.index ?? editor.getLength();
    editor.insertEmbed(insertAt, 'formula', formula, 'user');
    editor.insertText(insertAt + 1, ' ', 'user');
    editor.setSelection(insertAt + 2, 0, 'silent');
    onChange(normalizeQuestionHtml(editor.root.innerHTML));
  };

  const insertTextSymbol = (symbol: string) => {
    const editor = editorRef.current?.getEditor();
    if (!editor) return;

    const range = editor.getSelection(true);
    const insertAt = range?.index ?? editor.getLength();
    editor.insertText(insertAt, symbol, 'user');
    editor.setSelection(insertAt + symbol.length, 0, 'silent');
    onChange(normalizeQuestionHtml(editor.root.innerHTML));
  };

  const insertDrawingImage = (dataUrl: string) => {
    const editor = editorRef.current?.getEditor();
    if (!editor) return;

    const range = editor.getSelection(true);
    const insertAt = range?.index ?? editor.getLength();
    editor.insertEmbed(insertAt, 'image', dataUrl, 'user');
    editor.setSelection(insertAt + 1, 0, 'silent');
    onChange(normalizeQuestionHtml(editor.root.innerHTML));
  };

  const handlePasteCapture = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const html = event.clipboardData.getData('text/html');
    if (!html || (!WORD_PASTE_PATTERN.test(html) && !RICH_PASTE_PATTERN.test(html))) return;

    const editor = editorRef.current?.getEditor();
    const cleanedHtml = cleanWordPasteHtml(html);
    if (!editor || !cleanedHtml) return;

    event.preventDefault();
    const range = editor.getSelection(true);
    const insertAt = range?.index ?? editor.getLength();

    if (/<table\b/i.test(cleanedHtml)) {
      insertCleanedHtmlDirectly(editor.root, cleanedHtml);
      onChange(normalizeQuestionHtml(editor.root.innerHTML));
      return;
    }

    editor.clipboard.dangerouslyPasteHTML(insertAt, cleanedHtml, 'user');
    onChange(normalizeQuestionHtml(editor.root.innerHTML));
  };

  const formats = [
    'header',
    'direction',
    'align',
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'script',
    'list',
    'indent',
    'link',
    'image',
    'video',
    'formula',
    'table',
    'color',
    'background',
  ];

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      data-testid="question-editor-word-paste"
      dir="ltr"
      onPasteCapture={handlePasteCapture}
    >
      <div
        className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-slate-50 px-3 py-2"
        data-testid="question-editor-math-toolbar"
        dir="rtl"
      >
        <span className="inline-flex items-center gap-1 text-xs font-black text-slate-500">
          <Sigma className="h-3.5 w-3.5" />
          رياضيات
        </span>
        {mathTemplates.map((template) => (
          <button
            key={template.label}
            type="button"
            onClick={() => insertFormulaTemplate(template.formula)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            data-testid="question-editor-formula-template"
            title={`إدراج ${template.label}`}
          >
            <FunctionSquare className="h-3.5 w-3.5" />
            {template.label}
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-slate-200" />
        {mathSymbols.map((symbol) => (
          <button
            key={symbol}
            type="button"
            onClick={() => insertTextSymbol(symbol)}
            className="h-7 min-w-7 rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
            data-testid="question-editor-math-symbol"
            title={`إدراج ${symbol}`}
          >
            {symbol}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowDrawingPad((current) => !current)}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-black ${
            showDrawingPad
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
          data-testid="question-editor-drawing-toggle"
          title="فتح لوحة الرسم"
        >
          <PencilRuler className="h-3.5 w-3.5" />
          رسم
        </button>
      </div>
      {showDrawingPad ? <QuestionDrawingPad onInsertImage={insertDrawingImage} /> : null}
      <ReactQuill
        ref={editorRef}
        theme="snow"
        value={value}
        onChange={(nextValue) => onChange(normalizeQuestionHtml(nextValue))}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'اكتب هنا... يدعم العربية والإنجليزية والمعادلات الرياضية مثل x^2 + y^2 = z^2'}
        className="h-64 mb-12"
      />
    </div>
  );
};
