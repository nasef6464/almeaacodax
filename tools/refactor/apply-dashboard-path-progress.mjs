import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const dashboardPath = 'pages/Dashboard.tsx';
const dashboardFile = path.join(root, dashboardPath);
const source = fs.readFileSync(dashboardFile, 'utf8');

const importAnchor = "import { ParentStudentLinker } from '../components/ParentStudentLinker';";
const importLine = "import { courseBelongsToPath, resolvePathProgress } from './Dashboard/pathProgressProjection';";

const block = `const normalizeDashboardScope = (value?: string) => (value ?? '').trim().toLowerCase();

const courseBelongsToPath = (course: { pathId?: string; category?: string }, path: { id: string; name?: string }) => {
    const coursePath = normalizeDashboardScope(course.pathId || course.category);
    return coursePath === normalizeDashboardScope(path.id) || coursePath === normalizeDashboardScope(path.name);
};

const getCourseLessons = (course: { modules?: Array<{ lessons: Array<{ id: string }> }> }) =>
    course.modules?.flatMap((module) => module.lessons || []) || [];

const resolvePathProgress = (
    path: { id: string; name?: string },
    courses: Array<{ pathId?: string; category?: string; modules?: Array<{ lessons: Array<{ id: string }> }> }>,
    completedLessons: string[],
    examResults: Array<{ skillsAnalysis?: Array<{ pathId?: string }> }>,
) => {
    const pathCourses = courses.filter((course) => courseBelongsToPath(course, path));
    const lessonIds = pathCourses.flatMap(getCourseLessons).map((lesson) => lesson.id);
    const completedLessonCount = lessonIds.filter((lessonId) => completedLessons.includes(lessonId)).length;
    const pathExamCount = examResults.filter((result) => (result.skillsAnalysis || []).some((skill) => skill.pathId === path.id)).length;
    const completedUnits = completedLessonCount + pathExamCount;
    const totalUnits = lessonIds.length + pathExamCount;

    return {
        coursesCount: pathCourses.length,
        lessonsCount: lessonIds.length,
        completedLessonCount,
        examsCount: pathExamCount,
        progress: totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0,
    };
};`;

const hasImport = source.includes(importLine);
const hasBlock = source.includes(block);

if (hasImport && !hasBlock) {
  console.log(JSON.stringify({ status: 'ALREADY_APPLIED', phase: 'dashboard-path-progress' }, null, 2));
  process.exit(0);
}

if (hasImport || !hasBlock) {
  throw new Error(`Unexpected partial Dashboard path progress state: import=${hasImport}, block=${hasBlock}`);
}

if (!source.includes(importAnchor)) {
  throw new Error(`Missing guarded import anchor: ${importAnchor}`);
}

let next = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
if (next === source) throw new Error('Failed to insert Dashboard path progress import.');

next = next.replace(`${block}\n\n`, '');
if (next.includes(block)) throw new Error('Failed to remove local Dashboard path progress block.');

fs.writeFileSync(dashboardFile, next, 'utf8');
execFileSync('git', ['add', '--', dashboardPath], { cwd: root, stdio: 'inherit' });

console.log(JSON.stringify({
  status: 'APPLIED',
  phase: 'dashboard-path-progress',
  changedFiles: [dashboardPath],
}, null, 2));
