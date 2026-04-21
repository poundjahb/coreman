$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Set-Location -Path $rootDir
$env:VITE_PLATFORM_TARGET = "SQLITE"
Write-Host "Starting SQLITE platform (Electron) in this terminal. Press Ctrl+C to stop."
& npm.cmd run electron:dev
