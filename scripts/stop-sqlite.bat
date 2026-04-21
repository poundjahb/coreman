@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-sqlite.ps1"
exit /b %errorlevel%
