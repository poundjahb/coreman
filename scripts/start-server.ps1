$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Set-Location -Path $rootDir
$env:VITE_PLATFORM_TARGET = "SERVER"

if (-not $env:VITE_API_BASE_URL) {
  $env:VITE_API_BASE_URL = "http://localhost:3001"
}

Write-Host "Starting SERVER platform (browser + backend API expected at $env:VITE_API_BASE_URL) in this terminal. Press Ctrl+C to stop."
& npm.cmd run dev
