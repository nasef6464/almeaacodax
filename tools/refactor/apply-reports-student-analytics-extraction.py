from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "pages/Reports.tsx"
REPORT_ROLE_SMOKE = ROOT / "scripts/smoke-reports-role-contract.mjs"
GLOBAL_JOURNEY_SMOKE = ROOT / "scripts/smoke-global-student-journey-contract.mjs"
PERFORMANCE_SMOKE = ROOT / "scripts/smoke-performance-contract.mjs"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return source.replace(old, new, 1)


reports = REPORTS.read_text(encoding="utf-8")
reports = replace_once(
    reports,
    "import { buildSkillRecommendation } from './Reports/recommendationViewModel';\n",
    "import { buildSkillRecommendation } from './Reports/recommendationViewModel';\n"
    "import {\n"
    "    buildStudentAggregatedSkills,\n"
    "    buildStudentEvidenceSummary,\n"
    "    buildStudentPerformanceStats,\n"
    "    buildStudentSkillReadinessSummary,\n"
    "} from './Reports/studentAnalyticsViewModel';\n",
    "student analytics import",
)

stats_start = reports.find("    // Calculate Performance Analysis\n    const stats = useMemo(() => {\n")
stats_end_marker = "\n\n    // Aggregate Skill Analysis\n"
if stats_start < 0:
    raise SystemExit("student stats start not found")
stats_end = reports.find(stats_end_marker, stats_start)
if stats_end < 0:
    raise SystemExit("student stats end not found")
stats_adapter = """    // Calculate Performance Analysis\n    const stats = useMemo(\n        () => buildStudentPerformanceStats(studentPeriodExamResults, studentPeriodQuestionAttempts),\n        [studentPeriodExamResults, studentPeriodQuestionAttempts],\n    );"""
reports = reports[:stats_start] + stats_adapter + reports[stats_end:]

skills_start = reports.find("    // Aggregate Skill Analysis\n    const aggregatedSkills = useMemo(() => {\n")
skills_end_marker = "\n\n    const weakestSkill = aggregatedSkills.length > 0 ? aggregatedSkills[0] : null;\n"
if skills_start < 0:
    raise SystemExit("aggregated skills start not found")
skills_end = reports.find(skills_end_marker, skills_start)
if skills_end < 0:
    raise SystemExit("aggregated skills end not found")
skills_adapter = """    // Aggregate Skill Analysis\n    const aggregatedSkills = useMemo(\n        () => buildStudentAggregatedSkills({\n            examResults: studentPeriodExamResults,\n            questionAttempts: studentPeriodQuestionAttempts,\n            questions,\n            skills,\n            subjects,\n            sections,\n            minSkillEvidence: MIN_SKILL_EVIDENCE_COUNT,\n        }),\n        [studentPeriodExamResults, studentPeriodQuestionAttempts, questions, sections, skills, subjects],\n    );"""
reports = reports[:skills_start] + skills_adapter + reports[skills_end:]

old_evidence = """    const studentEvidenceSummary = useMemo(() => {\n        const totalQuestions = aggregatedSkills.reduce((sum, skill) => sum + (skill.totalEvidence || skill.attempts || 0), 0);\n        const uniqueSkills = aggregatedSkills.length;\n        return { totalQuestions, uniqueSkills };\n    }, [aggregatedSkills]);\n"""
new_evidence = """    const studentEvidenceSummary = useMemo(\n        () => buildStudentEvidenceSummary(aggregatedSkills),\n        [aggregatedSkills],\n    );\n"""
reports = replace_once(reports, old_evidence, new_evidence, "student evidence summary")

readiness_start = reports.find("    const skillReadinessSummary = useMemo(() => {\n")
readiness_end_marker = "\n    const studentWeeklyPlan = useMemo(() => {\n"
if readiness_start < 0:
    raise SystemExit("skill readiness summary start not found")
readiness_end = reports.find(readiness_end_marker, readiness_start)
if readiness_end < 0:
    raise SystemExit("skill readiness summary end not found")
readiness_adapter = """    const skillReadinessSummary = useMemo(\n        () => buildStudentSkillReadinessSummary(\n            reportBaseSkills,\n            reliableAggregatedSkills.length,\n            MIN_SKILL_EVIDENCE_COUNT,\n        ),\n        [reliableAggregatedSkills.length, reportBaseSkills],\n    );"""
reports = reports[:readiness_start] + readiness_adapter + reports[readiness_end:]
REPORTS.write_text(reports, encoding="utf-8")

role_smoke = REPORT_ROLE_SMOKE.read_text(encoding="utf-8")
role_anchor = "  await readFile(new URL('../pages/Reports/recommendationViewModel.ts', import.meta.url), 'utf8'),\n"
role_smoke = replace_once(
    role_smoke,
    role_anchor,
    role_anchor + "  await readFile(new URL('../pages/Reports/studentAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
    "reports role student analytics aggregate source",
)
REPORT_ROLE_SMOKE.write_text(role_smoke, encoding="utf-8")

global_smoke = GLOBAL_JOURNEY_SMOKE.read_text(encoding="utf-8")
global_anchor = "    await readFile(new URL('../pages/Reports/recommendationViewModel.ts', import.meta.url), 'utf8'),\n"
global_smoke = replace_once(
    global_smoke,
    global_anchor,
    global_anchor + "    await readFile(new URL('../pages/Reports/studentAnalyticsViewModel.ts', import.meta.url), 'utf8'),\n",
    "global journey student analytics aggregate source",
)
GLOBAL_JOURNEY_SMOKE.write_text(global_smoke, encoding="utf-8")

performance = PERFORMANCE_SMOKE.read_text(encoding="utf-8")
performance = replace_once(
    performance,
    "assertIncludes('pages/Reports.tsx', 'isReliable: data.count >= MIN_SKILL_EVIDENCE_COUNT');\n",
    "assertIncludes('pages/Reports/studentAnalyticsViewModel.ts', 'isReliable: data.count >= minSkillEvidence');\n",
    "performance student analytics ownership",
)
PERFORMANCE_SMOKE.write_text(performance, encoding="utf-8")

print("Reports student analytics view-model extraction applied safely.")
