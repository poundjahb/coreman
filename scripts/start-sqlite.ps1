$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Set-Location -Path $rootDir

# SQLite is now treated as a development backend provider behind the SERVER platform.
# No Electron runtime is started from this launcher.
$env:VITE_PLATFORM_TARGET = "SERVER"
$env:VITE_DB_PROVIDER = "sqlite"

if (-not $env:VITE_API_BASE_URL) {
	$env:VITE_API_BASE_URL = "http://localhost:3001"
}

Write-Host "Starting SERVER platform with SQLite provider intent (no Electron). Press Ctrl+C to stop."
Write-Host "Expected backend API: $env:VITE_API_BASE_URL"
& npm.cmd run dev
