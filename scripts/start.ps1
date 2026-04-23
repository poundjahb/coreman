$ErrorActionPreference = "Stop"

param(
	[ValidateSet("SERVER", "SQLITE", "IN_MEMORY", "DATAVERSE")]
	[string]$Platform = "SERVER"
)

$runnerByPlatform = @{
	"SERVER" = "start-server.ps1"
	"SQLITE" = "start-sqlite.ps1"
	"IN_MEMORY" = "start-inmemory.ps1"
	"DATAVERSE" = "start-dataverse.ps1"
}

$scriptToRun = Join-Path $PSScriptRoot $runnerByPlatform[$Platform]
Write-Host "Delegating to $($runnerByPlatform[$Platform])"
& $scriptToRun
