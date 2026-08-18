from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANAGER = ROOT / "dashboards/admin/SchoolsManager.tsx"
SCHOOL_SMOKE = ROOT / "scripts/smoke-school-management-contract.mjs"
RELATIONSHIP_SMOKE = ROOT / "scripts/smoke-batch100f-relationship-audit-contract.mjs"
ADMIN_RELATIONSHIP_SMOKE = ROOT / "scripts/smoke-batch136-admin-users-schools-parent-payment-contract.mjs"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return source.replace(old, new, 1)


manager = MANAGER.read_text(encoding="utf-8")

manager = replace_once(
    manager,
    "import { SchoolClassOperatingCard } from './SchoolsManager/SchoolClassOperatingCard';\n",
    "import { SchoolClassOperatingCard } from './SchoolsManager/SchoolClassOperatingCard';\n"
    "import { SchoolCoursesPanel } from './SchoolsManager/SchoolCoursesPanel';\n"
    "import { SchoolClassesPanel } from './SchoolsManager/SchoolClassesPanel';\n",
    "workspace section imports",
)

course_handlers = """        const handleAssignCourseToSchool = (courseId: string) => {\n            assignCourseToGroup(courseId, selectedSchool.id);\n            setSelectedSchool((current) =>\n                current\n                    ? {\n                          ...current,\n                          courseIds: current.courseIds.includes(courseId)\n                              ? current.courseIds\n                              : [...current.courseIds, courseId],\n                      }\n                    : current,\n            );\n        };\n\n        const handleRemoveCourseFromSchool = (courseId: string) => {\n            removeCourseFromGroup(courseId, selectedSchool.id);\n            setSelectedSchool((current) =>\n                current\n                    ? {\n                          ...current,\n                          courseIds: current.courseIds.filter((id) => id !== courseId),\n                      }\n                    : current,\n            );\n        };\n\n"""
manager = replace_once(
    manager,
    "        const openClassRenameModal = (classroom: Group) => {\n",
    course_handlers + "        const openClassRenameModal = (classroom: Group) => {\n",
    "school course orchestration handlers",
)

course_heading = '<h3 className="text-lg font-bold text-gray-900">دورات المدرسة</h3>'
course_heading_index = manager.find(course_heading)
if course_heading_index < 0:
    raise SystemExit("school courses heading not found")
course_start = manager.rfind('                                <div className="border border-gray-100 rounded-xl p-5 space-y-4">', 0, course_heading_index)
if course_start < 0:
    raise SystemExit("school courses panel start not found")
course_end_marker = '                                </div>\n                            </div>\n\n                            <div>\n                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">'
course_end_context = manager.find(course_end_marker, course_heading_index)
if course_end_context < 0:
    raise SystemExit("school courses panel end not found")
course_end = course_end_context + len('                                </div>')
course_replacement = """                                <SchoolCoursesPanel\n                                    schoolCourses={schoolCourses}\n                                    publishedCourses={publishedCourses}\n                                    selectedCourseIds={selectedSchool.courseIds}\n                                    onAssignCourse={handleAssignCourseToSchool}\n                                    onRemoveCourse={handleRemoveCourseFromSchool}\n                                />"""
manager = manager[:course_start] + course_replacement + manager[course_end:]

classes_heading = '<h3 className="text-lg font-bold text-gray-900">الفصول الدراسية</h3>'
classes_heading_index = manager.find(classes_heading)
if classes_heading_index < 0:
    raise SystemExit("school classes heading not found")
classes_start = manager.rfind('                            <div>\n', 0, classes_heading_index)
if classes_start < 0:
    raise SystemExit("school classes panel start not found")
classes_end_marker = '\n\n                            <SchoolStudentRosterPanel'
classes_end = manager.find(classes_end_marker, classes_heading_index)
if classes_end < 0:
    raise SystemExit("school classes panel end not found")
