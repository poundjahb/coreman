$ErrorActionPreference = "Stop"

param(
    [ValidateSet("SQLITE", "IN_MEMORY", "DATAVERSE")]
    [string]$Platform = "SQLITE"
)

$runnerByPlatform = @{
    "SQLITE" = "stop-sqlite.ps1"
    "IN_MEMORY" = "stop-inmemory.ps1"
    "DATAVERSE" = "stop-dataverse.ps1"
}

$scriptToRun = Join-Path $PSScriptRoot $runnerByPlatform[$Platform]
Write-Host "Delegating to $($runnerByPlatform[$Platform])"
& $scriptToRun
