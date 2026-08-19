import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const resultsPath = path.join(root, 'pages/Results.tsx');
let source = fs.readFileSync(resultsPath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = "import { getQuizOptionButtonHeightClass, getQuizOptionGridClass, getQuizQuestionMapButtonClass, resolveQuestionFromBank, toQuestionReviewFromBank } from '../utils/quizPresentation';";
const helperImport = "import { getFriendlyResultMessage, getMasteryClasses, getScoreVisualTone, getSkillPriorityLabel, getStudentFriendlyChecklist } from '../components/results/resultScorePresentation';";
const legacyMarkers = [
  'const getMasteryClasses =',
  'const getSkillPriorityLabel =',
  'const getFriendlyResultMessage =',
  'const getScoreVisualTone =',
  'const getStudentFriendlyChecklist =',
];

if (source.includes(helperImport) && legacyMarkers.every((marker) => !source.includes(marker))) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'results-score-presentation' }, null, 2));
  process.exit(0);
}

if (source.includes(helperImport) || !legacyMarkers.every((marker) => source.includes(marker))) {
  throw new Error('Results score presentation boundary is partially applied; refusing automatic mutation.');
}
if (!source.includes(importAnchor)) throw new Error('Missing Results import anchor for score presentation helper.');
source = source.replace(importAnchor, `${importAnchor}\n${helperImport}`);

const removeBetween = (startMarker, endMarker, label) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Missing or reordered Results source block: ${label}`);
  }
  source = `${source.slice(0, start)}${source.slice(end)}`;
};

removeBetween('const getMasteryClasses =', 'const getSkillPriorityLabel =', 'getMasteryClasses');
removeBetween('const getSkillPriorityLabel =', 'const getStatusFromMastery =', 'getSkillPriorityLabel');
removeBetween('const getFriendlyResultMessage =', 'const getScoreVisualTone =', 'getFriendlyResultMessage');
removeBetween('const getScoreVisualTone =', 'const getStudentFriendlyChecklist =', 'getScoreVisualTone');
removeBetween('const getStudentFriendlyChecklist =', 'const SimpleResultStat =', 'getStudentFriendlyChecklist');

if (legacyMarkers.some((marker) => source.includes(marker))) {
  throw new Error('Legacy score presentation definitions remained after extraction.');
}
if (!source.includes(helperImport)) throw new Error('Score presentation helper import was not added.');

fs.writeFileSync(resultsPath, source);
console.log(JSON.stringify({ status: 'APPLIED', phase: 'results-score-presentation', changedFiles: ['pages/Results.tsx'] }, null, 2));
