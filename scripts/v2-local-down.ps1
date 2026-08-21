param(
    [switch]$RemoveData
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runtimeDir = Join-Path ([System.IO.Path]::GetTempPath()) "onereport-v2-local"

foreach ($name in @("backend", "frontend")) {
    $pidFile = Join-Path $runtimeDir "$name.pid"
    if (Test-Path -LiteralPath $pidFile) {
        $processId = [int](Get-Content -Raw -LiteralPath $pidFile)
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $pidFile -Force
    }
}

$composeArgs = @(
    "compose",
    "--env-file", (Join-Path $repoRoot ".env.v2.local.example"),
    "-f", (Join-Path $repoRoot "docker-compose.v2.local.yml"),
    "down"
)
if ($RemoveData) { $composeArgs += "--volumes" }

& docker @composeArgs
if ($LASTEXITCODE -ne 0) { throw "V2 local container 종료에 실패했습니다." }

Write-Host "OneReport V2 local runtime stopped."
if (-not $RemoveData) { Write-Host "V2 PostgreSQL/MinIO data volumes were preserved." }
