from pathlib import Path

root = Path('.')
panel_path = root / 'dashboards/admin/SchoolsManager/SchoolPackagesPanel.tsx'
panel = panel_path.read_text(encoding='utf-8')

# Trash2 is still owned by the parent panel for access-code deletion, so the
# package-card extraction must not remove it from the parent icon import.
if "import { ShieldCheck, Download, Plus, Trash2, Key } from 'lucide-react';" not in panel:
    raise SystemExit('Expected SchoolPackagesPanel icon import with Trash2 was not found; refusing unsafe edit.')

panel = panel.replace(
    "import { AccessCode, B2BPackage, CategoryPath, CategorySubject, Course, Group, PackageContentType, User } from '../../../types';\n",
    "import { AccessCode, B2BPackage, CategoryPath, CategorySubject, Course, Group, User } from '../../../types';\n",
    1,
)
panel = panel.replace("import { PACKAGE_CONTENT_OPTIONS } from './contracts';\n", '', 1)
view_model_import = "import { buildSchoolPackageAccessViewModel } from './packageAccessViewModel';\n"
card_import = "import { SchoolPackageCard } from './SchoolPackageCard';\n"
if card_import not in panel:
    if view_model_import not in panel:
        raise SystemExit('Could not locate package access view-model import anchor.')
    panel = panel.replace(view_model_import, view_model_import + card_import, 1)

start_marker = "                    {schoolPackages.map((pkg) => {\n"
end_marker = "                    })}\n                </div>\n            </div>\n\n            <div>\n                <div className=\"flex justify-between items-center mb-4\">\n"
start = panel.find(start_marker)
end = panel.find(end_marker, start if start != -1 else 0)
if start == -1:
    if '<SchoolPackageCard' not in panel:
        raise SystemExit('Could not locate package-card map or existing extracted component.')
else:
    if end == -1 or end <= start:
        raise SystemExit('Could not locate exact package-card extraction boundary.')
    replacement = """                    {schoolPackages.map((pkg) => (\n                        <SchoolPackageCard\n                            key={pkg.id}\n                            pkg={pkg}\n                            presentation={packageAccessRowsById.get(pkg.id)}\n                            selectedSchool={selectedSchool}\n                            publishedCourses={publishedCourses}\n                            paths={paths}\n                            subjects={subjects}\n                            teachers={teachers}\n                            handleUpdateSchoolPackage={handleUpdateSchoolPackage}\n                            handleDeleteSchoolPackage={handleDeleteSchoolPackage}\n                            assignCourseToGroup={assignCourseToGroup}\n                        />\n                    ))}\n                </div>\n            </div>\n\n            <div>\n                <div className=\"flex justify-between items-center mb-4\">\n"""
    panel = panel[:start] + replacement + panel[end + len(end_marker):]

panel_path.write_text(panel, encoding='utf-8')

checkpoint_path = root / 'docs/architecture/REFACTOR_V2_LATEST_CHECKPOINT_AR.md'
checkpoint = checkpoint_path.read_text(encoding='utf-8')
if 'Package Card presentation boundary — قيد التحقق' not in checkpoint:
    checkpoint += '''\n## Package Card presentation boundary — قيد التحقق\n\n- تم نقل JSX وإدارة حقول بطاقة الباقة الواحدة من `SchoolPackagesPanel.tsx` إلى `SchoolPackageCard.tsx`.\n- الـchild يستقبل handlers والبيانات كـprops ولا يستورد manager/store/api، للحفاظ على فصل presentation عن orchestration.\n- الهدف تخفيض حجم parent panel إلى orchestration واضح مع بقاء update/delete/course assignment semantics كما هي.\n- أثناء أول Quick Gate ظهر خطأ TypeScript لأن `Trash2` ما زال مستخدمًا في parent panel لحذف أكواد التفعيل؛ تم إصلاح patcher للحفاظ على import بدل إزالة أيقونة لازالت مطلوبة.\n- الدفعة لا تغلق إلا بعد boundary contract + Quick Gate + Full Review + Standard Safety Gate.\n'''
checkpoint_path.write_text(checkpoint, encoding='utf-8')

print('SchoolPackageCard presentation boundary applied safely while preserving access-code delete behavior.')
