$ErrorActionPreference = "Stop"

param(
    [ValidateSet("SERVER", "SQLITE", "IN_MEMORY", "DATAVERSE")]
    [string]$Platform = "SERVER"
)

$runnerByPlatform = @{
    "SERVER" = "stop-server.ps1"
    "SQLITE" = "stop-sqlite.ps1"
    "IN_MEMORY" = "stop-inmemory.ps1"
    "DATAVERSE" = "stop-dataverse.ps1"
}

$scriptToRun = Join-Path $PSScriptRoot $runnerByPlatform[$Platform]
Write-Host "Delegating to $($runnerByPlatform[$Platform])"
& $scriptToRun
