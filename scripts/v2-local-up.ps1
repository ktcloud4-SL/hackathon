param(
    [switch]$SkipDependencyInstall
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envFile = Join-Path $repoRoot ".env.v2.local.example"
$composeFile = Join-Path $repoRoot "docker-compose.v2.local.yml"
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$runtimeDir = Join-Path ([System.IO.Path]::GetTempPath()) "onereport-v2-local"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line.Split("=", 2)
        [Environment]::SetEnvironmentVariable($parts[0], $parts[1], "Process")
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop가 필요합니다. Docker를 시작한 뒤 다시 실행해 주세요."
}

& docker compose --env-file $envFile -f $composeFile up -d
if ($LASTEXITCODE -ne 0) { throw "V2 PostgreSQL/MinIO 시작에 실패했습니다." }

$postgresReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    & docker compose --env-file $envFile -f $composeFile exec -T postgres-v2 `
        pg_isready -U $env:POSTGRES_USER -d $env:POSTGRES_DB *> $null
    if ($LASTEXITCODE -eq 0) {
        $postgresReady = $true
        break
    }
    Start-Sleep -Seconds 1
}
if (-not $postgresReady) { throw "V2 PostgreSQL이 준비되지 않았습니다." }

$python = Join-Path $backendDir ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $python)) {
    if ($SkipDependencyInstall) { throw "backend/.venv가 없습니다." }
    & python -m venv (Join-Path $backendDir ".venv")
    if ($LASTEXITCODE -ne 0) { throw "Backend 가상환경 생성에 실패했습니다." }
    & $python -m pip install -r (Join-Path $backendDir "requirements.txt")
    if ($LASTEXITCODE -ne 0) { throw "Backend dependency 설치에 실패했습니다." }
}

if (-not (Test-Path -LiteralPath (Join-Path $frontendDir "node_modules"))) {
    if ($SkipDependencyInstall) { throw "frontend/node_modules가 없습니다." }
    Push-Location $frontendDir
    try {
        & npm install
        if ($LASTEXITCODE -ne 0) { throw "Frontend dependency 설치에 실패했습니다." }
    } finally {
        Pop-Location
    }
}

Push-Location $backendDir
try {
    & $python -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw "V2 DB migration에 실패했습니다." }
    & $python seed.py
    if ($LASTEXITCODE -ne 0) { throw "V2 demo seed에 실패했습니다." }
} finally {
    Pop-Location
}

$backendProcess = Start-Process -FilePath $python -ArgumentList @(
    "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001"
) -WorkingDirectory $backendDir -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $runtimeDir "backend.out.log") `
    -RedirectStandardError (Join-Path $runtimeDir "backend.err.log")
$backendProcess.Id | Set-Content -LiteralPath (Join-Path $runtimeDir "backend.pid")

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$frontendProcess = Start-Process -FilePath $npm -ArgumentList @(
    "run", "dev", "--", "--port", "5174", "--strictPort"
) -WorkingDirectory $frontendDir -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $runtimeDir "frontend.out.log") `
    -RedirectStandardError (Join-Path $runtimeDir "frontend.err.log")
$frontendProcess.Id | Set-Content -LiteralPath (Join-Path $runtimeDir "frontend.pid")

Write-Host "OneReport V2 local runtime started."
Write-Host "Frontend: http://localhost:5174"
Write-Host "Backend:  http://127.0.0.1:8001/api/health"
Write-Host "MinIO:    http://127.0.0.1:59001"
Write-Host "Stop:     powershell -ExecutionPolicy Bypass -File scripts/v2-local-down.ps1"
