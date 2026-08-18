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
GLOBAL_JOURNEY_SMOKE.write_text(global_smoke, encoding="utf-8")

print("Reports domain contracts and pure helpers extraction applied safely.")
