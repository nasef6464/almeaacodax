# Stop the isolated test stack only. The MongoDB data is tmpfs and disappears.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$compose = Join-Path $root 'docker-compose.testing.yml'
$credentialsFile = Join-Path $root '.env.almeaa-testing.local'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop is required.' }
& docker compose --project-name almeaa-isolated-testing --file $compose down --remove-orphans
if ($LASTEXITCODE -ne 0) { throw 'Could not stop ALMEAA testing containers.' }
if (Test-Path $credentialsFile) { Remove-Item -LiteralPath $credentialsFile -Force }
Write-Host 'ALMEAA testing containers stopped. Disposable test database and locally generated login file discarded.' -ForegroundColor Green
