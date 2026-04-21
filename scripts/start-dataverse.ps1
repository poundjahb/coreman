$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Set-Location -Path $rootDir
$env:VITE_PLATFORM_TARGET = "DATAVERSE"
Write-Host "Starting DATAVERSE platform in this terminal. Press Ctrl+C to stop."
& npm.cmd run dev
