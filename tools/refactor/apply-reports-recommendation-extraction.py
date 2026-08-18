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
    "import { matchesEntityId } from '../utils/entityIds';\n",
    "",
    "recommendation entity-id import ownership",
)
reports = replace_once(
    reports,
    "} from './Reports/reportDomain';\n",
    "} from './Reports/reportDomain';\n"
    "import { buildSkillRecommendation } from './Reports/recommendationViewModel';\n",
    "recommendation view-model import",
)

start = reports.find("const getSkillRecommendation = (\n")
if start < 0:
    raise SystemExit("getSkillRecommendation start not found")
end = reports.find("\n\nconst Reports: React.FC = () => {", start)
if end < 0:
    raise SystemExit("getSkillRecommendation end not found")

adapter = """const getSkillRecommendation = (\n    skill: { skill?: string; skillId?: string } | undefined,\n    allSkills: ReturnType<typeof useStore.getState>['skills'],\n    lessons: ReturnType<typeof useStore.getState>['lessons'],\n    quizzes: ReturnType<typeof useStore.getState>['quizzes'],\n    libraryItems: ReturnType<typeof useStore.getState>['libraryItems'],\n    questions: ReturnType<typeof useStore.getState>['questions'],\n    topics: ReturnType<typeof useStore.getState>['topics'],\n): SkillRecommendation =>\n    buildSkillRecommendation(skill, {\n        allSkills,\n        lessons,\n        quizzes,\n        libraryItems,\n        questions,\n        topics,\n        subjects: useStore.getState().subjects,\n        sections: useStore.getState().sections,\n    });"""
reports = reports[:start] + adapter + reports[end:]
REPORTS.write_text(reports, encoding="utf-8")

role_smoke = REPORT_ROLE_SMOKE.read_text(encoding="utf-8")
role_smoke = replace_once(
    role_smoke,
    "  await readFile(new URL('../pages/Reports/reportDomain.ts', import.meta.url), 'utf8'),\n",
    "  await readFile(new URL('../pages/Reports/reportDomain.ts', import.meta.url), 'utf8'),\n"
    "  await readFile(new URL('../pages/Reports/recommendationViewModel.ts', import.meta.url), 'utf8'),\n",
    "reports role recommendation aggregate source",
)
REPORT_ROLE_SMOKE.write_text(role_smoke, encoding="utf-8")

global_smoke = GLOBAL_JOURNEY_SMOKE.read_text(encoding="utf-8")
global_smoke = replace_once(
    global_smoke,
    "    await readFile(new URL('../pages/Reports/reportDomain.ts', import.meta.url), 'utf8'),\n",
    "    await readFile(new URL('../pages/Reports/reportDomain.ts', import.meta.url), 'utf8'),\n"
    "    await readFile(new URL('../pages/Reports/recommendationViewModel.ts', import.meta.url), 'utf8'),\n",
    "global journey recommendation aggregate source",
)
GLOBAL_JOURNEY_SMOKE.write_text(global_smoke, encoding="utf-8")

print("Reports skill recommendation view-model extraction applied safely.")
