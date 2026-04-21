$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Set-Location -Path $rootDir
$env:VITE_PLATFORM_TARGET = "IN_MEMORY"
Write-Host "Starting IN_MEMORY platform in this terminal. Press Ctrl+C to stop."
& npm.cmd run dev
