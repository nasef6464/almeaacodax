from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "pages/Reports.tsx"
REPORT_ROLE_SMOKE = ROOT / "scripts/smoke-reports-role-contract.mjs"
GLOBAL_JOURNEY_SMOKE = ROOT / "scripts/smoke-global-student-journey-contract.mjs"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return source.replace(old, new, 1)


reports = REPORTS.read_text(encoding="utf-8")
reports = replace_once(
    reports,
    "import { loadXlsx } from '../utils/xlsxLoader';\n",
    "import { loadXlsx } from '../utils/xlsxLoader';\n"
    "import {\n"
    "    MIN_SKILL_EVIDENCE_COUNT,\n"
    "    buildDirectedQuizManagerLink,\n"
    "    buildSkillSessionLink,\n"
    "    displayText,\n"
    "    filterStudentReportPeriod,\n"
    "    getReportMasteryTone,\n"
    "    getReportSkillKey,\n"
    "    roleScopeTitle,\n"
    "    scoreTone,\n"
    "    studentReportPeriodLabels,\n"
    "    type ScopedAnalyticsOverview,\n"
    "    type ScopedQuizResult,\n"
    "    type SkillRecommendation,\n"
    "    type SmartRemediationPlan,\n"
    "    type StudentAggregatedSkill,\n"
    "    type StudentReportPeriod,\n"
    "} from './Reports/reportDomain';\n",
    "report domain import",
)
reports = replace_once(
    reports,
    "import { sanitizeArabicText } from '../utils/sanitizeMojibakeArabic';\n",
    "",
    "sanitize import moved to report domain",
)

start = reports.find("interface ScopedAnalyticsOverview {\n")
if start < 0:
    raise SystemExit("report domain block start not found")
end = reports.find("const getSkillRecommendation = (\n", start)
if end < 0:
    raise SystemExit("report domain block end not found")
reports = reports[:start] + reports[end:]
REPORTS.write_text(reports, encoding="utf-8")

role_smoke = REPORT_ROLE_SMOKE.read_text(encoding="utf-8")
role_smoke = replace_once(
    role_smoke,
    "const reportsSource = await readFile(new URL('../pages/Reports.tsx', import.meta.url), 'utf8');\n",
    "const reportsSource = [\n"
    "  await readFile(new URL('../pages/Reports.tsx', import.meta.url), 'utf8'),\n"
    "  await readFile(new URL('../pages/Reports/reportDomain.ts', import.meta.url), 'utf8'),\n"
    "].join('\\n');\n",
    "reports role aggregate source",
)
role_smoke = replace_once(
    role_smoke,
    "  assertIncludes(reportsSource, 'مصدر التقرير: تحليل إجابات الاختبارات المرتبطة بهذه المهارة.');\n",
    "  assertIncludes(reportsSource, 'نرتب المهارات من الأضعف للأقوى بناءً على الأسئلة التي حللتها في كل اختبار');\n",
    "student evidence explanation follows current UI semantics",
)
role_smoke = replace_once(
    role_smoke,
    "  assertIncludes(reportsSource, 'if (user.role === Role.PARENT)');\n",
    "  assertIncludes(reportsSource, 'if (user?.role === Role.PARENT)');\n",
    "parent branch follows current null-safe role guard",
)
REPORT_ROLE_SMOKE.write_text(role_smoke, encoding="utf-8")

global_smoke = GLOBAL_JOURNEY_SMOKE.read_text(encoding="utf-8")
global_smoke = replace_once(
    global_smoke,
    "  reports: await readFile(new URL('../pages/Reports.tsx', import.meta.url), 'utf8'),\n",
    "  reports: [\n"
    "    await readFile(new URL('../pages/Reports.tsx', import.meta.url), 'utf8'),\n"
    "    await readFile(new URL('../pages/Reports/reportDomain.ts', import.meta.url), 'utf8'),\n"
    "  ].join('\\n'),\n",
    "global student journey reports aggregate source",
)
old_dashboard_check = """check('student dashboard keeps one clear continuation area and learner shortcuts', () => {\n  assertIncludes(files.dashboard, 'StudentNextActionStrip');\n  assertIncludes(files.dashboard, \"import { EmptyState } from '../components/ui/EmptyState'\");\n  assertIncludes(files.dashboard, 'smartAction.buttonText');\n  assertIncludes(files.dashboard, 'smartAction.link');\n  assertIncludes(files.dashboard, 'data-testid=\"student-path-enroll\"');\n  assertIncludes(files.dashboard, 'data-testid=\"student-path-unenroll\"');\n  assertIncludes(files.dashboard, 'data-testid=\"student-paths-empty-state\"');\n  assertIncludes(files.dashboard, 'primaryAction={{ label:');\n  assertIncludes(files.dashboard, 'secondaryAction={{ label:');\n  assertIncludes(files.dashboard, 'id=\"available-paths\"');\n  assertIncludes(files.dashboard, 'هل تريد إلغاء التسجيل في مسار');\n  assertIncludes(files.dashboard, \"setActiveTab('saher')\");\n  assertIncludes(files.dashboard, \"setActiveTab('quizzes')\");\n  assertIncludes(files.dashboard, \"setActiveTab('reports')\");\n  assertIncludes(files.dashboard, \"setActiveTab('plan')\");\n  assertAnyIncludes(files.dashboard, ['آخر الأنشطة', 'Ø¢Ø®Ø± Ø§Ù„Ø£Ù†Ø´Ø·Ø©']);\n});\n"""
new_dashboard_check = """check('student dashboard keeps a clear continuation area and learner shortcuts', () => {\n  assertIncludes(files.dashboard, \"import { EmptyState } from '../components/ui/EmptyState'\");\n  assertIncludes(files.dashboard, 'const smartPathSkills = buildSmartPathSkillsFromResults(examResults);');\n  assertIncludes(files.dashboard, '<SmartLearningPath skills={smartPathSkills} />');\n  assertIncludes(files.dashboard, 'أكمل مساراتك');\n  assertIncludes(files.dashboard, 'to={path.courses[0] ? `/course/${path.courses[0].id}` : `/category/${path.id}`}');\n  assertIncludes(files.dashboard, 'data-testid=\"student-path-enroll\"');\n  assertIncludes(files.dashboard, 'data-testid=\"student-path-unenroll\"');\n  assertIncludes(files.dashboard, 'data-testid=\"student-paths-empty-state\"');\n  assertIncludes(files.dashboard, 'primaryAction={{ label:');\n  assertIncludes(files.dashboard, 'secondaryAction={{ label:');\n  assertIncludes(files.dashboard, 'id=\"available-paths\"');\n  assertIncludes(files.dashboard, 'هل تريد إلغاء التسجيل في مسار');\n  assertIncludes(files.dashboard, \"{ id: 'saher'\");\n  assertIncludes(files.dashboard, \"{ id: 'flashcards'\");\n  assertIncludes(files.dashboard, \"{ id: 'quizzes'\");\n  assertIncludes(files.dashboard, \"{ id: 'reports'\");\n  assertIncludes(files.dashboard, 'onClick={() => setActiveTab(btn.id as any)}');\n  assertIncludes(files.dashboard, 'آخر إنجازاتك');\n});\n"""
global_smoke = replace_once(
    global_smoke,
    old_dashboard_check,
    new_dashboard_check,
    "global journey dashboard contract follows current dashboard continuation semantics",
)
GLOBAL_JOURNEY_SMOKE.write_text(global_smoke, encoding="utf-8")

print("Reports domain contracts and pure helpers extraction applied safely.")
