from pathlib import Path

root = Path('.')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'Expected {label} block was not found; refusing unsafe edit.')
    return text.replace(old, new, 1)


# 1) Make UnifiedQuizBuilder accept explicit context defaults from Reports/School Portal.
builder_path = root / 'dashboards/admin/UnifiedQuizBuilder.tsx'
builder = builder_path.read_text(encoding='utf-8')

builder = replace_once(
    builder,
    '''  onClose?: () => void;\n  defaultKind?: QuizKind;\n}\n''',
    '''  onClose?: () => void;\n  defaultKind?: QuizKind;\n  initialPathId?: string;\n  initialSubjectId?: string;\n  initialSkillIds?: string[];\n  initialTargetGroupIds?: string[];\n  initialTargetUserIds?: string[];\n  initialMode?: NonNullable<Quiz['mode']>;\n}\n''',
    'UnifiedQuizBuilder props',
)

builder = replace_once(
    builder,
    '''  onSave,\n  onClose,\n  defaultKind = "test",\n}) => {\n''',
    '''  onSave,\n  onClose,\n  defaultKind = "test",\n  initialPathId = "",\n  initialSubjectId = "",\n  initialSkillIds,\n  initialTargetGroupIds,\n  initialTargetUserIds,\n  initialMode = "regular",\n}) => {\n''',
    'UnifiedQuizBuilder destructuring',
)

builder = replace_once(
    builder,
    '''  const [pathId, setPathId] = useState(editingQuiz?.pathId ?? "");\n  const [subjectId, setSubjectId] = useState(editingQuiz?.subjectId ?? "");\n''',
    '''  const [pathId, setPathId] = useState(editingQuiz?.pathId ?? initialPathId);\n  const [subjectId, setSubjectId] = useState(editingQuiz?.subjectId ?? initialSubjectId);\n''',
    'UnifiedQuizBuilder path/subject state',
)

builder = replace_once(
    builder,
    '''  const [targetGroupIds, setTargetGroupIds] = useState<string[]>(editingQuiz?.targetGroupIds ?? []);\n  const [dueDate, setDueDate] = useState(editingQuiz?.dueDate ?? "");\n''',
    '''  const [targetGroupIds, setTargetGroupIds] = useState<string[]>(editingQuiz?.targetGroupIds ?? initialTargetGroupIds ?? []);\n  const [targetUserIds] = useState<string[]>(editingQuiz?.targetUserIds ?? initialTargetUserIds ?? []);\n  const [dueDate, setDueDate] = useState(editingQuiz?.dueDate ?? "");\n''',
    'UnifiedQuizBuilder targeting state',
)

builder = replace_once(
    builder,
    '''    isAdmin || targetGroupIds.length > 0,\n''',
    '''    isAdmin || targetGroupIds.length > 0 || targetUserIds.length > 0,\n''',
    'UnifiedQuizBuilder final-step targeting validation',
)

builder = replace_once(
    builder,
    '''        access: { type: accessType === "package" ? "paid" : accessType } as any,\n        targetGroupIds,\n        dueDate: dueDate || undefined,\n''',
    '''        access: { type: accessType === "package" ? "paid" : accessType } as any,\n        mode: editingQuiz?.mode ?? initialMode,\n        skillIds: editingQuiz?.skillIds ?? initialSkillIds ?? [],\n        targetGroupIds,\n        targetUserIds,\n        dueDate: dueDate || undefined,\n''',
    'UnifiedQuizBuilder save payload targeting',
)

builder_path.write_text(builder, encoding='utf-8')


# 2) Pass report/school context from QuizzesManager into the unified builder.
manager_path = root / 'dashboards/admin/QuizzesManager.tsx'
manager = manager_path.read_text(encoding='utf-8')

