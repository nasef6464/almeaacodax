from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANAGER = ROOT / "dashboards/admin/SchoolsManager.tsx"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return source.replace(old, new, 1)


manager = MANAGER.read_text(encoding="utf-8")

manager = replace_once(
    manager,
    "import { SchoolCommandCenterPanel } from './SchoolsManager/SchoolCommandCenterPanel';\n",
    "import { SchoolCommandCenterPanel } from './SchoolsManager/SchoolCommandCenterPanel';\n"
    "import { SchoolPortfolioFilterPanel } from './SchoolsManager/SchoolPortfolioFilterPanel';\n",
    "portfolio filter import",
)

filter_marker = '            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">\n                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">\n                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">\n                        <Search size={18} className="text-gray-400" />\n'
start = manager.find(filter_marker)
if start < 0:
    raise SystemExit("portfolio filter block start not found")

end_marker = '\n\n            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">'
end = manager.find(end_marker, start)
if end < 0:
    raise SystemExit("portfolio filter block end not found")

replacement = """            <SchoolPortfolioFilterPanel
                schoolSearch={schoolSearch}
                schoolListMode={schoolListMode}
                filteredSchoolsCount={filteredSchools.length}
                schoolsCount={schools.length}
                hiddenDraftSchoolsCount={hiddenDraftSchoolsCount}
                visibleDraftSchoolsCount={visibleDraftSchoolsCount}
                onSearchChange={setSchoolSearch}
                onModeChange={setSchoolListMode}
            />"""

manager = manager[:start] + replacement + manager[end:]
MANAGER.write_text(manager, encoding="utf-8")

print("School portfolio filter presentation extraction applied safely.")
