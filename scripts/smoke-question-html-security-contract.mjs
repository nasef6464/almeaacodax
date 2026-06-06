import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const files = {
  packageJson: await read("package.json"),
  sanitizer: await read("utils/questionHtml.ts"),
  skillsTree: await read("dashboards/admin/SkillsTreeManager.tsx"),
  questionBank: await read("dashboards/admin/QuestionBankManager.tsx"),
  quizBuilder: await read("dashboards/admin/QuizBuilder.tsx"),
  unifiedQuestionBuilder: await read("dashboards/admin/builders/UnifiedQuestionBuilder.tsx"),
  quizPage: await read("pages/QuizPage.tsx"),
  quiz: await read("pages/Quiz.tsx"),
  results: await read("pages/Results.tsx"),
  favorites: await read("pages/Favorites.tsx"),
  videoPlayer: await read("components/CustomVideoPlayer.tsx"),
  richTextEditor: await read("components/RichTextEditor.tsx"),
  questionDrawingPad: await read("components/QuestionDrawingPad.tsx"),
  liveQuestionEditorAudit: await read("scripts/live-question-editor-audit.mjs"),
  quizRoutes: await read("server/src/routes/quiz.routes.ts"),
  styles: await read("styles/main.css"),
};

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) {
    throw new Error(message || `Missing fragment: ${fragment}`);
  }
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) {
    throw new Error(message || `Unexpected fragment: ${fragment}`);
  }
}

check("question HTML sanitizer removes active script surfaces", () => {
  assertIncludes(files.sanitizer, "script|style|object|embed|link|meta|base");
  assertIncludes(files.sanitizer, "srcdoc");
  assertIncludes(files.sanitizer, "on[a-z]+");
  assertIncludes(files.sanitizer, "javascript:");
  assertIncludes(files.sanitizer, "data:text");
  assertIncludes(files.sanitizer, "vbscript:");
  assertIncludes(files.sanitizer, "expression");
});

check("admin question previews use normalized HTML", () => {
  assertIncludes(files.skillsTree, "normalizeQuestionHtml(question.text)");
  assertIncludes(files.questionBank, "normalizeQuestionHtml(question.text)");
  assertIncludes(files.questionBank, "normalizeQuestionHtml(previewQuestion.text)");
  assertIncludes(files.quizBuilder, "normalizeQuestionHtml(q.text)");
  assertNotIncludes(files.skillsTree, "__html: question.text");
  assertNotIncludes(files.questionBank, "__html: question.text");
  assertNotIncludes(files.questionBank, "__html: previewQuestion.text");
  assertNotIncludes(files.quizBuilder, "__html: q.text");
});

check("admin question bank shows image-only questions at a glance", () => {
  assertIncludes(files.questionBank, 'data-testid="question-row-media-preview"');
  assertIncludes(files.questionBank, 'data-testid="question-row-image-below-text"');
  assertIncludes(files.questionBank, 'data-testid="question-bank-add-question"');
  assertIncludes(files.questionBank, 'data-testid="question-bank-search-input"');
  assertIncludes(files.questionBank, 'data-testid={hasInlineMedia ? \'question-row-inline-media-preview\' : undefined}');
  assertIncludes(files.questionBank, "hasInlineQuestionMedia");
  assertIncludes(files.questionBank, "hasMediaPreview");
  assertIncludes(files.questionBank, "question.imageUrl");
  assertIncludes(files.questionBank, "معاينة صورة السؤال");
  assertIncludes(files.questionBank, "سؤال بصورة مرفقة");
  assertIncludes(files.questionBank, "سؤال بدون نص");
});

check("question summary API keeps one inline media preview for admin lists", () => {
  assertIncludes(files.quizRoutes, "const escapeHtml");
  assertIncludes(files.quizRoutes, "const inlineMedia");
  assertIncludes(files.quizRoutes, "options correctOptionIndex explanation videoUrl");
  assertIncludes(files.quizRoutes, "<img\\b[^>]*");
  assertIncludes(files.quizRoutes, "<svg\\b[\\s\\S]*?<\\/svg>");
  assertIncludes(files.quizRoutes, "<table\\b[\\s\\S]*?<\\/table>");
  assertIncludes(files.quizRoutes, "toQuestionSummaryText(item.text)");
});

