# Requires Docker Desktop on Windows. The entire stack is local and disposable.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$compose = Join-Path $root 'docker-compose.testing.yml'
$credentialsFile = Join-Path $root '.env.almeaa-testing.local'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker Desktop is required. Install/start Docker Desktop before launching ALMEAA testing.'
}
& docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose is not available.' }

function New-IsolatedSecret {
  $bytes = New-Object byte[] 36
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

$admin = New-IsolatedSecret
$student = New-IsolatedSecret
$redeemed = New-IsolatedSecret
$teacher = New-IsolatedSecret
$supervisor = New-IsolatedSecret
$schoolSupervisor = New-IsolatedSecret
$parent = New-IsolatedSecret

# These are throwaway credentials. The fixture's admin-email literal is
# required by the existing seedOperationalScenario script.
$vars = [ordered]@{
  JWT_SECRET = New-IsolatedSecret
  ADMIN_NAME = 'ALMEAA Testing Admin'
  ADMIN_EMAIL = 'nasef64@gmail.com'
  ADMIN_PASSWORD = $admin
  ROLE_ADMIN_EMAIL = 'nasef64@gmail.com'
  ROLE_ADMIN_PASSWORD = $admin
  SMOKE_ADMIN_EMAIL = 'nasef64@gmail.com'
  SMOKE_ADMIN_PASSWORD = $admin
  ROLE_STUDENT_EMAIL = 'student.a@almeaa.local'
  ROLE_STUDENT_PASSWORD = $student
  SMOKE_STUDENT_EMAIL = 'student.a@almeaa.local'
  SMOKE_STUDENT_PASSWORD = $student
  SMOKE_STUDENT_REDEEMED_EMAIL = 'student.d@almeaa.local'
  SMOKE_STUDENT_REDEEMED_PASSWORD = $redeemed
  ROLE_TEACHER_EMAIL = 'teacher.quant@almeaa.local'
  ROLE_TEACHER_PASSWORD = $teacher
  SMOKE_TEACHER_EMAIL = 'teacher.quant@almeaa.local'
  SMOKE_TEACHER_PASSWORD = $teacher
  ROLE_SUPERVISOR_EMAIL = 'supervisor.group@almeaa.local'
  ROLE_SUPERVISOR_PASSWORD = $supervisor
  SMOKE_SUPERVISOR_EMAIL = 'supervisor.group@almeaa.local'
  SMOKE_SUPERVISOR_PASSWORD = $supervisor
  ROLE_SCHOOL_SUPERVISOR_EMAIL = 'supervisor.school@almeaa.local'
  ROLE_SCHOOL_SUPERVISOR_PASSWORD = $schoolSupervisor
  ROLE_PARENT_EMAIL = 'parent.a@almeaa.local'
  ROLE_PARENT_PASSWORD = $parent
  SMOKE_PARENT_EMAIL = 'parent.a@almeaa.local'
  SMOKE_PARENT_PASSWORD = $parent
  SMOKE_ALLOW_PASSWORD_LOGIN = 'true'
}

$lines = foreach ($item in $vars.GetEnumerator()) { "$($item.Key)=$($item.Value)" }
$nl = [Environment]::NewLine
[System.IO.File]::WriteAllText($credentialsFile, (($lines -join $nl) + $nl), (New-Object System.Text.UTF8Encoding($false)))

Write-Host 'Starting local-only ALMEAA Testing. No cloud service or production DB is used.' -ForegroundColor Cyan
& docker compose --project-name almeaa-isolated-testing --file $compose --env-file $credentialsFile up --build --detach
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose startup failed. Inspect: docker compose -f docker-compose.testing.yml logs backend' }

Write-Host ''
Write-Host 'Open: http://localhost:8088' -ForegroundColor Green
Write-Host 'Synthetic test accounts (copy these locally; never use them on production):' -ForegroundColor Yellow
Write-Host "Admin      : nasef64@gmail.com / $admin"
Write-Host "Teacher    : teacher.quant@almeaa.local / $teacher"
Write-Host "Student    : student.a@almeaa.local / $student"
Write-Host "Supervisor : supervisor.group@almeaa.local / $supervisor"
Write-Host "School sup.: supervisor.school@almeaa.local / $schoolSupervisor"
Write-Host "Parent     : parent.a@almeaa.local / $parent"
Write-Host "Student D  : student.d@almeaa.local / $redeemed"
Write-Host ''
Write-Host 'To stop and discard the temporary DB: powershell -ExecutionPolicy Bypass -File .\scripts\testing\Stop-ALMEAATesting.ps1'
