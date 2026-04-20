$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Set-Location -Path $rootDir
Write-Host "Starting application in this terminal. Press Ctrl+C to stop."
& npm.cmd run dev
