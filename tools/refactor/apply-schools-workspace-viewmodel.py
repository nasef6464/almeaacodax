from pathlib import Path

root = Path('.')
manager_path = root / 'dashboards/admin/SchoolsManager.tsx'
manager = manager_path.read_text(encoding='utf-8')

relationship_import = "import { buildSchoolRelationshipViewModel } from './SchoolsManager/relationshipViewModel';\n"
workspace_import = "import { buildSchoolWorkspaceViewModel } from './SchoolsManager/workspaceViewModel';\n"
if workspace_import not in manager:
    if relationship_import not in manager:
        raise SystemExit('Could not locate relationship view-model import anchor.')
    manager = manager.replace(relationship_import, relationship_import + workspace_import, 1)

start_marker = "        const readinessChecks = [\n"
end_marker = "        const copySchoolHandoverMessage = async () => {\n"
start = manager.find(start_marker)
end = manager.find(end_marker, start if start != -1 else 0)
if start == -1:
    if 'buildSchoolWorkspaceViewModel({' not in manager:
        raise SystemExit('Could not locate workspace readiness block or an existing extraction.')
else:
    if end == -1 or end <= start:
        raise SystemExit('Could not locate workspace extraction boundary.')
    replacement = """        const {\n            readinessChecks,\n            readinessScore,\n            handoverBlockingGaps,\n            visibleReadinessGaps,\n            operationalWarnings,\n            readinessStatusLabel,\n            readinessNextStep,\n            commercialOperatingSteps,\n            nextOperatingStep,\n            currentOperatingStepIndex,\n            readinessPercent,\n            handoverDecisionTitle,\n            handoverDecisionCopy,\n            isSaveVerificationBusy,\n            isSchoolWorkspaceBusy,\n            saveVerificationButtonLabel,\n            commercialDecisionCards,\n            overviewFocusActions,\n            schoolLaunchPlan,\n            supervisorHandoverChecklist,\n            schoolHandoverMessage,\n        } = buildSchoolWorkspaceViewModel({\n            school: selectedSchool,\n            schoolClasses,\n            schoolStudents,\n            schoolSupervisors,\n            studentsWithoutClass,\n            studentsWithoutParent,\n            activeSchoolPackages,\n            activeSchoolCodes,\n            totalSeats,\n            usedSeats,\n            schoolReport,\n            saveVerificationState,\n            schoolActionPending,\n            rosterActionPending,\n            packageActionPending,\n            accessCodeActionPending,\n            isImporting,\n            isApplyingRelations,\n        });\n"""
    manager = manager[:start] + replacement + manager[end:]

manager_path.write_text(manager, encoding='utf-8')

ledger_path = root / 'docs/architecture/REFACTOR_V2_EXECUTION_LEDGER_AR.md'
ledger = ledger_path.read_text(encoding='utf-8')
if 'Workspace decision/handover view-model' not in ledger:
    ledger += '''\n## دفعة Schools Workspace الثانية — Decision / Handover View-Model\n\n**الحالة: تم تطبيق الاستخراج وتنتظر Full Phase Review.**\n\n- نقل readiness checks والـoperational warnings وقرار التسليم والـoperating steps والـdecision cards والـlaunch plan والـhandover message إلى `SchoolsManager/workspaceViewModel.ts`.\n- الهدف: إبقاء `SchoolsManager.tsx` مسؤولًا عن orchestration/actions/UI فقط، وتقليل منطق القرار التجاري/التشغيلي المكرر داخل الـcomponent.\n- العقد المباشر يغطي المدرسة الفارغة، المدرسة الجاهزة 5/5، استهلاك المقاعد، الطلاب بلا فصل/ولي أمر، حالات save verification، وحساب 10,000 نموذج لمنع انحدار حسابي واضح.\n'''
ledger_path.write_text(ledger, encoding='utf-8')

print('Schools workspace decision/handover view-model extraction applied safely.')
