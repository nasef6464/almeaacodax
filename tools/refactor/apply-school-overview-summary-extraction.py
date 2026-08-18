from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANAGER = ROOT / "dashboards/admin/SchoolsManager.tsx"
SCHOOL_SMOKE = ROOT / "scripts/smoke-school-management-contract.mjs"
RELATIONSHIP_SMOKE = ROOT / "scripts/smoke-batch100f-relationship-audit-contract.mjs"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return source.replace(old, new, 1)


manager = MANAGER.read_text(encoding="utf-8")
manager = replace_once(
    manager,
    "import { SchoolWideSupervisorsPanel } from './SchoolsManager/SchoolWideSupervisorsPanel';\n",
    "import { SchoolWideSupervisorsPanel } from './SchoolsManager/SchoolWideSupervisorsPanel';\n"
    "import { SchoolOverviewOperationsPanel } from './SchoolsManager/SchoolOverviewOperationsPanel';\n",
    "overview operations import",
)

start_marker = '                            <div data-testid="school-overview-focus-strip" className="rounded-2xl border border-slate-100 bg-slate-50 p-4">\n'
first = manager.find(start_marker)
if first < 0:
    raise SystemExit("first overview focus strip not found")
start = manager.find(start_marker, first + len(start_marker))
if start < 0:
    raise SystemExit("rich overview focus strip not found")
end_marker = '\n\n                            <SchoolSingleStudentPanel\n'
end = manager.find(end_marker, start)
if end < 0:
    raise SystemExit("overview operations panel end marker not found")

replacement = """                            <SchoolOverviewOperationsPanel\n                                overviewFocusActions={overviewFocusActions}\n                                nextOperatingStep={nextOperatingStep}\n                                studentCount={schoolStudents.length}\n                                classCount={schoolClasses.length}\n                                activePackageCount={activeSchoolPackages.length}\n                                totalSeats={totalSeats}\n                                usedSeats={usedSeats}\n                                activeCodeCount={activeSchoolCodes.length}\n                                classOperatingRows={classOperatingRows}\n                                onFocusAction={(action) => {\n                                    setActiveTab(action.tab || 'overview');\n                                    window.setTimeout(() => {\n                                        document.querySelector(`[data-testid=\"${action.target}\"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });\n                                    }, 80);\n                                }}\n                                onOpenClass={(classroomId) => {\n                                    document.querySelector(`[data-school-class-id=\"${classroomId}\"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });\n                                }}\n                            />"""
manager = manager[:start] + replacement + manager[end:]
MANAGER.write_text(manager, encoding="utf-8")

school_smoke = SCHOOL_SMOKE.read_text(encoding="utf-8")
school_anchor = '  await read("dashboards/admin/SchoolsManager/SchoolWideSupervisorsPanel.tsx"),\n'
school_smoke = replace_once(
    school_smoke,
    school_anchor,
    school_anchor + '  await read("dashboards/admin/SchoolsManager/SchoolOverviewOperationsPanel.tsx"),\n',
    "school management overview operations ownership",
)
SCHOOL_SMOKE.write_text(school_smoke, encoding="utf-8")

relationship_smoke = RELATIONSHIP_SMOKE.read_text(encoding="utf-8")
relationship_anchor = '    read("dashboards/admin/SchoolsManager/SchoolWideSupervisorsPanel.tsx"),\n'
relationship_smoke = replace_once(
    relationship_smoke,
    relationship_anchor,
    relationship_anchor + '    read("dashboards/admin/SchoolsManager/SchoolOverviewOperationsPanel.tsx"),\n',
    "relationship audit overview operations ownership",
)
RELATIONSHIP_SMOKE.write_text(relationship_smoke, encoding="utf-8")

print("School overview focus, metrics and class operating summary extraction applied safely.")
