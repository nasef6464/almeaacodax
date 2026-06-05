import React, { useMemo, useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { PencilRuler } from 'lucide-react';
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
const RICH_PASTE_PATTERN = /<(table|img)\b/i;
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
  'text-decoration',
  'width',
  'height',
]);

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

      if (name.startsWith('xmlns') || name === 'lang' || name === 'face') {
        element.removeAttribute(attribute.name);
      }
    });

    const tagName = element.tagName.toLowerCase();
    if (tagName === 'font' || (tagName === 'span' && !element.attributes.length)) {
      unwrapElement(element);
    }
  });

  return normalizeQuestionHtml(document.body.innerHTML);
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<ReactQuill | null>(null);
  const [showDrawingPad, setShowDrawingPad] = useState(false);
  const mathTemplates = useMemo(
    () => [
      { label: 'كسر', value: ' (البسط)/(المقام) ' },
      { label: 'جذر', value: ' √(العدد) ' },
      { label: 'أس', value: ' س^٢ ' },
      { label: 'زاوية', value: ' ق∠س = ٤٥° ' },
      { label: 'نسبة', value: ' أ : ب ' },
      { label: 'متتابعة', value: ' ١، ٣، ٥، ... ' },
    ],
    [],
  );
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        [{ direction: 'rtl' }, { align: [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
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

  const insertMathTemplate = (template: string) => {
    const editor = editorRef.current?.getEditor();
    if (!editor) return;

    const range = editor.getSelection(true);
    const insertAt = range?.index ?? editor.getLength();
    editor.insertText(insertAt, template, 'user');
    editor.setSelection(insertAt + template.length, 0, 'silent');
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
        <span className="text-xs font-black text-slate-500">رياضيات</span>
        {mathTemplates.map((template) => (
          <button
            key={template.label}
            type="button"
            onClick={() => insertMathTemplate(template.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            title={`إدراج ${template.label}`}
          >
            {template.label}
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
