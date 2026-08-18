from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANAGER = ROOT / "dashboards/admin/SchoolsManager.tsx"
SCHOOL_SMOKE = ROOT / "scripts/smoke-school-management-contract.mjs"
RELATIONSHIP_SMOKE = ROOT / "scripts/smoke-batch100f-relationship-audit-contract.mjs"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return source.replace(old, new, 1)


manager = MANAGER.read_text(encoding="utf-8")
manager = replace_once(
    manager,
    "import { SchoolOverviewOperationsPanel } from './SchoolsManager/SchoolOverviewOperationsPanel';\n",
    "import { SchoolOverviewOperationsPanel } from './SchoolsManager/SchoolOverviewOperationsPanel';\n"
    "import { SchoolCommandCenterPanel } from './SchoolsManager/SchoolCommandCenterPanel';\n",
    "command center import",
)

start_marker = '                <div data-testid="school-command-center" className="hidden">\n'
end_marker = "\n\n                <div className={`${expandedSchoolStep ? 'bg-white p-6 rounded-xl shadow-sm border border-gray-100' : 'hidden'}`}>\n"
start = manager.find(start_marker)
if start < 0:
    raise SystemExit("command center start marker not found")
end = manager.find(end_marker, start)
if end < 0:
    raise SystemExit("command center end marker not found")

replacement = """                <SchoolCommandCenterPanel\n                    readinessStatusLabel={readinessStatusLabel}\n                    readinessNextStep={readinessNextStep}\n                    readinessScore={readinessScore}\n                    readinessChecks={readinessChecks}\n                    readinessPercent={readinessPercent}\n                    visibleReadinessGaps={visibleReadinessGaps}\n                    commercialDecisionCards={commercialDecisionCards}\n                    handoverBlockingGaps={handoverBlockingGaps}\n                    handoverDecisionTitle={handoverDecisionTitle}\n                    handoverDecisionCopy={handoverDecisionCopy}\n                    nextOperatingStep={nextOperatingStep}\n                    commercialOperatingSteps={commercialOperatingSteps}\n                    currentOperatingStepIndex={currentOperatingStepIndex}\n                    expandedSchoolStep={expandedSchoolStep}\n                    isSchoolWorkspaceBusy={isSchoolWorkspaceBusy}\n                    onDownloadHandover={downloadSchoolHandover}\n                    onSelectTab={(tab) => setActiveTab(tab)}\n                    onCommercialDecision={(card) => {\n                        setActiveTab(card.tab || 'overview');\n                        window.setTimeout(() => {\n                            if (card.target === 'school-wide-supervisors-panel') {\n                                document.querySelector('[data-testid=\"school-wide-supervisors-panel\"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });\n                                return;\n                            }\n                            document.querySelector(`[data-testid=\"${card.target}\"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });\n                        }, 80);\n                    }}\n                    onSelectJourneyStep={(tab) => {\n                        setActiveTab(tab);\n                        setExpandedSchoolStep(tab);\n                    }}\n                    onAddClass={async () => {\n                        setActiveTab('overview');\n                        await handleCreateSingleClass();\n                    }}\n                    onAddStudent={() => {\n                        setActiveTab('overview');\n                        setIsSingleStudentOpen(true);\n                        window.setTimeout(() => {\n                            document.querySelector('[data-testid=\"school-students-panel\"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });\n                        }, 50);\n                    }}\n                    onAddSupervisor={() => {\n                        setActiveTab('relations');\n                        window.setTimeout(() => {\n                            document.querySelector('[data-testid=\"school-relations-quick-supervisor-card\"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });\n                        }, 50);\n                    }}\n                    onOpenPortal={() => {\n                        const url = new URL('/admin-dashboard', window.location.origin);\n                        url.searchParams.set('tab', 'school-portal');\n                        window.history.pushState(null, '', `${url.pathname}${url.search}`);\n                        window.dispatchEvent(new HashChangeEvent('hashchange'));\n                    }}\n                />"""
manager = manager[:start] + replacement + manager[end:]
MANAGER.write_text(manager, encoding="utf-8")

school_smoke = SCHOOL_SMOKE.read_text(encoding="utf-8")
school_anchor = '  await read("dashboards/admin/SchoolsManager/SchoolOverviewOperationsPanel.tsx"),\n'
school_smoke = replace_once(
    school_smoke,
    school_anchor,
    school_anchor + '  await read("dashboards/admin/SchoolsManager/SchoolCommandCenterPanel.tsx"),\n',
    "school management command center ownership",
)
SCHOOL_SMOKE.write_text(school_smoke, encoding="utf-8")

relationship_smoke = RELATIONSHIP_SMOKE.read_text(encoding="utf-8")
relationship_anchor = '    read("dashboards/admin/SchoolsManager/SchoolOverviewOperationsPanel.tsx"),\n'
relationship_smoke = replace_once(
    relationship_smoke,
    relationship_anchor,
    relationship_anchor + '    read("dashboards/admin/SchoolsManager/SchoolCommandCenterPanel.tsx"),\n',
    "relationship audit command center ownership",
)
RELATIONSHIP_SMOKE.write_text(relationship_smoke, encoding="utf-8")

print("School command-center presentation extraction applied safely.")
