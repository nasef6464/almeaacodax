from pathlib import Path

root = Path('.')
panel_path = root / 'dashboards/admin/SchoolsManager/SchoolPackagesPanel.tsx'
panel = panel_path.read_text(encoding='utf-8')

contracts_import = "import { PACKAGE_CONTENT_OPTIONS } from './contracts';\n"
view_model_import = "import { buildSchoolPackageAccessViewModel } from './packageAccessViewModel';\n"
if view_model_import not in panel:
    if contracts_import not in panel:
        raise SystemExit('Could not locate SchoolPackagesPanel import anchor.')
    panel = panel.replace(contracts_import, contracts_import + view_model_import, 1)

component_anchor = "}) => {\n    return (\n"
model_block = """}) => {\n    const packageAccessSummary = buildSchoolPackageAccessViewModel({\n        schoolPackages,\n        activeSchoolPackages,\n        schoolCodes,\n        activeSchoolCodes,\n        totalSeats,\n        usedSeats,\n        publishedCourses,\n        paths,\n        subjects,\n        teachers,\n    });\n    const { packageAccessRowsById } = packageAccessSummary;\n\n    return (\n"""
if 'buildSchoolPackageAccessViewModel({' not in panel:
    if component_anchor not in panel:
        raise SystemExit('Could not locate SchoolPackagesPanel component body anchor.')
    panel = panel.replace(component_anchor, model_block, 1)

old_next_action = """                            {activeSchoolPackages.length === 0\n                                ? 'فعّل باقة مدرسية مرتبطة بالمسارات حتى يحصل الطلاب على الوصول بدون شراء فردي.'\n                                : activeSchoolCodes.length === 0\n                                    ? 'ولّد كود دخول صالحًا للطلاب أو أرسل رابط التسجيل حسب طريقة التسليم.'\n                                    : totalSeats > 0 && usedSeats >= totalSeats\n                                        ? 'المقاعد المتاحة مستهلكة بالكامل. زِد سعة الباقة قبل إضافة طلاب جدد.'\n                                        : 'الباقة والمسارات والأكواد جاهزة. يمكنك إرسال ملف التسليم للمدرسة أو متابعة الاستهلاك.'}\n"""
new_next_action = "                            {packageAccessSummary.accessNextAction}\n"
if old_next_action in panel:
    panel = panel.replace(old_next_action, new_next_action, 1)
elif new_next_action not in panel:
    raise SystemExit('Could not locate package access next-action block.')

old_metrics = """                            ['الباقات النشطة', activeSchoolPackages.length, activeSchoolPackages.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'],\n                            ['الأكواد الصالحة', activeSchoolCodes.length, activeSchoolCodes.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'],\n                            ['المقاعد', totalSeats > 0 ? `${usedSeats}/${totalSeats}` : '0/0', totalSeats > 0 && usedSeats < totalSeats ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'],\n"""
new_metrics = """                            ['الباقات النشطة', packageAccessSummary.activePackageCount, packageAccessSummary.activePackageCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'],\n                            ['الأكواد الصالحة', packageAccessSummary.activeCodeCount, packageAccessSummary.activeCodeCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'],\n                            ['المقاعد', packageAccessSummary.seatsLabel, packageAccessSummary.hasSeatCapacity && !packageAccessSummary.seatCapacityExhausted ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'],\n"""
if old_metrics in panel:
    panel = panel.replace(old_metrics, new_metrics, 1)
elif new_metrics not in panel:
    raise SystemExit('Could not locate package access metric block.')

simple_replacements = {
    "{activeSchoolPackages.length > 0 && activeSchoolCodes.length > 0 ? 'الوصول جاهز للتسليم' : 'الوصول يحتاج استكمال'}": "{packageAccessSummary.accessStatusLabel}",
    "{schoolPackages.filter((pkg) => pkg.status !== 'active').length}": "{packageAccessSummary.inactivePackageCount}",
    "{schoolCodes.length}": "{packageAccessSummary.totalCodeCount}",
    "{totalSeats > 0 ? `${Math.min(100, Math.round((usedSeats / totalSeats) * 100))}%` : '0%'}": "{`${packageAccessSummary.seatUsagePercent}%`}",
}
for old, new in simple_replacements.items():
    if old in panel:
        panel = panel.replace(old, new, 1)
    elif new not in panel:
        raise SystemExit(f'Could not locate expected package summary expression: {old}')

old_lookup = """                        const packageCourses = publishedCourses.filter((course) => pkg.courseIds.includes(course.id));\n                        const packagePaths = paths.filter((path) => (pkg.pathIds || []).includes(path.id));\n                        const packageSubjects = subjects.filter((currentSubject) => (pkg.subjectIds || []).includes(currentSubject.id));\n                        const packageTeacher = teachers.find((teacher) => teacher.id === pkg.assignedTeacherId);\n"""
new_lookup = """                        const packagePresentation = packageAccessRowsById.get(pkg.id);\n                        const packageCourses = packagePresentation?.courses || [];\n                        const packagePaths = packagePresentation?.paths || [];\n                        const packageSubjects = packagePresentation?.subjects || [];\n                        const packageTeacher = packagePresentation?.teacher;\n"""
if old_lookup in panel:
    panel = panel.replace(old_lookup, new_lookup, 1)
elif new_lookup not in panel:
    raise SystemExit('Could not locate per-package collection scans.')

panel_path.write_text(panel, encoding='utf-8')

checkpoint_path = root / 'docs/architecture/REFACTOR_V2_LATEST_CHECKPOINT_AR.md'
checkpoint = checkpoint_path.read_text(encoding='utf-8')
if 'Package/access view-model extraction — قيد التحقق' not in checkpoint:
    checkpoint += '''\n## Package/access view-model extraction — قيد التحقق\n\n- تم نقل access decision/seat summary وتهيئة package reference lookups إلى `SchoolsManager/packageAccessViewModel.ts`.\n- lookup لكل package أصبح يعتمد Maps مسبقة بدل filter/find على كل collections لكل بطاقة.\n- الدفعة لا تُغلق إلا بعد direct performance contract + Quick Gate + Full Review + Standard Safety Gate.\n'''
checkpoint_path.write_text(checkpoint, encoding='utf-8')

print('SchoolPackagesPanel package/access view-model extraction applied safely.')
