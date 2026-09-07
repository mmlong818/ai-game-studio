$ErrorActionPreference = 'Stop'
$studioRoot = Split-Path -Parent $PSScriptRoot
$studioNode = (Get-Command node -ErrorAction Stop).Source
$studioLogRoot = Join-Path $studioRoot 'data/logs'
New-Item -ItemType Directory -Force -Path $studioLogRoot | Out-Null
$studioStamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'

# Separate hidden processes with file-backed output, not an interactive terminal.
# No automatic build submission/retry or crash restart: interrupted paid work must
# retain its persisted failure state rather than silently incur another charge.
$studioServices = @(
    @{ Name = 'api'; Ports = @(4312,4313); Args = @('--env-file-if-exists=.env.local','--use-env-proxy','--import','tsx','src/server/index.ts'); Url = 'http://127.0.0.1:4312/api/projects' },
    @{ Name = 'web'; Ports = @(4311); Args = @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4311','--strictPort'); Url = 'http://127.0.0.1:4311/' }
)
foreach ($studioService in $studioServices) {
    $studioListeners = @(Get-NetTCPConnection -State Listen -LocalPort $studioService.Ports -ErrorAction SilentlyContinue)
    if ($studioListeners.Count -gt 0) {
        Write-Output "$($studioService.Name): existing listener; leaving process untouched"
        continue
    }
    $studioOut = Join-Path $studioLogRoot "$($studioService.Name)-$studioStamp.stdout.log"
    $studioErr = Join-Path $studioLogRoot "$($studioService.Name)-$studioStamp.stderr.log"
    $studioProcess = Start-Process -FilePath $studioNode -ArgumentList $studioService.Args -WorkingDirectory $studioRoot -WindowStyle Hidden -RedirectStandardOutput $studioOut -RedirectStandardError $studioErr -PassThru
    $studioReady = $false
    for ($studioAttempt = 0; $studioAttempt -lt 20; $studioAttempt++) {
        $studioProcess.Refresh()
        if ($studioProcess.HasExited) { throw "$($studioService.Name) exited ($($studioProcess.ExitCode)); see $studioErr" }
        try {
            $studioResponse = Invoke-WebRequest -UseBasicParsing -Uri $studioService.Url -TimeoutSec 2
            if ($studioResponse.StatusCode -eq 200) { $studioReady = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $studioReady) { throw "$($studioService.Name) is not ready; process $($studioProcess.Id), logs: $studioErr" }
    Write-Output "$($studioService.Name): ready, PID $($studioProcess.Id), stdout $studioOut, stderr $studioErr"
}
