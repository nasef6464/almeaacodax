import { readFile, writeFile } from 'node:fs/promises';

const files = {
  quizPage: new URL('../pages/QuizPage.tsx', import.meta.url),
  quizzesApi: new URL('../services/apiGroups/quizzesApi.ts', import.meta.url),
  contract: new URL('./smoke-supervisor-dashboard-contract.mjs', import.meta.url),
};

async function replaceExact(path, before, after, label) {
  const source = await readFile(path, 'utf8');
  if (source.includes(after)) return false;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one source block, found ${count}`);
  await writeFile(path, source.replace(before, after), 'utf8');
  return true;
}

let changed = false;

changed = (await replaceExact(
  files.quizzesApi,
  `  getQuizzes: async (pagination: PaginationOptions = {}) =>\n    extractList(await request<unknown>(withQuery("/quizzes", { limit: 200, ...pagination })), "quizzes"),\n\n  getQuizAnalyticsOverview:`,
  `  getQuizzes: async (pagination: PaginationOptions = {}) =>\n    extractList(await request<unknown>(withQuery("/quizzes", { limit: 200, ...pagination })), "quizzes"),\n\n  getQuiz: (id: string, token?: string | null) =>\n    request<unknown>(\`/quizzes/\${encodeURIComponent(id)}\`, { token }),\n\n  getQuizAnalyticsOverview:`,
  'quizzes API authoritative detail read',
)) || changed;

changed = (await replaceExact(
  files.quizPage,
  `  const [hasAccess, setHasAccess] = useState<boolean | null>(null);\n  const [accessMessage, setAccessMessage] = useState('هذا الاختبار غير متاح لك حاليًا.');`,
  `  const [hasAccess, setHasAccess] = useState<boolean | null>(null);\n  const [directedEntryAccess, setDirectedEntryAccess] = useState<{\n    quizId: string;\n    status: 'idle' | 'checking' | 'allowed' | 'denied';\n  }>({ quizId: '', status: 'idle' });\n  const [accessMessage, setAccessMessage] = useState('هذا الاختبار غير متاح لك حاليًا.');`,
  'QuizPage directed entry state',
)) || changed;

changed = (await replaceExact(
  files.quizPage,
  `  useEffect(() => {\n    if (isResolvingScopedQuestions) {\n      return;\n    }\n\n    const foundQuiz = quizzes.find((item) => item.id === quizId);`,
  `  useEffect(() => {\n    const foundQuiz = quizzes.find((item) => item.id === quizId);\n    const isStaffViewer = ['admin', 'teacher', 'supervisor'].includes(user.role);\n    const hasExplicitTargets = Boolean(foundQuiz && ((foundQuiz.targetUserIds || []).length > 0 || (foundQuiz.targetGroupIds || []).length > 0));\n\n    if (!foundQuiz || isStaffViewer || !hasExplicitTargets) {\n      setDirectedEntryAccess({ quizId: foundQuiz?.id || '', status: 'idle' });\n      return;\n    }\n\n    let cancelled = false;\n    setDirectedEntryAccess({ quizId: foundQuiz.id, status: 'checking' });\n    api.getQuiz(foundQuiz.id)\n      .then(() => {\n        if (!cancelled) setDirectedEntryAccess({ quizId: foundQuiz.id, status: 'allowed' });\n      })\n      .catch(() => {\n        if (!cancelled) setDirectedEntryAccess({ quizId: foundQuiz.id, status: 'denied' });\n      });\n\n    return () => {\n      cancelled = true;\n    };\n  }, [quizId, quizzes, user.role]);\n\n  useEffect(() => {\n    if (isResolvingScopedQuestions) {\n      return;\n    }\n\n    const foundQuiz = quizzes.find((item) => item.id === quizId);`,
  'QuizPage server-authoritative directed entry check',
)) || changed;

changed = (await replaceExact(
  files.quizPage,
  `    const targetUserIds = foundQuiz.targetUserIds || [];\n    const targetGroupIds = foundQuiz.targetGroupIds || [];\n    const hasExplicitTargets = targetUserIds.length > 0 || targetGroupIds.length > 0;\n    if (!isStaffViewer && ((foundQuiz.mode || 'regular') === 'central' || hasExplicitTargets)) {\n      const userGroups = Array.from(new Set([...(user.groupIds || []), ...(user.schoolId ? [user.schoolId] : [])]));\n      const isUserTargeted = targetUserIds.length > 0 && targetUserIds.includes(user.id);\n      const isGroupTargeted = targetGroupIds.length > 0 && targetGroupIds.some((id) => userGroups.includes(id));\n\n      // Direct student targeting and school/class targeting are additive, matching the API contract.\n      if (hasExplicitTargets && !isUserTargeted && !isGroupTargeted) {\n        setHasAccess(false);\n        setAccessMessage('هذا اختبار مدرسي موجّه لطلاب محددين فقط.');\n        return;\n      }\n    }`,
  `    const targetUserIds = foundQuiz.targetUserIds || [];\n    const targetGroupIds = foundQuiz.targetGroupIds || [];\n    const hasExplicitTargets = targetUserIds.length > 0 || targetGroupIds.length > 0;\n    if (!isStaffViewer && hasExplicitTargets) {\n      const directedStatus = directedEntryAccess.quizId === foundQuiz.id ? directedEntryAccess.status : 'checking';\n      if (directedStatus === 'idle' || directedStatus === 'checking') {\n        setHasAccess(null);\n        return;\n      }\n      if (directedStatus === 'denied') {\n        setHasAccess(false);\n        setAccessMessage('هذا اختبار مدرسي موجّه لطلاب محددين فقط.');\n        return;\n      }\n    }`,
  'QuizPage remove stale client group-membership authority',
)) || changed;