check("question builder keeps MCQ options when editing summary rows", () => {
  assertIncludes(files.questionBank, 'data-testid="question-row-edit"');
  assertIncludes(files.quizRoutes, "options correctOptionIndex explanation videoUrl");
  assertIncludes(files.unifiedQuestionBuilder, "normalizeQuestionForEditing");
  assertIncludes(files.unifiedQuestionBuilder, "data-testid=\"question-builder-modal\"");
  assertIncludes(files.unifiedQuestionBuilder, "max-w-6xl");
  assertIncludes(files.unifiedQuestionBuilder, "data-testid=\"question-builder-option-input\"");
  assertIncludes(files.unifiedQuestionBuilder, "normalizedCorrectOptionIndex");
  assertIncludes(files.unifiedQuestionBuilder, "يرجى إدخال اختيارين على الأقل.");
});

check("rich text editor exposes Arabic-friendly math helpers", () => {
  assertIncludes(files.richTextEditor, 'data-testid="question-editor-math-toolbar"');
  assertIncludes(files.richTextEditor, 'data-testid="question-editor-equation-input"');
  assertIncludes(files.richTextEditor, 'data-testid="question-editor-equation-preview"');
  assertIncludes(files.richTextEditor, 'data-testid="question-editor-insert-equation"');
  assertIncludes(files.richTextEditor, "katex.renderToString");
  assertIncludes(files.richTextEditor, "insertFormulaTemplate");
  assertIncludes(files.richTextEditor, "mathTemplates");
  assertIncludes(files.richTextEditor, 'data-testid="question-editor-formula-template"');
  assertIncludes(files.richTextEditor, 'data-testid="question-editor-math-symbol"');
  assertIncludes(files.richTextEditor, "editor.insertEmbed(insertAt, 'formula', formula");
  assertIncludes(files.richTextEditor, "{ script: 'sub' }");
  assertIncludes(files.richTextEditor, "{ script: 'super' }");
  assertIncludes(files.richTextEditor, "\\\\frac{\\\\text{س}}{\\\\text{ص}}");
  assertIncludes(files.richTextEditor, "\\\\sqrt{\\\\text{س}}");
  assertIncludes(files.richTextEditor, "m\\\\angle \\\\text{س}");
  assertIncludes(files.richTextEditor, "كسر");
  assertIncludes(files.richTextEditor, "جذر");
  assertIncludes(files.richTextEditor, "أس");
  assertIncludes(files.richTextEditor, "زاوية");
});

check("question math renders consistently across admin and learner surfaces", () => {
  assertIncludes(files.questionBank, "question-html");
  assertIncludes(files.quizBuilder, "question-html");
  assertIncludes(files.quizPage, "question-html");
  assertIncludes(files.quiz, "question-html");
  assertIncludes(files.results, "question-html");
  assertIncludes(files.favorites, "question-html");
  assertIncludes(files.videoPlayer, "question-html");
  assertIncludes(files.styles, ".question-html .ql-formula");
  assertIncludes(files.styles, ".question-html .katex");
  assertIncludes(files.styles, ".question-html table");
});

check("rich text editor cleans Word paste before insertion", () => {
  assertIncludes(files.richTextEditor, 'data-testid="question-editor-word-paste"');
  assertIncludes(files.richTextEditor, "cleanWordPasteHtml");
  assertIncludes(files.richTextEditor, "insertCleanedHtmlDirectly");
  assertIncludes(files.richTextEditor, "handlePasteCapture");
  assertIncludes(files.richTextEditor, "clipboardData.getData('text/html')");
  assertIncludes(files.richTextEditor, "dangerouslyPasteHTML");
  assertIncludes(files.richTextEditor, "table: true");
  assertIncludes(files.richTextEditor, "Mso");
  assertIncludes(files.richTextEditor, "mso-");
  assertIncludes(files.richTextEditor, "table");
  assertIncludes(files.richTextEditor, "img");
  assertIncludes(files.richTextEditor, "font-family");
  assertIncludes(files.richTextEditor, "font-size");
  assertIncludes(files.richTextEditor, "line-height");
  assertIncludes(files.richTextEditor, "white-space");
  assertIncludes(files.richTextEditor, "text-indent");
  assertIncludes(files.richTextEditor, "mathvariant");
  assertIncludes(files.richTextEditor, "viewbox");
  assertIncludes(files.richTextEditor, "preserveaspectratio");
  assertIncludes(files.richTextEditor, "SAFE_WORD_ATTRIBUTES.has(name)");
  assertIncludes(files.richTextEditor, "LEGACY_FONT_SIZE_MAP");
  assertIncludes(files.richTextEditor, "mrow|mi|mo|mn|mtext|mfrac|msqrt|mroot|msup|msub");
});

