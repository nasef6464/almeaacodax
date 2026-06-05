import React, { useMemo, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { normalizeQuestionHtml } from '../utils/questionHtml';

if (typeof window !== 'undefined') {
  (window as any).katex = katex;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<ReactQuill | null>(null);
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
    'color',
    'background',
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" dir="ltr">
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
      </div>
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