classes_replacement = """                            <SchoolClassesPanel\n                                schoolClasses={schoolClasses}\n                                schoolStudents={schoolStudents}\n                                parents={parents}\n                                supervisors={supervisors}\n                                publishedCourses={publishedCourses}\n                                bulkClassNames={bulkClassNames}\n                                setBulkClassNames={setBulkClassNames}\n                                schoolActionPending={schoolActionPending}\n                                isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}\n                                rosterActionPending={rosterActionPending}\n                                onDownloadSchoolRoster={() => downloadSchoolRoster(selectedSchool, schoolStudents, schoolClasses)}\n                                onCreateSingleClass={() => void handleCreateSingleClass()}\n                                onCreateBulkClasses={handleCreateBulkClasses}\n                                onDownloadClassReport={downloadClassReport}\n                                onPrintClassReport={printClassReport}\n                                onRenameClass={openClassRenameModal}\n                                onDeleteClass={(classroom) => void handleDeleteClass(classroom)}\n                                onFocusClassStudentForm={(classroom) => focusClassStudentForm(classroom.name)}\n                                onFocusClassRoster={(classroom) => focusClassRoster(classroom.id)}\n                                onOpenImport={() => setActiveTab('import')}\n                                onOpenPackages={() => setActiveTab('packages')}\n                                onAssignSupervisor={handleAssignSchoolSupervisor}\n                                onCreateSupervisor={(classroom) => focusQuickSupervisorEntry(classroom.id, classroom.name)}\n                                onRemoveSupervisor={handleRemoveClassSupervisor}\n                                onAssignCourse={assignCourseToGroup}\n                                onRemoveCourse={removeCourseFromGroup}\n                            />"""
manager = manager[:classes_start] + classes_replacement + manager[classes_end:]
MANAGER.write_text(manager, encoding="utf-8")

school_smoke = SCHOOL_SMOKE.read_text(encoding="utf-8")
school_anchor = '  await read("dashboards/admin/SchoolsManager/SchoolClassOperatingCard.tsx"),\n'
school_smoke = replace_once(
    school_smoke,
    school_anchor,
    school_anchor
    + '  await read("dashboards/admin/SchoolsManager/SchoolCoursesPanel.tsx"),\n'
    + '  await read("dashboards/admin/SchoolsManager/SchoolClassesPanel.tsx"),\n',
    "school management workspace section ownership",
)
school_smoke = replace_once(
    school_smoke,
    '  assertIncludes(files.schools, "onAssignSupervisor={(userId) => handleAssignSchoolSupervisor(userId, classroom.id)}");\n'
    '  assertIncludes(files.schools, "onAssignSupervisor(value).finally");\n',
    '  assertIncludes(files.schools, "onAssignSupervisor={handleAssignSchoolSupervisor}");\n'
    '  assertIncludes(files.schools, "onAssignSupervisor={(userId) => onAssignSupervisor(userId, classroom.id)}");\n'
    '  assertIncludes(files.schools, "onAssignSupervisor(value).finally");\n',
    "school management classes-panel supervisor ownership",
)
SCHOOL_SMOKE.write_text(school_smoke, encoding="utf-8")

relationship_smoke = RELATIONSHIP_SMOKE.read_text(encoding="utf-8")
relationship_anchor = '    read("dashboards/admin/SchoolsManager/SchoolClassOperatingCard.tsx"),\n'
relationship_smoke = replace_once(
    relationship_smoke,
    relationship_anchor,
    relationship_anchor
    + '    read("dashboards/admin/SchoolsManager/SchoolCoursesPanel.tsx"),\n'
    + '    read("dashboards/admin/SchoolsManager/SchoolClassesPanel.tsx"),\n',
    "relationship audit workspace section ownership",
)
relationship_smoke = replace_once(
    relationship_smoke,
    '  assertIncludes(sources.schoolsManager, "onAssignSupervisor={(userId) => handleAssignSchoolSupervisor(userId, classroom.id)}");\n'
    '  assertIncludes(sources.schoolsManager, "onAssignSupervisor(value).finally");\n',
    '  assertIncludes(sources.schoolsManager, "onAssignSupervisor={handleAssignSchoolSupervisor}");\n'
    '  assertIncludes(sources.schoolsManager, "onAssignSupervisor={(userId) => onAssignSupervisor(userId, classroom.id)}");\n'
    '  assertIncludes(sources.schoolsManager, "onAssignSupervisor(value).finally");\n',
    "relationship audit classes-panel supervisor ownership",
)
RELATIONSHIP_SMOKE.write_text(relationship_smoke, encoding="utf-8")

admin_relationship_smoke = ADMIN_RELATIONSHIP_SMOKE.read_text(encoding="utf-8")
admin_relationship_smoke = replace_once(
    admin_relationship_smoke,
    '  "onAssignSupervisor={(userId) => handleAssignSchoolSupervisor(userId, classroom.id)}",\n',
    '  "onAssignSupervisor={handleAssignSchoolSupervisor}",\n',
    "batch136 classes-panel supervisor ownership",
)
ADMIN_RELATIONSHIP_SMOKE.write_text(admin_relationship_smoke, encoding="utf-8")

print("School workspace courses/classes presentation extraction applied safely.")
