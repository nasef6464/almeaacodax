from pathlib import Path

root = Path('.')
manager_path = root / 'dashboards/admin/SchoolsManager.tsx'
manager = manager_path.read_text(encoding='utf-8')

roster_import = "import { SchoolStudentRosterPanel } from './SchoolsManager/SchoolStudentRosterPanel';\n"
if roster_import not in manager:
    import_anchor = "import { SchoolReportsPanel } from './SchoolsManager/SchoolReportsPanel';\n"
    if import_anchor not in manager:
        raise SystemExit('SchoolReportsPanel import anchor not found; refusing unsafe roster patch.')
    manager = manager.replace(import_anchor, import_anchor + roster_import, 1)

start_marker = '                            <div data-testid="school-roster-panel" className="min-w-0 max-w-full border border-gray-100 rounded-2xl p-5 space-y-4">\n'
end_marker = "\n                        </div>\n                    )}\n\n                    {activeTab === 'packages' && ("
start = manager.find(start_marker)
if start == -1:
    if '<SchoolStudentRosterPanel' not in manager:
        raise SystemExit('Student roster block not found and extraction is not already applied.')
else:
    end = manager.find(end_marker, start)
    if end == -1:
        raise SystemExit('Student roster extraction boundary not found; refusing partial edit.')

    replacement = '''                            <SchoolStudentRosterPanel\n                                studentSearch={studentSearch}\n                                setStudentSearch={setStudentSearch}\n                                selectedClassFilter={selectedClassFilter}\n                                setSelectedClassFilter={setSelectedClassFilter}\n                                schoolClasses={schoolClasses}\n                                visibleSchoolStudents={visibleSchoolStudents}\n                                pagedVisibleSchoolStudents={pagedVisibleSchoolStudents}\n                                schoolStudentTotalPages={schoolStudentTotalPages}\n                                safeSchoolStudentPage={safeSchoolStudentPage}\n                                schoolStudentStartIndex={schoolStudentStartIndex}\n                                schoolStudentEndIndex={schoolStudentEndIndex}\n                                setSchoolStudentPage={setSchoolStudentPage}\n                                rosterActionPending={rosterActionPending}\n                                selectedSchoolName={selectedSchool.name}\n                                selectedSchoolId={selectedSchool.id}\n                                handleAssignStudentToClass={handleAssignStudentToClass}\n                                handleRemoveStudentScope={handleRemoveStudentScope}\n                            />'''
    manager = manager[:start] + replacement + manager[end:]

manager_path.write_text(manager, encoding='utf-8')

contract_path = root / 'scripts/smoke-school-management-contract.mjs'
contract = contract_path.read_text(encoding='utf-8')
roster_child = '  await read("dashboards/admin/SchoolsManager/SchoolStudentRosterPanel.tsx"),\n'
anchor = '  await read("dashboards/admin/SchoolsManager/SchoolPerformanceReportPanel.tsx"),\n'
if roster_child not in contract:
    if anchor not in contract:
        raise SystemExit('School management contract report aggregation anchor not found.')
    contract = contract.replace(anchor, anchor + roster_child, 1)

old_school_remove_contract = '  assertIncludes(files.schools, "handleRemoveStudentScope(student.id, selectedSchool.id)");\n'
new_school_remove_contract = '  assertIncludes(files.schools, "handleRemoveStudentScope(student.id, selectedSchoolId)");\n'
if old_school_remove_contract in contract:
    contract = contract.replace(old_school_remove_contract, new_school_remove_contract, 1)
elif new_school_remove_contract not in contract:
    raise SystemExit('School roster removal contract anchor not found; refusing unsafe contract migration.')

contract_path.write_text(contract, encoding='utf-8')

print('School student roster presentation extraction applied safely.')
