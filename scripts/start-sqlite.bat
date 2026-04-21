@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-sqlite.ps1"
exit /b %errorlevel%