editing_old = '''        defaultKind={draftMode === 'saher' || draftMode === 'central' ? 'test' : undefined}\n        onSave={() => { setIsEditing(false); setEditingQuizId(null); }}\n'''
editing_new = '''        defaultKind={draftMode === 'saher' || draftMode === 'central' ? 'test' : undefined}\n        initialPathId={selectedPathId || activePathId}\n        initialSubjectId={selectedSubjectId || activeSubjectId}\n        initialSkillIds={selectedSkillId ? [selectedSkillId] : []}\n        initialTargetUserIds={initialTargetUserId ? [initialTargetUserId] : []}\n        initialTargetGroupIds={initialTargetGroupId ? [initialTargetGroupId] : []}\n        initialMode={draftMode === 'saher' ? 'saher' : draftMode === 'central' || openedFromReports || openedFromSchoolPortal || isSupervisor ? 'central' : 'regular'}\n        onSave={() => { setIsEditing(false); setEditingQuizId(null); }}\n'''
manager = replace_once(manager, editing_old, editing_new, 'QuizzesManager editing builder defaults')

overlay_old = '''          defaultKind={isSupervisor ? 'test' : 'test'}\n          onClose={() => setIsUnifiedBuilderOpen(false)}\n'''
overlay_new = '''          defaultKind="test"\n          initialPathId={selectedPathId || activePathId}\n          initialSubjectId={selectedSubjectId || activeSubjectId}\n          initialSkillIds={selectedSkillId ? [selectedSkillId] : []}\n          initialTargetUserIds={initialTargetUserId ? [initialTargetUserId] : []}\n          initialTargetGroupIds={initialTargetGroupId ? [initialTargetGroupId] : []}\n          initialMode={openedFromReports || openedFromSchoolPortal || isSupervisor ? 'central' : 'regular'}\n          onClose={() => setIsUnifiedBuilderOpen(false)}\n'''
manager = replace_once(manager, overlay_old, overlay_new, 'QuizzesManager overlay builder defaults')
manager_path.write_text(manager, encoding='utf-8')


# 3) Strengthen the performance/product contract to verify the new architecture rather than
# requiring the old inline payload shape inside QuizzesManager.
perf_path = root / 'scripts/smoke-performance-contract.mjs'
perf = perf_path.read_text(encoding='utf-8')
old_assert = "assertIncludes('dashboards/admin/QuizzesManager.tsx', 'skillIds: selectedSkillId ? [selectedSkillId] : []');\n"
new_assert = '''assertIncludes('dashboards/admin/QuizzesManager.tsx', 'initialSkillIds={selectedSkillId ? [selectedSkillId] : []}');\nassertIncludes('dashboards/admin/QuizzesManager.tsx', 'initialTargetUserIds={initialTargetUserId ? [initialTargetUserId] : []}');\nassertIncludes('dashboards/admin/QuizzesManager.tsx', 'initialTargetGroupIds={initialTargetGroupId ? [initialTargetGroupId] : []}');\nassertIncludes('dashboards/admin/UnifiedQuizBuilder.tsx', 'skillIds: editingQuiz?.skillIds ?? initialSkillIds ?? []');\nassertIncludes('dashboards/admin/UnifiedQuizBuilder.tsx', 'targetUserIds,');\nassertIncludes('dashboards/admin/UnifiedQuizBuilder.tsx', 'mode: editingQuiz?.mode ?? initialMode');\n'''
perf = replace_once(perf, old_assert, new_assert, 'directed quiz performance contract')
perf_path.write_text(perf, encoding='utf-8')


# 4) Persist the discovery/fix in the execution ledger.
ledger_path = root / 'docs/architecture/REFACTOR_V2_EXECUTION_LEDGER_AR.md'
ledger = ledger_path.read_text(encoding='utf-8')
entry = '''\n- كشف الفحص الشامل تراجعًا وظيفيًا في تدفق `Reports -> QuizzesManager -> UnifiedQuizBuilder`: سياق المهارة/الطالب/المجموعة كان يظهر للمستخدم لكنه لا ينتقل إلى payload الحفظ في الـbuilder الموحد. تم إصلاحه بتمرير defaults صريحة وحفظ `mode/skillIds/targetUserIds/targetGroupIds` مع الحفاظ على editing values عند تعديل اختبار موجود.\n'''
if entry.strip() not in ledger:
    heading = '## أخطاء اكتُشفت أثناء مراجعة الدفعة\n'
    if heading in ledger:
        ledger = ledger.replace(heading, heading + entry, 1)
    else:
        ledger += '\n' + heading + entry
ledger_path.write_text(ledger, encoding='utf-8')

print('Directed quiz report context repair staged safely.')
