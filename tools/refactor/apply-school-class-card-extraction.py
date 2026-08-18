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
    "import { SchoolStudentRosterPanel } from './SchoolsManager/SchoolStudentRosterPanel';\n",
    "import { SchoolStudentRosterPanel } from './SchoolsManager/SchoolStudentRosterPanel';\n"
    "import { SchoolClassOperatingCard } from './SchoolsManager/SchoolClassOperatingCard';\n",
    "class card import insertion",
)

handler_anchor = "        const downloadClassReport = (classroom: Group) => {\n"
handlers = """        const openClassRenameModal = (classroom: Group) => {\n            setEditNameModalState({\n                isOpen: true,\n                title: 'أدخل اسم الفصل الجديد',\n                initialValue: classroom.name,\n                onSave: async (newName: string) => {\n                    if (!newName.trim() || newName.trim() === classroom.name) return;\n                    setSchoolActionPending(`rename-class-${classroom.id}`);\n                    setSaveVerificationState('saving');\n                    setSaveVerificationMessage('جاري حفظ اسم الفصل...');\n                    setManagementError(null);\n                    setManagementNotice(null);\n                    try {\n                        await updateGroupAsync(classroom.id, { name: newName.trim() });\n                        await refreshSchoolWorkspace(selectedSchool.id);\n                        setSaveVerificationState('success');\n                        setSaveVerificationMessage('تم حفظ اسم الفصل والتأكد منه من الخادم.');\n                        setManagementNotice('تم حفظ اسم الفصل بعد التحقق من الخادم.');\n                    } catch (error) {\n                        setSaveVerificationState('error');\n                        setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر تعديل اسم الفصل الآن.');\n                        setManagementError(error instanceof Error ? error.message : 'تعذر تعديل اسم الفصل الآن.');\n                        throw error;\n                    } finally {\n                        setSchoolActionPending(null);\n                    }\n                },\n            });\n        };\n\n        const handleDeleteClass = async (classroom: Group) => {\n            if (!window.confirm('هل أنت متأكد من حذف هذا الفصل؟')) return;\n\n            setSchoolActionPending(`delete-class-${classroom.id}`);\n            setSaveVerificationState('saving');\n            setSaveVerificationMessage('جاري حذف الفصل...');\n            setManagementError(null);\n            setManagementNotice(null);\n            try {\n                await deleteGroupAsync(classroom.id);\n                await refreshSchoolWorkspace(selectedSchool.id);\n                setSaveVerificationState('success');\n                setSaveVerificationMessage('تم حذف الفصل والتأكد منه من الخادم.');\n                setManagementNotice('تم حذف الفصل بعد التحقق من الخادم.');\n            } catch (error) {\n                setSaveVerificationState('error');\n                setSaveVerificationMessage(error instanceof Error ? error.message : 'تعذر حذف الفصل الآن.');\n                setManagementError(error instanceof Error ? error.message : 'تعذر حذف الفصل الآن.');\n            } finally {\n                setSchoolActionPending(null);\n            }\n        };\n\n        const handleRemoveClassSupervisor = (classroom: Group, currentUser: User) => {\n            if (window.confirm(`هل تريد إزالة ${currentUser.name} من إشراف فصل ${classroom.name}؟`)) {\n                void handleRemoveSchoolSupervisor(currentUser.id, classroom.id);\n            }\n        };\n\n"""
manager = replace_once(
    manager,
    handler_anchor,
    handlers + handler_anchor,
    "class orchestration handler insertion",
)

start_marker = "                                        {schoolClasses.map((classroom) => {\n"
end_marker = "                                        })}\n                                    </div>\n                                )}"
start = manager.find(start_marker)
if start < 0:
    raise SystemExit("class card map start marker not found")
end_context = manager.find(end_marker, start)
if end_context < 0:
    raise SystemExit("class card map end marker not found")
end = end_context + len("                                        })}")

