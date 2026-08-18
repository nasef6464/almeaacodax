from pathlib import Path

root = Path('.')

manager_path = root / 'dashboards/admin/SchoolsManager.tsx'
manager = manager_path.read_text(encoding='utf-8')
old_xlsx_import = "import { loadXlsx, readWorkbookFromBuffer, registerXlsxRuntime, sheetToSafeRows } from '../../utils/xlsxLoader';\n"
new_imports = (
    "import { parseImportFile, parseRelationFile } from './SchoolsManager/importFileReaders';\n"
    "import { getDuplicateImportEmails } from './SchoolsManager/importRowParsing';\n"
)
if new_imports not in manager:
    if old_xlsx_import not in manager:
        raise SystemExit('Expected SchoolsManager xlsx import was not found; refusing unsafe edit.')
    manager = manager.replace(old_xlsx_import, new_imports, 1)

start_marker = 'const normalizeHeader = (value: string) =>\n'
end_marker = 'export const SchoolsManager: React.FC = () => {'
start = manager.find(start_marker)
end = manager.find(end_marker)
if start != -1:
    if end == -1 or end <= start:
        raise SystemExit('Could not locate SchoolsManager parser extraction boundary.')
    manager = manager[:start] + manager[end:]
elif 'const parseImportRows =' in manager or 'const parseRelationRows =' in manager:
    raise SystemExit('Parser block shape changed; refusing partial extraction.')
manager_path.write_text(manager, encoding='utf-8')

package_path = root / 'package.json'
package_text = package_path.read_text(encoding='utf-8')
script_line = '        "smoke:schools-import-parsing": "node scripts/smoke-schools-import-parsing-contract.mjs",\n'
if script_line not in package_text:
    needle = '        "smoke:school-management": "node scripts/smoke-school-management-contract.mjs",\n'
    if needle not in package_text:
        raise SystemExit('Could not locate package.json school management script insertion point.')
    package_text = package_text.replace(needle, needle + script_line, 1)
package_path.write_text(package_text, encoding='utf-8')

xlsx_contract_path = root / 'scripts/smoke-xlsx-safety-contract.mjs'
xlsx_contract = xlsx_contract_path.read_text(encoding='utf-8')
old_xlsx_block = '''const adminImportFiles = [\n  "dashboards/admin/LessonsManager.tsx",\n  "dashboards/admin/QuestionBankManager.tsx",\n  "dashboards/admin/SchoolsManager.tsx",\n];\n\nfor (const file of adminImportFiles) {\n  addCheck(\n    `${file} uses safe workbook reader`,\n    includes(file, "readWorkbookFromBuffer") &&\n      includes(file, "registerXlsxRuntime") &&\n      (includes(file, "sheetToSafeObjects") || includes(file, "sheetToSafeRows")),\n    "Excel imports must go through xlsxLoader safety helpers",\n  );\n  addCheck(\n    `${file} has no static xlsx import`,\n    notIncludes(file, "import * as XLSX from 'xlsx'") &&\n      notIncludes(file, 'import * as XLSX from "xlsx"') &&\n      notIncludes(file, "from 'xlsx'") &&\n      notIncludes(file, 'from "xlsx"'),\n    "static xlsx imports would bypass lazy loading and safety review",\n  );\n}\n'''
new_xlsx_block = '''const adminImportFlows = [\n  { surface: "dashboards/admin/LessonsManager.tsx", reader: "dashboards/admin/LessonsManager.tsx" },\n  { surface: "dashboards/admin/QuestionBankManager.tsx", reader: "dashboards/admin/QuestionBankManager.tsx" },\n  { surface: "dashboards/admin/SchoolsManager.tsx", reader: "dashboards/admin/SchoolsManager/importFileReaders.ts" },\n];\n\nfor (const { surface, reader } of adminImportFlows) {\n  addCheck(\n    `${surface} uses safe workbook reader`,\n    includes(reader, "readWorkbookFromBuffer") &&\n      includes(reader, "registerXlsxRuntime") &&\n      (includes(reader, "sheetToSafeObjects") || includes(reader, "sheetToSafeRows")),\n    "Excel imports must go through xlsxLoader safety helpers, directly or through a feature-owned reader",\n  );\n  addCheck(\n    `${surface} has no static xlsx import`,\n    notIncludes(surface, "import * as XLSX from 'xlsx'") &&\n      notIncludes(surface, 'import * as XLSX from "xlsx"') &&\n      notIncludes(surface, "from 'xlsx'") &&\n      notIncludes(surface, 'from "xlsx"') &&\n      notIncludes(reader, "import * as XLSX from 'xlsx'") &&\n      notIncludes(reader, 'import * as XLSX from "xlsx"') &&\n      notIncludes(reader, "from 'xlsx'") &&\n      notIncludes(reader, 'from "xlsx"'),\n    "static xlsx imports would bypass lazy loading and safety review",\n  );\n}\n'''
if 'const adminImportFlows = [' not in xlsx_contract:
    if old_xlsx_block not in xlsx_contract:
        raise SystemExit('Expected XLSX safety contract block was not found.')
    xlsx_contract = xlsx_contract.replace(old_xlsx_block, new_xlsx_block, 1)
