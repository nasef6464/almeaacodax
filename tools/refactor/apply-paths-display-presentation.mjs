import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const managerPath = path.join(root, 'dashboards/admin/PathsManager.tsx');
let source = fs.readFileSync(managerPath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = "import { isQuizVisibleInLearningSlot } from '../../utils/quizLearningPlacement';";
const helperImport = "import { getPathIcon, getSubjectIcon, resolveColor, resolvePathDisplaySettings } from './PathsManager/pathDisplayPresentation';";
const legacyMarkers = [
  'const getPathIcon =',
  'const colorMap:',
  'const resolveColor =',
  'const defaultPathDisplaySettings:',
  'const resolvePathDisplaySettings =',
  'const getSubjectIcon =',
];

if (source.includes(helperImport) && legacyMarkers.every((marker) => !source.includes(marker))) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'paths-display-presentation' }, null, 2));
  process.exit(0);
}

if (source.includes(helperImport) || !legacyMarkers.every((marker) => source.includes(marker))) {
  throw new Error('Paths display presentation boundary is partially applied; refusing automatic mutation.');
}

const replaceRequired = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Missing expected PathsManager source block: ${label}`);
  source = source.replace(from, to);
};

replaceRequired(importAnchor, `${importAnchor}\n${helperImport}`, 'display helper import anchor');

replaceRequired(`const getPathIcon = (path: any) => {\n  if (path?.iconUrl) return <img src={path.iconUrl} alt={path.name} className="w-8 h-8 object-contain" />;\n  return path?.icon || '📚';\n};\n\n`, '', 'getPathIcon');

replaceRequired(`const colorMap: Record<string, { soft: string; text: string; border: string }> = {\n  gray: { soft: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },\n  indigo: { soft: '#e0e7ff', text: '#4f46e5', border: '#c7d2fe' },\n  amber: { soft: '#fef3c7', text: '#b45309', border: '#fde68a' },\n  emerald: { soft: '#d1fae5', text: '#047857', border: '#a7f3d0' },\n  purple: { soft: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },\n  rose: { soft: '#ffe4e6', text: '#be123c', border: '#fecdd3' },\n  blue: { soft: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },\n};\n\nconst resolveColor = (value?: string) => {\n  if (!value) return colorMap.gray;\n  if (value.startsWith('#')) {\n    return { soft: \`${'${value}'}18\`, text: value, border: \`${'${value}'}33\` };\n  }\n  return colorMap[value] || colorMap.gray;\n};\n\nconst defaultPathDisplaySettings: Required<PathDisplaySettings> = {\n  showSubjectCards: true,\n  showMockExamCard: true,\n  showPackageCard: true,\n};\n\nconst resolvePathDisplaySettings = (path?: { settings?: PathDisplaySettings | null }): Required<PathDisplaySettings> => ({\n  ...defaultPathDisplaySettings,\n  ...(path?.settings || {}),\n});\n\n`, '', 'color and display settings helpers');

replaceRequired(`const getSubjectIcon = (subject: any) => {\n  if (subject?.iconUrl) return <img src={subject.iconUrl} alt={subject.name} className="w-8 h-8 object-contain" />;\n  return subject?.icon || '📖';\n};\n\n`, '', 'getSubjectIcon');

if (legacyMarkers.some((marker) => source.includes(marker))) {
  throw new Error('Legacy display helper definitions remained after extraction.');
}
if (!source.includes(helperImport)) throw new Error('Display helper import was not added.');

fs.writeFileSync(managerPath, source);
console.log(JSON.stringify({ status: 'APPLIED', phase: 'paths-display-presentation', changedFiles: ['dashboards/admin/PathsManager.tsx'] }, null, 2));
