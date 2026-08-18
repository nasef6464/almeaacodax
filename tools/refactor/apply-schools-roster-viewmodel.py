from pathlib import Path

root = Path('.')
manager_path = root / 'dashboards/admin/SchoolsManager.tsx'
manager = manager_path.read_text(encoding='utf-8')

workspace_import = "import { buildSchoolWorkspaceViewModel } from './SchoolsManager/workspaceViewModel';\n"
roster_import = "import { buildSchoolRosterViewModel } from './SchoolsManager/rosterViewModel';\n"
if roster_import not in manager:
    if workspace_import not in manager:
        raise SystemExit('Could not locate workspace view-model import anchor.')
    manager = manager.replace(workspace_import, workspace_import + roster_import, 1)

start_marker = "        const visibleSchoolStudents = schoolStudents.filter((student) => {\n"
end_marker = "        const focusClassStudentForm = (classroomName: string) => {\n"
start = manager.find(start_marker)
end = manager.find(end_marker, start if start != -1 else 0)
if start == -1:
    if 'buildSchoolRosterViewModel({' not in manager:
        raise SystemExit('Could not locate roster filter block or an existing extraction.')
else:
    if end == -1 or end <= start:
        raise SystemExit('Could not locate roster extraction boundary.')
    replacement = """        const {\n            visibleSchoolStudents,\n            schoolStudentTotalPages,\n            safeSchoolStudentPage,\n            schoolStudentStartIndex,\n            schoolStudentEndIndex,\n            pagedVisibleSchoolStudents,\n        } = buildSchoolRosterViewModel({\n            schoolStudents,\n            schoolClasses,\n            search: studentSearch,\n            classFilter: selectedClassFilter,\n            page: schoolStudentPage,\n            pageSize: schoolStudentPageSize,\n        });\n"""
    manager = manager[:start] + replacement + manager[end:]

manager_path.write_text(manager, encoding='utf-8')

checkpoint_path = root / 'docs/architecture/REFACTOR_V2_LATEST_CHECKPOINT_AR.md'
if checkpoint_path.exists():
    checkpoint = checkpoint_path.read_text(encoding='utf-8')
    if 'Roster/filter/pagination extraction — قيد التحقق' not in checkpoint:
        checkpoint += '''\n## Roster/filter/pagination extraction — قيد التحقق\n\n- تم نقل بحث/فلترة/pagination طلاب المدرسة إلى `SchoolsManager/rosterViewModel.ts`.\n- unassigned filtering يستخدم Set لمعرفات الفصول بدل `schoolClasses.some` داخل كل طالب، مع الحفاظ على نفس النتيجة.\n- لا تعتبر الدفعة مغلقة إلا بعد direct contract + Quick Gate + Full Review + Standard Safety Gate.\n'''
    checkpoint_path.write_text(checkpoint, encoding='utf-8')

print('Schools roster filter/pagination extraction applied safely.')