check("rich text editor supports drawing simple math diagrams", () => {
  assertIncludes(files.richTextEditor, 'data-testid="question-editor-drawing-toggle"');
  assertIncludes(files.richTextEditor, "insertDrawingImage");
  assertIncludes(files.richTextEditor, "insertEmbed(insertAt, 'image', dataUrl");
  assertIncludes(files.richTextEditor, "QuestionDrawingPad");
  assertIncludes(files.questionDrawingPad, 'data-testid="question-editor-drawing-pad"');
  assertIncludes(files.questionDrawingPad, 'data-testid="question-editor-drawing-canvas"');
  assertIncludes(files.questionDrawingPad, 'data-testid="question-editor-insert-drawing"');
  assertIncludes(files.questionDrawingPad, "freehand");
  assertIncludes(files.questionDrawingPad, "arrow");
  assertIncludes(files.questionDrawingPad, "text");
  assertIncludes(files.questionDrawingPad, "drawArrowHead");
  assertIncludes(files.questionDrawingPad, "TextCursorInput");
  assertIncludes(files.questionDrawingPad, "strokeColor");
  assertIncludes(files.questionDrawingPad, "textLabel");
  assertIncludes(files.questionDrawingPad, 'type="color"');
  assertIncludes(files.questionDrawingPad, "fillText");
  assertIncludes(files.questionDrawingPad, "rectangle");
  assertIncludes(files.questionDrawingPad, "circle");
  assertIncludes(files.questionDrawingPad, "angle");
  assertIncludes(files.questionDrawingPad, "toDataURL('image/png')");
});

check("question editor has a live admin audit for toolbar and row media previews", () => {
  assertIncludes(files.packageJson, '"smoke:question-editor-live": "node scripts/live-question-editor-audit.mjs"');
  assertIncludes(files.liveQuestionEditorAudit, 'data-testid="question-editor-math-toolbar"');
  assertIncludes(files.liveQuestionEditorAudit, 'data-testid="question-editor-equation-input"');
  assertIncludes(files.liveQuestionEditorAudit, 'data-testid="question-editor-equation-preview"');
  assertIncludes(files.liveQuestionEditorAudit, 'data-testid="question-editor-insert-equation"');
  assertIncludes(files.liveQuestionEditorAudit, 'data-testid="question-editor-word-paste"');
  assertIncludes(files.liveQuestionEditorAudit, 'data-testid="question-editor-drawing-toggle"');
  assertIncludes(files.liveQuestionEditorAudit, 'data-testid="question-row-media-preview"');
  assertIncludes(files.liveQuestionEditorAudit, 'data-testid="question-row-inline-media-preview"');
  assertIncludes(files.liveQuestionEditorAudit, "createInlineMediaQuestion");
  assertIncludes(files.liveQuestionEditorAudit, "method: \"DELETE\"");
});

check("learner question rendering keeps normalized HTML contract", () => {
  for (const [name, source] of Object.entries({
    quizPage: files.quizPage,
    quiz: files.quiz,
    results: files.results,
    favorites: files.favorites,
    videoPlayer: files.videoPlayer,
  })) {
    if (source.includes("dangerouslySetInnerHTML") && !source.includes("normalizeQuestionHtml")) {
      throw new Error(`${name} renders question HTML without normalizeQuestionHtml`);
    }
  }
});

const failed = checks.filter((item) => item.status === "FAIL");
console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
