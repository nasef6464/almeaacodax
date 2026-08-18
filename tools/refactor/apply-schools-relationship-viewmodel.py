from pathlib import Path

root = Path('.')
manager_path = root / 'dashboards/admin/SchoolsManager.tsx'
manager = manager_path.read_text(encoding='utf-8')

readiness_import = "import {\n    buildSchoolPortfolioRows,\n    getSchoolOperationalSnapshot as calculateSchoolOperationalSnapshot,\n    getStudentsForSchool,\n    summarizeSchoolPortfolio,\n} from './SchoolsManager/readinessViewModel';\n"
relationship_import = "import { buildSchoolRelationshipViewModel } from './SchoolsManager/relationshipViewModel';\n"
if relationship_import not in manager:
    if readiness_import not in manager:
        raise SystemExit('Could not locate readinessViewModel import anchor.')
    manager = manager.replace(readiness_import, readiness_import + relationship_import, 1)

start_marker = "        const schoolGroupIds = new Set([selectedSchool.id, ...schoolClasses.map((classroom) => classroom.id)]);\n"
end_marker = "        const schoolCourses = publishedCourses.filter((course) => selectedSchool.courseIds.includes(course.id));\n"
start = manager.find(start_marker)
end = manager.find(end_marker, start if start != -1 else 0)
if start != -1:
    if end == -1 or end <= start:
        raise SystemExit('Could not locate selected-school relationship calculation boundary.')
    replacement = """        const {\n            schoolSupervisors,\n            schoolLevelSupervisors,\n            classScopedSupervisors,\n            supervisorScopeRows,\n            schoolParentUsers,\n            studentsWithoutParent,\n            studentsWithoutClass,\n            supervisorsWithoutClass,\n            classOperatingRows,\n        } = buildSchoolRelationshipViewModel({\n            school: selectedSchool,\n            schoolClasses,\n            schoolStudents,\n            supervisors,\n            parents,\n        });\n"""
    manager = manager[:start] + replacement + manager[end:]
elif 'const schoolGroupIds = new Set([selectedSchool.id' in manager or 'const classOperatingRows = schoolClasses.map' in manager:
    raise SystemExit('Relationship block shape changed; refusing partial extraction.')

manager_path.write_text(manager, encoding='utf-8')

ledger_path = root / 'docs/architecture/REFACTOR_V2_EXECUTION_LEDGER_AR.md'
ledger = ledger_path.read_text(encoding='utf-8')
ledger = ledger.replace(
    '**الحالة: بدأ التحضير والفحص.**',
    '**الحالة: تم تطبيق أول دفعة من workspace extraction وتنتظر Quick + Full Gate.**',
    1,
)
ledger_path.write_text(ledger, encoding='utf-8')

print('Selected-school relationship workspace extraction applied safely.')
