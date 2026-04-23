$ErrorActionPreference = "Stop"

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendDir = Join-Path $rootDir "src/platform/adapters/sqlite/server"

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║         Correspondence Management - Backend + Frontend         ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# Check if backend node_modules exists
if (-not (Test-Path "$backendDir/node_modules")) {
    Write-Host "`n[1/3] Installing backend dependencies..." -ForegroundColor Green
    Set-Location -Path $backendDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install backend dependencies" -ForegroundColor Red
        exit 1
    }
    Set-Location -Path $rootDir
}

Write-Host "`n[2/3] Starting Backend API Server on port 3001..." -ForegroundColor Green
Write-Host "Command: npm --prefix src/platform/adapters/sqlite/server run dev" -ForegroundColor DarkGray

Write-Host "`n[3/3] Starting Frontend Dev Server on port 5173..." -ForegroundColor Green

# Set environment for frontend
$env:VITE_PLATFORM_TARGET = "SERVER"
$env:VITE_API_BASE_URL = "http://localhost:3001"

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                    🚀 Ready to Go!                             ║
├════════════════════════════════════════════════════════════════┤
║                                                                ║
║  Frontend:  http://localhost:5173                             ║
║  Backend:   http://localhost:3001                             ║
║                                                                ║
║  Admin Panel:  http://localhost:5173/admin                   ║
║  Health Check: http://localhost:3001/health                  ║
║                                                                ║
║  To stop both servers: Close this window                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

# Start frontend and backend together in this terminal with labeled output
Set-Location -Path $rootDir
& npx.cmd --yes concurrently `
    --kill-others `
    --kill-others-on-fail `
    --names "FRONTEND,BACKEND" `
    --prefix-colors "cyan,green" `
    "npm run dev" `
    "npm --prefix src/platform/adapters/sqlite/server run dev"

if ($LASTEXITCODE -ne 0) {
    Write-Host "One of the processes exited with code $LASTEXITCODE." -ForegroundColor Yellow
    exit $LASTEXITCODE
}
