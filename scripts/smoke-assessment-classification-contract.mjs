import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const sourceUrl = new URL('../utils/assessmentClassification.ts', import.meta.url);
const source = fs.readFileSync(sourceUrl, 'utf8');

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
  },
  fileName: 'assessmentClassification.ts',
  reportDiagnostics: true,
});

if (transpiled.diagnostics?.length) {
  const errors = transpiled.diagnostics
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  if (errors.length) {
    throw new Error(`Assessment classification transpile failed:\n${errors.join('\n')}`);
  }
}

const module = { exports: {} };
const sandbox = {
  module,
  exports: module.exports,
  require: (id) => {
    throw new Error(`Unexpected runtime dependency in classification resolver: ${id}`);
  },
};

vm.runInNewContext(transpiled.outputText, sandbox, {
  filename: 'assessmentClassification.js',
});

const { resolveAssessmentClassification, isAssessmentMock } = module.exports;

if (typeof resolveAssessmentClassification !== 'function' || typeof isAssessmentMock !== 'function') {
  throw new Error('Canonical assessment classification exports are missing');
}

const cases = [
  {
    name: 'explicit drill is normal practice',
    input: { quizKind: 'drill', mode: 'regular' },
    expected: { kind: 'normal', normalMode: 'practice', deliveryMode: 'regular', quizKind: 'drill', inferredFromLegacy: false },
  },
  {
    name: 'explicit test can be directed without becoming a new assessment type',
    input: { quizKind: 'test', mode: 'central' },
    expected: { kind: 'normal', normalMode: 'exam', deliveryMode: 'directed', quizKind: 'test', inferredFromLegacy: false },
  },
  {
    name: 'explicit mock is a true mock assessment',
    input: { quizKind: 'mock', mode: 'regular' },
    expected: { kind: 'mock', deliveryMode: 'regular', quizKind: 'mock', inferredFromLegacy: false },
  },
  {
    name: 'legacy mockExam enabled is still a true mock',
    input: { mockExam: { enabled: true, pathId: 'p1', sections: [] }, placement: 'mock' },
    expected: { kind: 'mock', deliveryMode: 'regular', quizKind: 'mock', inferredFromLegacy: true },
  },
  {
    name: 'legacy placement mock alone is a normal exam, not a true mock',
    input: { type: 'quiz', placement: 'mock', showInMock: true },
    expected: { kind: 'normal', normalMode: 'exam', deliveryMode: 'regular', quizKind: 'test', inferredFromLegacy: true },
  },
  {
    name: 'legacy bank remains practice',
    input: { type: 'bank', placement: 'training' },
    expected: { kind: 'normal', normalMode: 'practice', deliveryMode: 'regular', quizKind: 'drill', inferredFromLegacy: true },
  },
  {
    name: 'saher is self delivery, not a third assessment kind',
    input: { quizKind: 'test', mode: 'saher' },
    expected: { kind: 'normal', normalMode: 'exam', deliveryMode: 'self', quizKind: 'test', inferredFromLegacy: false },
  },
];

let passed = 0;
for (const testCase of cases) {
  const actual = resolveAssessmentClassification(testCase.input);
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(testCase.expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${testCase.name}\nexpected: ${expectedJson}\nactual:   ${actualJson}`);
  }
  passed += 1;
}

if (isAssessmentMock({ placement: 'mock', type: 'quiz' })) {
  throw new Error('placement=mock must never be enough to classify a true mock assessment');
}

if (!isAssessmentMock({ mockExam: { enabled: true, pathId: 'p1', sections: [] } })) {
  throw new Error('mockExam.enabled must preserve legacy true-mock compatibility');
}

console.log(`Assessment classification contract PASS (${passed + 2}/${passed + 2})`);
