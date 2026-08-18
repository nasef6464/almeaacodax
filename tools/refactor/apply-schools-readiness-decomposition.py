from pathlib import Path

root = Path('.')
manager_path = root / 'dashboards/admin/SchoolsManager.tsx'
manager = manager_path.read_text(encoding='utf-8')

import_anchor = "import {\n    createCsvDownload,\n    createWorkbookDownload,\n    createXlsxDownload,\n    escapeHtml,\n    openPrintWindow,\n    renderPrintTable,\n} from './SchoolsManager/exportHelpers';\n"
readiness_import = "import {\n    buildSchoolPortfolioRows,\n    getSchoolOperationalSnapshot as calculateSchoolOperationalSnapshot,\n    summarizeSchoolPortfolio,\n} from './SchoolsManager/readinessViewModel';\n"
if readiness_import not in manager:
    if import_anchor not in manager:
        raise SystemExit('Could not locate SchoolsManager exportHelpers import anchor.')
    manager = manager.replace(import_anchor, import_anchor + readiness_import, 1)

students_start = "    const getStudentsForSchool = (school: Group, schoolClasses: Group[]) => {\n"
students_end = "    const supervisors = useMemo(\n"
start = manager.find(students_start)
end = manager.find(students_end, start if start != -1 else 0)
if start != -1:
    if end == -1 or end <= start:
        raise SystemExit('Could not locate school student selector extraction boundary.')
    manager = manager[:start] + manager[end:]
elif 'const getStudentsForSchool = (school: Group' in manager:
    raise SystemExit('School student selector shape changed; refusing partial edit.')

snapshot_start = "    const getSchoolOperationalSnapshot = (school: Group) => {\n"
snapshot_end = "    const filteredSchools = useMemo(() => {\n"
start = manager.find(snapshot_start)
end = manager.find(snapshot_end, start if start != -1 else 0)
if start != -1:
    if end == -1 or end <= start:
        raise SystemExit('Could not locate operational snapshot extraction boundary.')
    wrapper = """    const getOperationalSnapshotForSchool = (school: Group) => calculateSchoolOperationalSnapshot(school, {\n        classes,\n        students,\n        b2bPackages,\n        accessCodes,\n    });\n\n"""
    manager = manager[:start] + wrapper + manager[end:]
elif 'const getSchoolOperationalSnapshot = (school: Group)' in manager:
    raise SystemExit('Operational snapshot shape changed; refusing partial edit.')

manager = manager.replace('getSchoolOperationalSnapshot(school)', 'getOperationalSnapshotForSchool(school)')

portfolio_start = "    const schoolPortfolioRows = useMemo(() => schools.map((school) => {\n"
portfolio_end = "    const exportSchoolPortfolioReadiness = () => {\n"
start = manager.find(portfolio_start)
end = manager.find(portfolio_end, start if start != -1 else 0)
if start != -1:
    if end == -1 or end <= start:
        raise SystemExit('Could not locate school portfolio view-model extraction boundary.')
    replacement = """    const schoolPortfolioRows = useMemo(\n        () => buildSchoolPortfolioRows(schools, { classes, students, b2bPackages, accessCodes }),\n        [accessCodes, b2bPackages, classes, schools, students],\n    );\n    const schoolPortfolioSummary = useMemo(\n        () => summarizeSchoolPortfolio(schoolPortfolioRows),\n        [schoolPortfolioRows],\n    );\n\n"""
    manager = manager[:start] + replacement + manager[end:]
elif 'const schoolPortfolioRows = useMemo(() => schools.map((school) => {' in manager:
    raise SystemExit('Portfolio mapping shape changed; refusing partial edit.')

manager_path.write_text(manager, encoding='utf-8')

ledger_path = root / 'docs/architecture/REFACTOR_V2_EXECUTION_LEDGER_AR.md'
ledger = ledger_path.read_text(encoding='utf-8')
ledger = ledger.replace(
    '**الحالة: بدأت مرحلة الفحص والتفكيك التدريجي.**',
    '**الحالة: تم تطبيق استخراج readiness/view-model وتنتظر Full Phase Review قبل الإغلاق.**',
    1,
)
ledger_path.write_text(ledger, encoding='utf-8')

print('Schools readiness/view-model decomposition applied safely.')
