from pathlib import Path

root = Path('.')
manager_path = root / 'dashboards/admin/SchoolsManager.tsx'
manager = manager_path.read_text(encoding='utf-8')

reports_import = "import { SchoolReportsPanel } from './SchoolsManager/SchoolReportsPanel';\n"
if reports_import not in manager:
    import_anchor = "import { SchoolRelationsPanel } from './SchoolsManager/SchoolRelationsPanel';\n"
    if import_anchor not in manager:
        raise SystemExit('SchoolRelationsPanel import anchor not found; refusing unsafe reports patch.')
    manager = manager.replace(import_anchor, import_anchor + reports_import, 1)

start_marker = "                    {activeTab === 'reports' && (\n                        <div data-testid=\"school-reports-panel\" className=\"space-y-6\">\n"
end_marker = "\n                    )}\n                </div>\n            </div>\n        );\n    }\n"

start = manager.find(start_marker)
if start == -1:
    if '<SchoolReportsPanel' not in manager:
        raise SystemExit('Reports tab start marker not found and extraction is not already applied.')
else:
    end = manager.find(end_marker, start)
    if end == -1:
        raise SystemExit('Reports tab end marker not found; refusing partial extraction.')

    replacement = '''                    {activeTab === 'reports' && (\n                        <SchoolReportsPanel\n                            readinessScore={readinessScore}\n                            readinessTotal={readinessChecks.length}\n                            readinessStatusLabel={readinessStatusLabel}\n                            readinessNextStep={readinessNextStep}\n                            readinessPercent={readinessPercent}\n                            schoolClassCount={schoolClasses.length}\n                            schoolStudentCount={schoolStudents.length}\n                            schoolSupervisorCount={schoolSupervisors.length}\n                            activePackageCount={activeSchoolPackages.length}\n                            activeCodeCount={activeSchoolCodes.length}\n                            handoverBlockingGaps={handoverBlockingGaps}\n                            onNavigateTab={(tab) => setActiveTab(tab)}\n                            downloadSchoolHandover={downloadSchoolHandover}\n                            downloadSchoolGapReport={downloadSchoolGapReport}\n                            printSchoolReport={printSchoolReport}\n                            isLoadingReport={isLoadingReport}\n                            reportError={reportError}\n                            schoolReport={schoolReport}\n                            subjects={subjects}\n                            sections={sections}\n                            downloadSchoolPerformanceReport={downloadSchoolPerformanceReport}\n                        />\n                    )}'''

    closing = "\n                    )}"
    manager = manager[:start] + replacement + manager[end + len(closing):]

manager_path.write_text(manager, encoding='utf-8')

# Existing school-management smoke intentionally aggregates feature source text.
# Follow the new presentation ownership instead of forcing report markup back into
# the giant manager component.
contract_path = root / 'scripts/smoke-school-management-contract.mjs'
contract = contract_path.read_text(encoding='utf-8')
report_children = [
    '  await read("dashboards/admin/SchoolsManager/SchoolReportsPanel.tsx"),\n',
    '  await read("dashboards/admin/SchoolsManager/SchoolHandoverReportSummary.tsx"),\n',
    '  await read("dashboards/admin/SchoolsManager/SchoolPerformanceReportPanel.tsx"),\n',
]
anchor = '  await read("dashboards/admin/SchoolsManager/workspaceViewModel.ts"),\n'
if report_children[0] not in contract:
    if anchor not in contract:
        raise SystemExit('School management contract aggregation anchor not found.')
    contract = contract.replace(anchor, anchor + ''.join(report_children), 1)
contract_path.write_text(contract, encoding='utf-8')

print('School reports presentation extraction applied safely, including contract ownership update.')