changed = (await replaceExact(
  files.quizPage,
  `  }, [quizId, quizzes, questions, quizScopedQuestions, user, checkAccess, hasScopedPackageAccess, isResolvingScopedQuestions, sourceParam, sourceCourse, courseHasAccess]);`,
  `  }, [quizId, quizzes, questions, quizScopedQuestions, user, checkAccess, hasScopedPackageAccess, isResolvingScopedQuestions, sourceParam, sourceCourse, courseHasAccess, directedEntryAccess]);`,
  'QuizPage directed entry dependency',
)) || changed;

changed = (await replaceExact(
  files.contract,
  `const quizBuilder = await read("dashboards/admin/UnifiedQuizBuilder.tsx");\nconst quizModel = await read("server/src/models/Quiz.ts");`,
  `const quizBuilder = await read("dashboards/admin/UnifiedQuizBuilder.tsx");\nconst quizModel = await read("server/src/models/Quiz.ts");\nconst quizzesApi = await read("services/apiGroups/quizzesApi.ts");\nconst quizRoutes = await read("server/src/routes/quiz.routes.ts");`,
  'Supervisor contract authoritative entry sources',
)) || changed;

changed = (await replaceExact(
  files.contract,
  `check("student school-directed assessment list and runner share additive audience semantics", () => {\n  assertIncludes(quizzesPage, "directedQuizzes");\n  assertIncludes(quizzesPage, "الاختبارات المدرسية");\n  assertIncludes(quizzesPage, "...(user.schoolId ? [user.schoolId] : [])");\n  assertIncludes(quizzesPage, "targetUserIds.length > 0 && targetUserIds.includes(user.id)");\n  assertIncludes(quizzesPage, "if (!isUserTargeted && !isGroupTargeted) return false;");\n  assertIncludes(quizzesPage, "user.id, user.schoolId, visiblePathIds");\n  assertIncludes(quizPage, "const targetUserIds = foundQuiz.targetUserIds || [];");\n  assertIncludes(quizPage, "const targetGroupIds = foundQuiz.targetGroupIds || [];");\n  assertIncludes(quizPage, "...(user.schoolId ? [user.schoolId] : [])");\n  assertIncludes(quizPage, "targetUserIds.length > 0 && targetUserIds.includes(user.id)");\n  assertIncludes(quizPage, "targetGroupIds.length > 0 && targetGroupIds.some((id) => userGroups.includes(id))");\n  assertIncludes(quizPage, "if (hasExplicitTargets && !isUserTargeted && !isGroupTargeted)");\n  assertNotIncludes(quizPage, "if (!isUserTargeted || !isGroupTargeted)");\n});`,
  `check("student directed assessment entry delegates group membership authority to the protected detail API", () => {\n  assertIncludes(quizzesPage, "directedQuizzes");\n  assertIncludes(quizzesPage, "الاختبارات المدرسية");\n  assertIncludes(quizzesApi, "getQuiz: (id: string, token?: string | null)");\n  assertIncludes(quizzesApi, "encodeURIComponent(id)");\n  assertIncludes(quizPage, "api.getQuiz(foundQuiz.id)");\n  assertIncludes(quizPage, "status: 'checking'");\n  assertIncludes(quizPage, "directedStatus === 'denied'");\n  assertNotIncludes(quizPage, "targetGroupIds.length > 0 && targetGroupIds.some((id) => userGroups.includes(id))");\n  assertIncludes(quizRoutes, "const resolveDirectedQuizReadAccess = async");\n  assertIncludes(quizRoutes, "GroupModel.findOne");\n  assertIncludes(quizRoutes, "const directedReadAccess = await resolveDirectedQuizReadAccess(legacyQuiz, req.authUser);");\n});`,
  'Replace stale client audience smoke with server-authoritative entry contract',
)) || changed;

console.log(changed ? 'Learner assessment entry fix applied.' : 'Learner assessment entry fix already applied.');
