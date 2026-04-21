@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-dataverse.ps1"
exit /b %errorlevel%
