import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const serverRequire = createRequire(new URL('../server/package.json', import.meta.url));
const zodModule = serverRequire('zod');

const sourceUrl = new URL('../server/src/modules/quizzes/http/quizDefinitionSchema.ts', import.meta.url);
const source = fs.readFileSync(sourceUrl, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
  },
  fileName: 'quizDefinitionSchema.ts',
  reportDiagnostics: true,
});

const errors = (transpiled.diagnostics || [])
  .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
  .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
if (errors.length) {
  throw new Error(`Quiz definition schema transpile failed:\n${errors.join('\n')}`);
}

const module = { exports: {} };
vm.runInNewContext(transpiled.outputText, {
  module,
  exports: module.exports,
  require: (id) => {
    if (id === 'zod') return zodModule;
    throw new Error(`Unexpected dependency while testing quiz definition schema: ${id}`);
  },
}, { filename: 'quizDefinitionSchema.js' });

const { quizSchema } = module.exports;
if (!quizSchema?.parse) {
  throw new Error('quizSchema export is unavailable');
}

const payload = {
  title: 'Assessment boundary proof',
  pathId: 'path-1',
  subjectId: 'subject-1',
  quizKind: 'mock',
  questionIds: [],
  mockExam: {
    enabled: true,
    pathId: 'path-1',
    qiyasCategory: 'specialized',
    targetScore: 92,
    isStrictSectionLock: true,
    sections: [
      {
        id: 'section-1',
        title: 'Section 1',
        subjectId: 'subject-1',
        questionIds: ['question-1'],
        timeLimit: 25,
        order: 0,
        domain: 'general',
        isStrictSectionLock: false,
      },
    ],
  },
};

const parsed = quizSchema.parse(payload);

if (parsed.mockExam?.qiyasCategory !== 'specialized') {
  throw new Error('qiyasCategory was lost or narrowed at the API boundary');
}
if (parsed.mockExam?.targetScore !== 92) {
  throw new Error('mockExam.targetScore was dropped at the API boundary');
}
if (parsed.mockExam?.isStrictSectionLock !== true) {
  throw new Error('mockExam.isStrictSectionLock was dropped at the API boundary');
}
if (parsed.mockExam?.sections?.[0]?.isStrictSectionLock !== false) {
  throw new Error('section.isStrictSectionLock was dropped at the API boundary');
}

let invalidTargetScoreRejected = false;
try {
  quizSchema.parse({
    ...payload,
    mockExam: { ...payload.mockExam, targetScore: 101 },
  });
} catch {
  invalidTargetScoreRejected = true;
}
if (!invalidTargetScoreRejected) {
  throw new Error('mockExam.targetScore > 100 must be rejected');
}

console.log('Assessment definition boundary contract PASS (5/5)');
