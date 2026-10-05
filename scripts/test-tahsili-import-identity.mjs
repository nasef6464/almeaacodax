import assert from 'node:assert/strict';
import {
  parseQuestionCode,
  validateQuestionCode,
  buildExpectedSourceItemId,
  buildExpectedImagePath,
  buildExpectedPublicImageUrl,
  QUESTION_CODE_REGEX,
} from '../server/src/modules/quizzes/domain/questionImportIdentity.js';
import { getLearnerOptionLabel, QUIZ_OPTION_LABELS, LATIN_OPTION_LABELS } from '../utils/quizPresentation.js';
import { normalizeQuestionOptions } from '../server/src/modules/quizzes/presentation/reviewQuestionPresentation.js';

console.log('--- RUNNING TAHSILI & QUDURAT IMPORT IDENTITY AND PRESENTATION TESTS ---');

// 1. QUESTION CODE VALIDATION
console.log('1. Testing Question Code Validation...');
assert.equal(validateQuestionCode('TAH-MATH-YLM26-P006-Q07'), true, 'Valid Tahsili code must pass');
assert.equal(validateQuestionCode('TAH-MATH-YLM26-P029-Q02'), true, 'Valid Tahsili Math code on page 29 must pass');
assert.equal(validateQuestionCode('TAH-CHEM-CHEM26-P005-Q01'), true, 'Valid Tahsili Chemistry code must pass');
assert.equal(validateQuestionCode('QDR-QNT-FND26-P005-Q01'), true, 'Valid Qudurat legacy code must pass');
assert.equal(validateQuestionCode('INVALID-MATH-YLM26-P006-Q07'), false, 'Invalid prefix must fail');
assert.equal(validateQuestionCode('TAH-MATH-YLM26-P6-Q7'), false, 'Unpadded numbers must fail');
assert.equal(validateQuestionCode('TAH-ENG-YLM26-P006-Q07'), false, 'Unknown domain must fail');

// 2. PARSE QUESTION CODE
console.log('2. Testing Parse Question Code...');
const parsedTah = parseQuestionCode('TAH-MATH-YLM26-P006-Q07');
assert.equal(parsedTah.valid, true);
assert.equal(parsedTah.prefix, 'TAH-MATH');
assert.equal(parsedTah.documentCode, 'YLM26');
assert.equal(parsedTah.pageNumber, 6);
assert.equal(parsedTah.questionNumber, 7);
assert.equal(parsedTah.domain, 'tahsili_math');

const parsedChem = parseQuestionCode('TAH-CHEM-CHEM26-P134-Q32');
assert.equal(parsedChem.valid, true);
assert.equal(parsedChem.prefix, 'TAH-CHEM');
assert.equal(parsedChem.documentCode, 'CHEM26');
assert.equal(parsedChem.pageNumber, 134);
assert.equal(parsedChem.questionNumber, 32);
assert.equal(parsedChem.domain, 'tahsili_chemistry');

const parsedQdr = parseQuestionCode('QDR-QNT-FND26-P035-Q62');
assert.equal(parsedQdr.valid, true);
assert.equal(parsedQdr.prefix, 'QDR-QNT');
assert.equal(parsedQdr.documentCode, 'FND26');
assert.equal(parsedQdr.pageNumber, 35);
assert.equal(parsedQdr.questionNumber, 62);
assert.equal(parsedQdr.domain, 'qudurat_quantitative');

// 3. SOURCE ITEM ID BUILDER
console.log('3. Testing Source Item ID Builder...');
const tahSourceId = buildExpectedSourceItemId({
  documentCode: 'YLM26',
  pdfPageIndex: 6,
  pageNumber: 6,
  questionNumber: 7,
});
assert.equal(tahSourceId, 'YLM26-PDF006-P006-N07', 'Source item ID must match canonical Tahsili format');

// 4. IMAGE PATH & URL BUILDER
console.log('4. Testing Image Path & URL Builder...');
const testHash = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
const imgPath = buildExpectedImagePath('TAH-MATH-YLM26-P006-Q07', testHash);
assert.equal(imgPath, `questions/v2/TAH-MATH-YLM26-P006-Q07/${testHash}.webp`);

const chemImgPath = buildExpectedImagePath('TAH-CHEM-CHEM26-P005-Q01', testHash);
assert.equal(chemImgPath, `questions/v2/TAH-CHEM-CHEM26-P005-Q01/${testHash}.webp`);

const pubUrl = buildExpectedPublicImageUrl('TAH-MATH-YLM26-P006-Q07', testHash, 'https://cdn.almeaa.com');
assert.equal(pubUrl, `https://cdn.almeaa.com/questions/v2/TAH-MATH-YLM26-P006-Q07/${testHash}.webp`);

// 5. QUIZ PRESENTATION (A/B/C/D vs أ/ب/ج/د)
console.log('5. Testing Quiz Presentation A/B/C/D vs Arabic...');
// Qudurat legacy question:
const quduratQuestion = {
  imageUrl: 'https://cdn.almeaa.com/questions/v2/QDR-QNT-FND26-P005-Q01/hash.webp',
  optionsEmbeddedInImage: true,
  options: ['أ', 'ب', 'ج', 'د'],
  examType: 'qudurat',
};
assert.equal(getLearnerOptionLabel(quduratQuestion, 'أ', 0), 'أ', 'Qudurat question 0 must be أ');
assert.equal(getLearnerOptionLabel(quduratQuestion, 'ب', 1), 'ب', 'Qudurat question 1 must be ب');
assert.equal(getLearnerOptionLabel(quduratQuestion, 'ج', 2), 'ج', 'Qudurat question 2 must be ج');
assert.equal(getLearnerOptionLabel(quduratQuestion, 'د', 3), 'د', 'Qudurat question 3 must be د');

// Tahsili question with embedded options:
const tahsiliQuestion = {
  imageUrl: 'https://cdn.almeaa.com/questions/v2/TAH-MATH-YLM26-P006-Q07/hash.webp',
  optionsEmbeddedInImage: true,
  options: ['A', 'B', 'C', 'D'],
  examType: 'tahsili',
};
assert.equal(getLearnerOptionLabel(tahsiliQuestion, 'A', 0), 'A', 'Tahsili question 0 must be A');
assert.equal(getLearnerOptionLabel(tahsiliQuestion, 'B', 1), 'B', 'Tahsili question 1 must be B');
assert.equal(getLearnerOptionLabel(tahsiliQuestion, 'C', 2), 'C', 'Tahsili question 2 must be C');
assert.equal(getLearnerOptionLabel(tahsiliQuestion, 'D', 3), 'D', 'Tahsili question 3 must be D');

// 6. REVIEW PRESENTATION
console.log('6. Testing Review Presentation normalizeQuestionOptions...');
const normalizedQudurat = normalizeQuestionOptions(quduratQuestion);
assert.deepEqual(normalizedQudurat, ['أ', 'ب', 'ج', 'د'], 'Qudurat review options must stay Arabic');

const normalizedTahsili = normalizeQuestionOptions(tahsiliQuestion);
assert.deepEqual(normalizedTahsili, ['A', 'B', 'C', 'D'], 'Tahsili review options must stay Latin A/B/C/D');

console.log('ALL TAHSILI & QUDURAT IMPORT IDENTITY AND PRESENTATION TESTS PASSED 100%!');
