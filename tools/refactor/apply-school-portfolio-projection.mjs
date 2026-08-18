import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const managerPath = path.join(root, 'dashboards/admin/SchoolsManager.tsx');
let source = fs.readFileSync(managerPath, 'utf8').replace(/\r\n/g, '\n');

const importBefore = `import {
    buildSchoolPortfolioRows,
    getSchoolOperationalSnapshot as calculateSchoolOperationalSnapshot,
    getStudentsForSchool,
    summarizeSchoolPortfolio,
} from './SchoolsManager/readinessViewModel';`;

const importAfter = `import {
    buildSchoolPortfolioRows,
    filterSchoolPortfolioRows,
    getSchoolOperationalSnapshot as calculateSchoolOperationalSnapshot,
    getStudentsForSchool,
    summarizeSchoolPortfolio,
} from './SchoolsManager/readinessViewModel';`;

const blockBefore = `    const filteredSchools = useMemo(() => {
        const keyword = schoolSearch.trim().toLowerCase();
        return schools.filter((school) => {
            const matchesSearch = !keyword || school.name.toLowerCase().includes(keyword);
            if (!matchesSearch) return false;

            const snapshot = getOperationalSnapshotForSchool(school);
            if (schoolListMode === 'all' || keyword) return true;
            if (schoolListMode === 'ready') return snapshot.readinessScore === 5;
            if (schoolListMode === 'needs_setup') return snapshot.readinessScore < 5 && !snapshot.isCommerciallyHiddenDraft;
            return !snapshot.isCommerciallyHiddenDraft;
        });
    }, [accessCodes, b2bPackages, classes, schoolListMode, schoolSearch, schools, students]);
    const hiddenDraftSchoolsCount = useMemo(
        () => schools.filter((school) => getOperationalSnapshotForSchool(school).isCommerciallyHiddenDraft).length,
        [accessCodes, b2bPackages, classes, schools, students],
    );
    const visibleDraftSchoolsCount = useMemo(
        () => filteredSchools.filter((school) => getOperationalSnapshotForSchool(school).isCommerciallyHiddenDraft).length,
        [accessCodes, b2bPackages, classes, filteredSchools, students],
    );
    const schoolPortfolioRows = useMemo(
        () => buildSchoolPortfolioRows(schools, { classes, students, b2bPackages, accessCodes }),
        [accessCodes, b2bPackages, classes, schools, students],
    );`;

const blockAfter = `    const schoolPortfolioRows = useMemo(
        () => buildSchoolPortfolioRows(schools, { classes, students, b2bPackages, accessCodes }),
        [accessCodes, b2bPackages, classes, schools, students],
    );
    const { filteredSchools, hiddenDraftSchoolsCount, visibleDraftSchoolsCount } = useMemo(
        () => filterSchoolPortfolioRows(schoolPortfolioRows, schoolSearch, schoolListMode),
        [schoolListMode, schoolPortfolioRows, schoolSearch],
    );`;

const alreadyApplied = source.includes('filterSchoolPortfolioRows,')
    && source.includes('const { filteredSchools, hiddenDraftSchoolsCount, visibleDraftSchoolsCount } = useMemo(')
    && !source.includes('const filteredSchools = useMemo(() => {');

if (alreadyApplied) {
    console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'school-portfolio-projection' }, null, 2));
    process.exit(0);
}

if (!source.includes(importBefore)) {
    throw new Error('School portfolio projection import anchor not found.');
}
if (!source.includes(blockBefore)) {
    throw new Error('School portfolio projection computation anchor not found.');
}

source = source.replace(importBefore, importAfter).replace(blockBefore, blockAfter);
fs.writeFileSync(managerPath, source);

console.log(JSON.stringify({
    status: 'APPLIED',
    phase: 'school-portfolio-projection',
    files: ['dashboards/admin/SchoolsManager.tsx'],
}, null, 2));
