$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$pidFile = Join-Path $rootDir ".app.pid"

if (Test-Path $pidFile) {
    Remove-Item -Path $pidFile -Force
}

Write-Host "Application now runs in the current terminal."
Write-Host "To stop it, focus that terminal and press Ctrl+C."
