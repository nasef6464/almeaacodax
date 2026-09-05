import { readFile, writeFile } from 'node:fs/promises';

const replaceOnce = (source, label, before, after) => {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing transform anchor: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Ambiguous transform anchor: ${label}`);
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
};

const routeFile = new URL('../../server/src/routes/course.routes.ts', import.meta.url);
let route = await readFile(routeFile, 'utf8');
route = replaceOnce(
  route,
  'course kind query',
  '  search: z.string().trim().max(120).optional(),\n});',
  "  search: z.string().trim().max(120).optional(),\n  kind: z.enum(['learning', 'package', 'all']).default('all'),\n});",
);
route = replaceOnce(
  route,
  'course cache key kind',
  '      query.search || "",\n    ].join(":");',
  '      query.search || "",\n      query.kind || "all",\n    ].join(":");',
);
route = replaceOnce(
  route,
  'course scoped product kind',
  '    const scopedFilter: Record<string, unknown> = {};\n    if (query.pathId) scopedFilter.pathId = query.pathId;',
  "    const scopedFilter: Record<string, unknown> = {};\n    if (query.kind === 'learning') scopedFilter.isPackage = { $ne: true };\n    if (query.kind === 'package') scopedFilter.isPackage = true;\n    if (query.pathId) scopedFilter.pathId = query.pathId;",
);
await writeFile(routeFile, route, 'utf8');

const managerFile = new URL('../../dashboards/admin/CoursesManager.tsx', import.meta.url);
let manager = await readFile(managerFile, 'utf8');
manager = replaceOnce(
  manager,
  'learning course helper import',
  "import { getCourseAudienceCount, getCourseRating } from '../../utils/courseStats';",
  "import { getCourseAudienceCount, getCourseRating } from '../../utils/courseStats';\nimport { isLearningCourse } from '../../utils/courseProductKind';",
);
manager = replaceOnce(
  manager,
  'course access presentation',
  "const getCourseAccessMeta = (course: Course) =>\n  course.isPackage\n    ? { label: 'باقة بيع', className: 'bg-violet-50 text-violet-700' }\n    : course.price > 0\n      ? { label: 'مدفوعة / تحتاج اشتراك', className: 'bg-amber-50 text-amber-700' }\n      : { label: 'مفتوحة أو مجانية', className: 'bg-emerald-50 text-emerald-700' };",
  "const getCourseAccessMeta = (course: Course) =>\n  course.price > 0\n    ? { label: 'دورة مدفوعة / تحتاج اشتراك', className: 'bg-amber-50 text-amber-700' }\n    : { label: 'دورة مفتوحة أو مجانية', className: 'bg-emerald-50 text-emerald-700' };",
);
manager = replaceOnce(
  manager,
  'package readiness issue',
  "  if (course.isPackage && course.price > 0 && !course.packageContentTypes?.length) issues.push('الباقة تحتاج تحديد ما تفتحه');\n",
  '',
);
manager = replaceOnce(
  manager,
  'learning-only manager filter',
  '  const filteredCourses = courses.filter((course) => {\n    const matchesSearch =',
  '  const filteredCourses = courses.filter((course) => {\n    if (!isLearningCourse(course)) return false;\n    const matchesSearch =',
);
manager = replaceOnce(
  manager,
  'paid learning overview',
  "    sellable: filteredCourses.filter((course) => course.isPackage || course.price > 0).length,",
  '    paid: filteredCourses.filter((course) => course.price > 0).length,',
);
manager = replaceOnce(
  manager,
  'paid learning overview label',
  "          { label: 'القابل للبيع / الاشتراك', value: courseOverview.sellable, tone: 'text-amber-800 bg-amber-50' },",
  "          { label: 'الدورات المدفوعة', value: courseOverview.paid, tone: 'text-amber-800 bg-amber-50' },",
);
manager = replaceOnce(
  manager,
  'learning preview type',
  "                <div className=\"mt-2 text-sm font-black text-emerald-900\">{previewCourse.isPackage ? 'باقة' : 'دورة'}</div>",
  "                <div className=\"mt-2 text-sm font-black text-emerald-900\">دورة تعليمية</div>",
);
manager = replaceOnce(
  manager,
  'package preview badge',
  "                  {previewCourse.isPackage ? (\n                    <span className=\"rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700\">باقة قابلة للبيع</span>\n                  ) : null}\n",
  '',
);
await writeFile(managerFile, manager, 'utf8');

console.log('Applied Gate 6 course product boundary patch.');
