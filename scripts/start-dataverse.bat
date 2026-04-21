@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dataverse.ps1"
exit /b %errorlevel%
