from pathlib import Path

root = Path('.')
panel_path = root / 'dashboards/admin/SchoolsManager/SchoolRelationsPanel.tsx'
panel = panel_path.read_text(encoding='utf-8')

panel = panel.replace(
    "import { ShieldCheck, UserPlus, Download, Upload } from 'lucide-react';\n",
    "import { ShieldCheck, UserPlus, Download } from 'lucide-react';\n",
    1,
)
contracts_import = "import { RelationImportRow, RelationImportSummary, RelationCredential } from './contracts';\n"
child_import = "import { SchoolRelationsImportPanel } from './SchoolRelationsImportPanel';\n"
if child_import not in panel:
    if contracts_import not in panel:
        raise SystemExit('Could not locate relation contracts import anchor.')
    panel = panel.replace(contracts_import, contracts_import + child_import, 1)

start_marker = '''            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">\n                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">\n                    <div className="mb-5 flex items-start justify-between gap-4">\n                        <div>\n                            <h3 className="text-lg font-black text-gray-900">ربط جماعي للحسابات الموجودة</h3>\n'''
end_marker = '''            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">\n                <div className="mb-5 flex items-start justify-between gap-4">\n                    <div>\n                        <h3 className="text-lg font-black text-gray-900">تقرير المتابعة المدرسية</h3>\n'''
start = panel.find(start_marker)
end = panel.find(end_marker, start if start != -1 else 0)
if start == -1:
    if '<SchoolRelationsImportPanel' not in panel:
        raise SystemExit('Could not locate relation import section or existing extraction.')
else:
    if end == -1 or end <= start:
        raise SystemExit('Could not locate relation import extraction end safely.')
    replacement = '''            <SchoolRelationsImportPanel\n                downloadRelationsTemplate={downloadRelationsTemplate}\n                relationRows={relationRows}\n                handleRelationFile={handleRelationFile}\n                relationError={relationError}\n                createMissingRelationUsers={createMissingRelationUsers}\n                setCreateMissingRelationUsers={setCreateMissingRelationUsers}\n                isApplyingRelations={isApplyingRelations}\n                handleApplyRelationImport={handleApplyRelationImport}\n                relationSummary={relationSummary}\n                relationCredentials={relationCredentials}\n                downloadRelationCredentials={downloadRelationCredentials}\n            />\n\n'''
    panel = panel[:start] + replacement + panel[end:]

panel_path.write_text(panel, encoding='utf-8')

checkpoint_path = root / 'docs/architecture/REFACTOR_V2_LATEST_CHECKPOINT_AR.md'
checkpoint = checkpoint_path.read_text(encoding='utf-8')
if 'Relations Import presentation boundary — قيد التحقق' not in checkpoint:
    checkpoint += '''\n## Relations Import presentation boundary — قيد التحقق\n\n- تم نقل رفع ملف العلاقات، preview، خيار إنشاء الحسابات الناقصة، التنفيذ، credentials handover ونتائج الربط إلى `SchoolRelationsImportPanel.tsx`.\n- الـchild يستقبل كل state/handlers كـprops ولا يستورد manager/store/api.\n- تم الحفاظ على file types، preview لأول 6 صفوف، create-missing-users semantics وكل summary counters.\n- الدفعة لا تغلق إلا بعد Direct Boundary Contract + Quick Gate + Full Review + Standard Safety Gate.\n'''
checkpoint_path.write_text(checkpoint, encoding='utf-8')

print('SchoolRelations import presentation boundary applied safely.')
