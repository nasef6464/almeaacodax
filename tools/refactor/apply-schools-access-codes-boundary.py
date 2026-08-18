from pathlib import Path

root = Path('.')
panel_path = root / 'dashboards/admin/SchoolsManager/SchoolPackagesPanel.tsx'
panel = panel_path.read_text(encoding='utf-8')

panel = panel.replace(
    "import { ShieldCheck, Download, Plus, Trash2, Key } from 'lucide-react';\n",
    "import { ShieldCheck, Download, Plus } from 'lucide-react';\n",
    1,
)
card_import = "import { SchoolPackageCard } from './SchoolPackageCard';\n"
access_import = "import { SchoolAccessCodesPanel } from './SchoolAccessCodesPanel';\n"
if access_import not in panel:
    if card_import not in panel:
        raise SystemExit('Could not locate SchoolPackageCard import anchor.')
    panel = panel.replace(card_import, card_import + access_import, 1)

start_marker = '''            <div>\n                <div className="flex justify-between items-center mb-4">\n                    <h3 className="text-lg font-bold text-gray-900">أكواد التفعيل</h3>\n'''
end_marker = '''            </div>\n        </div>\n    );\n};'''
start = panel.find(start_marker)
end = panel.rfind(end_marker)
if start == -1:
    if '<SchoolAccessCodesPanel' not in panel:
        raise SystemExit('Could not locate access-code UI block or an existing extraction.')
else:
    if end == -1 or end <= start:
        raise SystemExit('Could not locate access-code block end safely.')
    replacement = '''            <SchoolAccessCodesPanel\n                schoolPackages={schoolPackages}\n                activeSchoolPackages={activeSchoolPackages}\n                schoolCodes={schoolCodes}\n                activeSchoolCodes={activeSchoolCodes}\n                usedSeats={usedSeats}\n                selectedPackageIdForCode={selectedPackageIdForCode}\n                setSelectedPackageIdForCode={setSelectedPackageIdForCode}\n                handleCreateSchoolAccessCode={handleCreateSchoolAccessCode}\n                accessCodeActionPending={accessCodeActionPending}\n                newCodeMaxUses={newCodeMaxUses}\n                setNewCodeMaxUses={setNewCodeMaxUses}\n                newCodeDurationDays={newCodeDurationDays}\n                setNewCodeDurationDays={setNewCodeDurationDays}\n                tableSchoolCodes={tableSchoolCodes}\n                handleCopyCode={handleCopyCode}\n                copiedCodeId={copiedCodeId}\n                handleDeleteSchoolAccessCode={handleDeleteSchoolAccessCode}\n                isLoadingPagedAccessCodes={isLoadingPagedAccessCodes}\n                pagedAccessCodesError={pagedAccessCodesError}\n                pagedAccessCodesPagination={pagedAccessCodesPagination}\n            />\n'''
    panel = panel[:start] + replacement + panel[end + len('            </div>\n'):]

panel_path.write_text(panel, encoding='utf-8')

checkpoint_path = root / 'docs/architecture/REFACTOR_V2_LATEST_CHECKPOINT_AR.md'
checkpoint = checkpoint_path.read_text(encoding='utf-8')
if 'Access Codes presentation boundary — قيد التحقق' not in checkpoint:
    checkpoint += '''\n## Access Codes presentation boundary — قيد التحقق\n\n- تم نقل نموذج إنشاء أكواد المدرسة، قائمة الأكواد، copy/delete، وحالات loading/error/pagination إلى `SchoolAccessCodesPanel.tsx`.\n- تم فصل row projection إلى `accessCodeViewModel.ts` مع Map للباقة بدل `schoolPackages.find` لكل كود.\n- الـchild يستقبل state/handlers كـprops ولا يستورد manager/store/api.\n- direct scale contract يغطي 50,000 كود و10,000 باقة، إضافةً إلى package fallback وusage percentage semantics.\n- الدفعة لا تغلق إلا بعد Direct Contract + Quick Gate + Full Review + Standard Safety Gate.\n'''
checkpoint_path.write_text(checkpoint, encoding='utf-8')

print('School access-code presentation boundary applied safely.')
