from pathlib import Path

root = Path('.')
performance_path = root / 'scripts/smoke-performance-contract.mjs'
performance = performance_path.read_text(encoding='utf-8')

# 1) Scope the category-blocking assertion to the array it actually protects.
old_blocking = "assertNotIncludes('App.tsx', \"  '/category',\\n  '/quiz',\");"
new_blocking = '''const dataBootstrapBlockingPrefixesBlock = read('App.tsx').match(
  /const DATA_BOOTSTRAP_BLOCKING_PREFIXES = \[([\s\S]*?)\];/,
)?.[1] ?? '';
if (dataBootstrapBlockingPrefixesBlock.includes("'/category'")) {
  throw new Error('App.tsx must not block initial data bootstrap for /category routes');
}'''

if old_blocking in performance:
    performance = performance.replace(old_blocking, new_blocking, 1)
elif 'dataBootstrapBlockingPrefixesBlock' not in performance:
    raise SystemExit('Expected DATA_BOOTSTRAP_BLOCKING_PREFIXES contract shape was not found.')

# 2) The API startup logic has already been split into explicit bootstrap modules.
# Keep testing the performance/ordering semantics instead of requiring the old
# monolithic implementation to remain inside server.ts.
old_startup = '''assertIncludes('server/src/server.ts', 'async function runStartupMaintenance()');
assertIncludes('server/src/server.ts', 'void runStartupMaintenance();');
assertIncludes('server/src/server.ts', 'await connectToDatabase();');
assertIncludes('server/src/server.ts', 'server.listen(env.PORT');
assertNotIncludes('server/src/server.ts', 'await ensureSkillTaxonomy();\\n  await ensureAdminAccount();');'''

new_startup = '''assertIncludes('server/src/server.ts', 'bootstrapServer().catch((error) => {');
assertIncludes('server/src/app/bootstrap/bootstrapServer.ts', 'await connectToDatabase();');
assertIncludes('server/src/app/bootstrap/bootstrapServer.ts', 'server.listen(env.PORT');
assertIncludes('server/src/app/bootstrap/bootstrapServer.ts', 'void runStartupMaintenance();');
assertIncludes('server/src/app/bootstrap/runStartupMaintenance.ts', 'export async function runStartupMaintenance()');
assertIncludes('server/src/app/bootstrap/runStartupMaintenance.ts', '["skill taxonomy", ensureSkillTaxonomy]');
assertIncludes('server/src/app/bootstrap/runStartupMaintenance.ts', '["admin account", ensureAdminAccount]');
assertNotIncludes('server/src/app/bootstrap/bootstrapServer.ts', 'await runStartupMaintenance();');
const apiBootstrapSource = read('server/src/app/bootstrap/bootstrapServer.ts');
const apiListenIndex = apiBootstrapSource.indexOf('server.listen(env.PORT');
const maintenanceStartIndex = apiBootstrapSource.indexOf('void runStartupMaintenance();');
if (apiListenIndex === -1 || maintenanceStartIndex === -1 || maintenanceStartIndex < apiListenIndex) {
  throw new Error('API startup maintenance must remain best-effort and start only after server.listen is initiated');
}
const startupMaintenanceSource = read('server/src/app/bootstrap/runStartupMaintenance.ts');
const taxonomyMaintenanceIndex = startupMaintenanceSource.indexOf('["skill taxonomy", ensureSkillTaxonomy]');
const adminMaintenanceIndex = startupMaintenanceSource.indexOf('["admin account", ensureAdminAccount]');
if (taxonomyMaintenanceIndex === -1 || adminMaintenanceIndex === -1 || adminMaintenanceIndex < taxonomyMaintenanceIndex) {
  throw new Error('Startup maintenance must preserve taxonomy-before-admin task ordering');
}'''

if old_startup in performance:
    performance = performance.replace(old_startup, new_startup, 1)
elif "apiBootstrapSource = read('server/src/app/bootstrap/bootstrapServer.ts')" not in performance:
    raise SystemExit('Expected legacy startup-maintenance performance assertions were not found.')

performance_path.write_text(performance, encoding='utf-8')

ledger_path = root / 'docs/architecture/REFACTOR_V2_EXECUTION_LEDGER_AR.md'
ledger = ledger_path.read_text(encoding='utf-8')
entry = '''
- كشف `smoke:performance` أن بعض عقود الأداء ما زالت مربوطة بالشكل القديم للملفات بعد فصل bootstrap الخاص بالـAPI. تم تصحيح العقد ليتحقق من السلوك الفعلي: الاتصال بقاعدة البيانات قبل التشغيل، بدء `server.listen` قبل صيانة startup غير الحاجبة، وبقاء ترتيب صيانة taxonomy ثم admin؛ بدون إعادة المنطق إلى `server.ts` أو إضعاف الضمان.
'''
if entry.strip() not in ledger:
    ledger += entry
ledger_path.write_text(ledger, encoding='utf-8')

print('Scoped frontend bootstrap and API startup-maintenance performance contracts to their real modular boundaries.')