xlsx_contract_path.write_text(xlsx_contract, encoding='utf-8')

performance_path = root / 'scripts/smoke-performance-contract.mjs'
performance = performance_path.read_text(encoding='utf-8')
old_perf_block = '''for (const file of [\n  'dashboards/admin/UsersManager.tsx',\n  'dashboards/admin/SchoolsManager.tsx',\n  'dashboards/admin/SchoolPortalManager.tsx',\n  'dashboards/admin/QuizzesManager.tsx',\n  'dashboards/admin/QuestionBankManager.tsx',\n  'dashboards/admin/LibraryManager.tsx',\n  'dashboards/admin/LessonsManager.tsx',\n  'dashboards/admin/GroupsManager.tsx',\n]) {\n  assertIncludes(file, "from '../../utils/xlsxLoader';");\n  assertIncludes(file, 'loadXlsx');\n  assertNotIncludes(file, "import * as XLSX from 'xlsx';");\n}\n'''
new_perf_block = '''for (const file of [\n  'dashboards/admin/UsersManager.tsx',\n  'dashboards/admin/SchoolPortalManager.tsx',\n  'dashboards/admin/QuizzesManager.tsx',\n  'dashboards/admin/QuestionBankManager.tsx',\n  'dashboards/admin/LibraryManager.tsx',\n  'dashboards/admin/LessonsManager.tsx',\n  'dashboards/admin/GroupsManager.tsx',\n]) {\n  assertIncludes(file, "from '../../utils/xlsxLoader';");\n  assertIncludes(file, 'loadXlsx');\n  assertNotIncludes(file, "import * as XLSX from 'xlsx';");\n}\nassertIncludes('dashboards/admin/SchoolsManager.tsx', "from './SchoolsManager/importFileReaders';");\nassertIncludes('dashboards/admin/SchoolsManager/importFileReaders.ts', "from '../../../utils/xlsxLoader';");\nassertIncludes('dashboards/admin/SchoolsManager/importFileReaders.ts', 'loadXlsx');\nassertNotIncludes('dashboards/admin/SchoolsManager/importFileReaders.ts', "import * as XLSX from 'xlsx';");\n'''
if "assertIncludes('dashboards/admin/SchoolsManager/importFileReaders.ts'" not in performance:
    if old_perf_block not in performance:
        raise SystemExit('Expected performance XLSX contract block was not found.')
    performance = performance.replace(old_perf_block, new_perf_block, 1)
performance_path.write_text(performance, encoding='utf-8')

ledger_path = root / 'docs/architecture/REFACTOR_V2_EXECUTION_LEDGER_AR.md'
ledger = ledger_path.read_text(encoding='utf-8')
ledger = ledger.replace(
    'الحالة: **قيد التنفيذ، ولا تُغلق إلا بعد نجاح Phase Review وRefactor V2 Safety Gate.**',
    'الحالة: **تم تطبيق الاستخراج، وتنتظر نتيجة Phase Review قبل الإغلاق.**',
)
ledger_path.write_text(ledger, encoding='utf-8')

print('Schools import decomposition patch applied safely.')