replacement = """                                        {schoolClasses.map((classroom) => {\n                                            const classSupervisors = supervisors.filter((currentUser) => classroom.supervisorIds.includes(currentUser.id));\n                                            const classCourses = publishedCourses.filter((course) => classroom.courseIds.includes(course.id));\n                                            const classStudents = schoolStudents.filter((student) => classroom.studentIds.includes(student.id) || (student.groupIds || []).includes(classroom.id));\n                                            const classStudentsWithoutParent = classStudents.filter((student) => !parents.some((parent) => (parent.linkedStudentIds || []).includes(student.id)));\n\n                                            return (\n                                                <SchoolClassOperatingCard\n                                                    key={classroom.id}\n                                                    classroom={classroom}\n                                                    classStudentCount={classStudents.length}\n                                                    studentsWithoutParentCount={classStudentsWithoutParent.length}\n                                                    classSupervisors={classSupervisors}\n                                                    classCourses={classCourses}\n                                                    supervisors={supervisors}\n                                                    publishedCourses={publishedCourses}\n                                                    rosterActionPending={rosterActionPending}\n                                                    isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}\n                                                    onDownloadReport={() => downloadClassReport(classroom)}\n                                                    onPrintReport={() => printClassReport(classroom)}\n                                                    onRename={() => openClassRenameModal(classroom)}\n                                                    onDelete={() => void handleDeleteClass(classroom)}\n                                                    onFocusStudentForm={() => focusClassStudentForm(classroom.name)}\n                                                    onFocusRoster={() => focusClassRoster(classroom.id)}\n                                                    onOpenImport={() => setActiveTab('import')}\n                                                    onOpenPackages={() => setActiveTab('packages')}\n                                                    onAssignSupervisor={(userId) => handleAssignSchoolSupervisor(userId, classroom.id)}\n                                                    onCreateSupervisor={() => focusQuickSupervisorEntry(classroom.id, classroom.name)}\n                                                    onRemoveSupervisor={(currentUser) => handleRemoveClassSupervisor(classroom, currentUser)}\n                                                    onAssignCourse={(courseId) => assignCourseToGroup(courseId, classroom.id)}\n                                                    onRemoveCourse={(courseId) => removeCourseFromGroup(courseId, classroom.id)}\n                                                />\n                                            );\n                                        })}"""
manager = manager[:start] + replacement + manager[end:]
MANAGER.write_text(manager, encoding="utf-8")

school_smoke = SCHOOL_SMOKE.read_text(encoding="utf-8")
school_anchor = '  await read("dashboards/admin/SchoolsManager/SchoolStudentRosterPanel.tsx"),\n'
school_smoke = replace_once(
    school_smoke,
    school_anchor,
    school_anchor + '  await read("dashboards/admin/SchoolsManager/SchoolClassOperatingCard.tsx"),\n',
    "school management class-card ownership",
)
school_smoke = replace_once(
    school_smoke,
    '  assertIncludes(files.schools, "handleAssignSchoolSupervisor(value, classroom.id)");\n',
    '  assertIncludes(files.schools, "onAssignSupervisor={(userId) => handleAssignSchoolSupervisor(userId, classroom.id)}");\n'
    '  assertIncludes(files.schools, "onAssignSupervisor(value).finally");\n',
    "school management class supervisor wiring",
)
SCHOOL_SMOKE.write_text(school_smoke, encoding="utf-8")

relationship_smoke = RELATIONSHIP_SMOKE.read_text(encoding="utf-8")
relationship_anchor = '    read("dashboards/admin/SchoolsManager/SchoolStudentRosterPanel.tsx"),\n'
relationship_smoke = replace_once(
    relationship_smoke,
    relationship_anchor,
    relationship_anchor + '    read("dashboards/admin/SchoolsManager/SchoolClassOperatingCard.tsx"),\n',
    "relationship audit class-card ownership",
)
relationship_smoke = replace_once(
    relationship_smoke,
    '  assertIncludes(sources.schoolsManager, "handleAssignSchoolSupervisor(value, classroom.id)");\n',
    '  assertIncludes(sources.schoolsManager, "onAssignSupervisor={(userId) => handleAssignSchoolSupervisor(userId, classroom.id)}");\n'
    '  assertIncludes(sources.schoolsManager, "onAssignSupervisor(value).finally");\n',
    "relationship audit class supervisor wiring",
)
RELATIONSHIP_SMOKE.write_text(relationship_smoke, encoding="utf-8")

admin_relationship_smoke = ADMIN_RELATIONSHIP_SMOKE.read_text(encoding="utf-8")
admin_relationship_smoke = replace_once(
    admin_relationship_smoke,
    '  "handleAssignSchoolSupervisor(value, classroom.id)",\n',
    '  "onAssignSupervisor={(userId) => handleAssignSchoolSupervisor(userId, classroom.id)}",\n',
    "batch136 class supervisor wiring",
)
ADMIN_RELATIONSHIP_SMOKE.write_text(admin_relationship_smoke, encoding="utf-8")

print("School class operating-card presentation extraction applied safely.")
