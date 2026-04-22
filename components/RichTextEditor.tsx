import React, { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Make katex available globally for Quill
if (typeof window !== 'undefined') {
  (window as any).katex = katex;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'direction': 'rtl' }, { 'align': [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
      ['link', 'image', 'video'],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
    clipboard: {
      // Toggle to add extra line breaks when pasting HTML:
      matchVisual: false,
    }
  }), []);

  const formats = [
    'header', 'direction', 'align',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'indent',
    'link', 'image', 'video',
    'color', 'background'
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" dir="ltr">
      {/* We set dir="ltr" on the wrapper so Quill's toolbar renders correctly, 
          but the content inside can be RTL via the toolbar align/direction buttons */}
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'اكتب هنا... (يدعم اللصق من PDF والرموز الرياضية)'}
        className="h-64 mb-12"
      />
    </div>
  );
};
