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
    "import { SchoolClassesPanel } from './SchoolsManager/SchoolClassesPanel';\n",
    "import { SchoolClassesPanel } from './SchoolsManager/SchoolClassesPanel';\n"
    "import { SchoolSingleStudentPanel } from './SchoolsManager/SchoolSingleStudentPanel';\n"
    "import { SchoolWideSupervisorsPanel } from './SchoolsManager/SchoolWideSupervisorsPanel';\n",
    "overview operator imports",
)

manager = replace_once(
    manager,
    "    UserPlus,\n",
    "",
    "manager UserPlus import cleanup",
)

supervisor_handler_anchor = "        const focusQuickSupervisorEntry = (targetGroupId: string, targetGroupName: string) => {\n"
supervisor_handler = """        const handleRemoveSchoolWideSupervisor = (currentUser: User) => {\n            if (!window.confirm(`هل تريد إزالة ${currentUser.name} من إشراف ${selectedSchool.name}؟`)) {\n                return;\n            }\n            void handleRemoveSchoolSupervisor(currentUser.id, selectedSchool.id);\n        };\n\n"""
manager = replace_once(
    manager,
    supervisor_handler_anchor,
    supervisor_handler + supervisor_handler_anchor,
    "school-wide supervisor confirmation orchestration",
)

student_start_marker = '                            <div data-testid="school-students-panel" className="min-w-0 max-w-full rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">\n'
student_end_marker = '\n\n                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">\n'
student_start = manager.find(student_start_marker)
if student_start < 0:
    raise SystemExit("single-student panel start marker not found")
student_end = manager.find(student_end_marker, student_start)
if student_end < 0:
    raise SystemExit("single-student panel end marker not found")

student_replacement = """                            <SchoolSingleStudentPanel\n                                isOpen={isSingleStudentOpen}\n                                schoolClasses={schoolClasses}\n                                student={singleStudent}\n                                isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}\n                                isImporting={isImporting}\n                                onToggle={() => setIsSingleStudentOpen((current) => !current)}\n                                onChangeField={(field, value) => setSingleStudent((current) => ({ ...current, [field]: value }))}\n                                onCreateFirstClass={() => handleCreateSingleClass('تم إنشاء فصل جديد. اختره من حقل فصل الطالب ثم أضف الطالب.')}\n                                onSubmit={() => void handleAddSingleStudent()}\n                            />"""
manager = manager[:student_start] + student_replacement + manager[student_end:]

supervisor_start_marker = '                                <div data-testid="school-wide-supervisors-panel" className="border border-gray-100 rounded-xl p-5 space-y-4">\n'
supervisor_end_marker = '\n\n                                <SchoolCoursesPanel\n'
supervisor_start = manager.find(supervisor_start_marker)
if supervisor_start < 0:
    raise SystemExit("school-wide supervisor panel start marker not found")
supervisor_end = manager.find(supervisor_end_marker, supervisor_start)
if supervisor_end < 0:
    raise SystemExit("school-wide supervisor panel end marker not found")

supervisor_replacement = """                                <SchoolWideSupervisorsPanel\n                                    schoolLevelSupervisors={schoolLevelSupervisors}\n                                    classScopedSupervisors={classScopedSupervisors}\n                                    supervisorScopeRows={supervisorScopeRows}\n                                    supervisors={supervisors}\n                                    rosterActionPending={rosterActionPending}\n                                    onOpenSupervisorEntry={() => focusQuickSupervisorEntry(selectedSchool.id, selectedSchool.name)}\n                                    onAssignSupervisor={(value) => handleAssignSchoolSupervisor(value, selectedSchool.id)}\n                                    onRemoveSupervisor={handleRemoveSchoolWideSupervisor}\n                                />"""
manager = manager[:supervisor_start] + supervisor_replacement + manager[supervisor_end:]
MANAGER.write_text(manager, encoding="utf-8")

school_smoke = SCHOOL_SMOKE.read_text(encoding="utf-8")
school_anchor = '  await read("dashboards/admin/SchoolsManager/SchoolClassesPanel.tsx"),\n'
school_smoke = replace_once(
    school_smoke,
    school_anchor,
    school_anchor
    + '  await read("dashboards/admin/SchoolsManager/SchoolSingleStudentPanel.tsx"),\n'
    + '  await read("dashboards/admin/SchoolsManager/SchoolWideSupervisorsPanel.tsx"),\n',
    "school management overview operator ownership",
)
SCHOOL_SMOKE.write_text(school_smoke, encoding="utf-8")

relationship_smoke = RELATIONSHIP_SMOKE.read_text(encoding="utf-8")
relationship_anchor = '    read("dashboards/admin/SchoolsManager/SchoolClassesPanel.tsx"),\n'
relationship_smoke = replace_once(
    relationship_smoke,
    relationship_anchor,
    relationship_anchor
    + '    read("dashboards/admin/SchoolsManager/SchoolSingleStudentPanel.tsx"),\n'
    + '    read("dashboards/admin/SchoolsManager/SchoolWideSupervisorsPanel.tsx"),\n',
    "relationship audit overview operator ownership",
)
RELATIONSHIP_SMOKE.write_text(relationship_smoke, encoding="utf-8")

print("School overview single-student and school-wide supervisor presentation extraction applied safely.")
