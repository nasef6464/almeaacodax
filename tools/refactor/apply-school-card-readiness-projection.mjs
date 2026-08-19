import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const managerPath = path.join(root, 'dashboards/admin/SchoolsManager.tsx');
let source = fs.readFileSync(managerPath, 'utf8').replace(/\r\n/g, '\n');

const importAnchor = `} from './SchoolsManager/readinessViewModel';
import { buildSchoolRelationshipViewModel } from './SchoolsManager/relationshipViewModel';`;
const importReplacement = `} from './SchoolsManager/readinessViewModel';
import { buildSchoolCardReadinessActions } from './SchoolsManager/schoolCardReadinessViewModel';
import { buildSchoolRelationshipViewModel } from './SchoolsManager/relationshipViewModel';`;

const projectionBefore = `    const schoolPortfolioRows = useMemo(
        () => buildSchoolPortfolioRows(schools, { classes, students, b2bPackages, accessCodes }),
        [accessCodes, b2bPackages, classes, schools, students],
    );
    const { filteredSchools, hiddenDraftSchoolsCount, visibleDraftSchoolsCount } = useMemo(
        () => filterSchoolPortfolioRows(schoolPortfolioRows, schoolSearch, schoolListMode),
        [schoolListMode, schoolPortfolioRows, schoolSearch],
    );
    const schoolPortfolioSummary = useMemo(
        () => summarizeSchoolPortfolio(schoolPortfolioRows),
        [schoolPortfolioRows],
    );`;

const projectionAfter = `    const schoolPortfolioRows = buildSchoolPortfolioRows(schools, {
        classes, students, b2bPackages, accessCodes, now: Date.now(),
    });
    const { filteredRows: filteredSchoolRows, filteredSchools, hiddenDraftSchoolsCount, visibleDraftSchoolsCount } =
        filterSchoolPortfolioRows(schoolPortfolioRows, schoolSearch, schoolListMode);
    const schoolPortfolioSummary = summarizeSchoolPortfolio(schoolPortfolioRows);`;

const cardBefore = `                {filteredSchools.map((school) => {
                    const schoolPackages = b2bPackages.filter((pkg) => pkg.schoolId === school.id);
                    const schoolCodes = accessCodes.filter((code) => code.schoolId === school.id && code.expiresAt > Date.now());
                    const schoolClasses = classes.filter((group) => group.parentId === school.id);
                    const schoolStudents = getStudentsForSchool(school, schoolClasses, students);
                    const schoolClassCount = schoolClasses.length;
                    const activePackageCount = schoolPackages.filter((pkg) => pkg.status === 'active').length;
                    const cardOperationalSnapshot = getOperationalSnapshotForSchool(school);
                    const cardReadinessScore = [
                        schoolClassCount > 0,
                        schoolStudents.length > 0,
                        school.supervisorIds.length > 0,
                        activePackageCount > 0,
                        schoolCodes.length > 0,
                    ].filter(Boolean).length;
                    const cardReadinessTotal = 5;
                    const cardReadinessActions = [
                        {
                            id: 'classes',
                            label: 'الفصول',
                            isReady: schoolClassCount > 0,
                            tab: 'overview' as const,
                            hint: schoolClassCount > 0 ? \`${'${schoolClassCount}'} فصل\` : 'أضف فصولًا',
                        },
                        {
                            id: 'students',
                            label: 'الطلاب',
                            isReady: schoolStudents.length > 0,
                            tab: 'overview' as const,
                            hint: schoolStudents.length > 0 ? \`${'${schoolStudents.length}'} طالب\` : 'أضف الطلاب',
                        },
                        {
                            id: 'supervisors',
                            label: 'المشرفون',
                            isReady: school.supervisorIds.length > 0,
                            tab: 'relations' as const,
                            hint: school.supervisorIds.length > 0 ? \`${'${school.supervisorIds.length}'} مشرف\` : 'اربط مشرفًا',
                        },
                        {
                            id: 'packages',
                            label: 'الباقة/المسارات',
                            isReady: activePackageCount > 0,
                            tab: 'packages' as const,
                            hint: activePackageCount > 0 ? \`${'${activePackageCount}'} باقة\` : 'فعّل باقة ومسارات',
                        },
                        {
                            id: 'codes',
                            label: 'الأكواد',
                            isReady: schoolCodes.length > 0,
                            tab: 'packages' as const,
                            hint: schoolCodes.length > 0 ? \`${'${schoolCodes.length}'} كود\` : 'ولّد كودًا',
                        },
                    ];
                    const nextCardAction = cardReadinessActions.find((action) => !action.isReady);`;

const cardAfter = `                {filteredSchoolRows.map((cardPortfolioRow) => {
                    const { school } = cardPortfolioRow;
                    const cardReadinessActions = buildSchoolCardReadinessActions(cardPortfolioRow);
                    const nextCardAction = cardReadinessActions.find((action) => !action.isReady);`;

const inlineProjectionApplied = source.includes("buildSchoolCardReadinessActions")
    && source.includes('{filteredSchoolRows.map((cardPortfolioRow) => {')
    && !source.includes('const cardReadinessScore = [');
const presentationProjectionApplied = source.includes("import { SchoolPortfolioCard } from './SchoolsManager/SchoolPortfolioCard';")
    && source.includes('{filteredSchoolRows.map((cardPortfolioRow) => (')
    && source.includes('row={cardPortfolioRow}')
    && source.includes('classes, students, b2bPackages, accessCodes, now: Date.now(),')
    && !source.includes('const cardReadinessScore = [');
const alreadyApplied = inlineProjectionApplied || presentationProjectionApplied;

if (alreadyApplied) {
    console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'school-card-readiness-projection' }, null, 2));
    process.exit(0);
}

if (!source.includes(importAnchor)) throw new Error('School card readiness import anchor not found.');
if (!source.includes(projectionBefore)) throw new Error('School portfolio projection anchor not found.');
if (!source.includes(cardBefore)) throw new Error('School card readiness calculation anchor not found.');

source = source
    .replace(importAnchor, importReplacement)
    .replace(projectionBefore, projectionAfter)
    .replace(cardBefore, cardAfter);

const cardStart = source.indexOf('{filteredSchoolRows.map((cardPortfolioRow) => {');
const cardEnd = source.indexOf('\n            {filteredSchools.length === 0', cardStart);
if (cardStart < 0 || cardEnd < 0) throw new Error('School card rendering boundaries not found after projection replacement.');

let cardSection = source.slice(cardStart, cardEnd);
cardSection = cardSection
    .replaceAll('cardOperationalSnapshot.isCommerciallyHiddenDraft', 'cardPortfolioRow.isCommerciallyHiddenDraft')
    .replaceAll('cardReadinessScore', 'cardPortfolioRow.readinessScore')
    .replaceAll('cardReadinessTotal', 'cardPortfolioRow.readinessTotal')
    .replaceAll('schoolStudents.length', 'cardPortfolioRow.studentCount')
    .replaceAll('activePackageCount', 'cardPortfolioRow.activePackageCount')
    .replaceAll('schoolCodes.length', 'cardPortfolioRow.activeCodeCount');
source = `${source.slice(0, cardStart)}${cardSection}${source.slice(cardEnd)}`;

fs.writeFileSync(managerPath, source);
console.log(JSON.stringify({
    status: 'APPLIED',
    phase: 'school-card-readiness-projection',
    files: ['dashboards/admin/SchoolsManager.tsx'],
}, null, 2));
