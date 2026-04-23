$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Set-Location -Path $rootDir

# SQLite is treated as a development backend provider behind the SERVER platform.
# This launcher now starts both backend and frontend by delegating to start-backend.ps1.
$env:VITE_PLATFORM_TARGET = "SERVER"
$env:VITE_DB_PROVIDER = "sqlite"

if (-not $env:VITE_API_BASE_URL) {
	$env:VITE_API_BASE_URL = "http://localhost:3001"
}

Write-Host "Starting SERVER platform with SQLite provider (backend + frontend). Press Ctrl+C to stop."
Write-Host "Backend API URL: $env:VITE_API_BASE_URL"

$launcher = Join-Path $PSScriptRoot "start-backend.ps1"
if (-not (Test-Path $launcher)) {
	Write-Error "Required launcher not found: $launcher"
}

& $launcher
