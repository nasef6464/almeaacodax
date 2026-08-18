param(
    [string]$Branch = "refactor/repository-v2-safe"
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
    Write-Host "[ALMEAA sync] $Message" -ForegroundColor Red
    exit 1
}

try {
    git rev-parse --show-toplevel | Out-Null
} catch {
    Fail "شغّل السكربت من داخل مجلد Git الخاص بمشروع ALMEAA."
}

$repoRoot = (git rev-parse --show-toplevel).Trim()
Set-Location $repoRoot

$dirty = git status --porcelain
if ($dirty) {
    Write-Host "[ALMEAA sync] توجد تعديلات محلية غير محفوظة. لم يتم تنفيذ pull لحمايتها." -ForegroundColor Yellow
    git status --short
    Write-Host "احفظها في commit أو stash ثم أعد تشغيل السكربت." -ForegroundColor Yellow
    exit 2
}

Write-Host "[ALMEAA sync] Fetch origin..." -ForegroundColor Cyan
git fetch origin --prune

$localBranchExists = git show-ref --verify --quiet "refs/heads/$Branch"; $localExit = $LASTEXITCODE
if ($localExit -eq 0) {
    git switch $Branch
} else {
    git show-ref --verify --quiet "refs/remotes/origin/$Branch"; $remoteExit = $LASTEXITCODE
    if ($remoteExit -ne 0) {
        Fail "الفرع origin/$Branch غير موجود."
    }
    git switch --create $Branch --track "origin/$Branch"
}

Write-Host "[ALMEAA sync] Pull fast-forward only..." -ForegroundColor Cyan
git pull --ff-only origin $Branch

Write-Host ""
Write-Host "[ALMEAA sync] تم تحديث النسخة المحلية بأمان." -ForegroundColor Green
Write-Host "Branch: $Branch"
Write-Host "HEAD:   $(git rev-parse --short HEAD)"
Write-Host ""
Write-Host "قبل استخدام Codex أو أي Agent اقرأ بالترتيب:" -ForegroundColor Cyan
Write-Host "  1) AGENTS.md"
Write-Host "  2) docs/architecture/PROJECT_MAP.md"
Write-Host "  3) docs/architecture/CURRENT_REFACTOR_STATUS_AR.md"
Write-Host "  4) docs/architecture/REFACTOR_V2_EXECUTION_LEDGER_AR.md"
