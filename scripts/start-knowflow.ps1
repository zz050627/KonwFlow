$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

$backendPort = if ($env:KNOWFLOW_SERVER_PORT) { [int]$env:KNOWFLOW_SERVER_PORT } else { 9090 }
$frontendPort = if ($env:KNOWFLOW_FRONTEND_PORT) { [int]$env:KNOWFLOW_FRONTEND_PORT } else { 5173 }

$backendJar = Join-Path $projectRoot "backend\bootstrap\target\bootstrap-0.0.1-SNAPSHOT.jar"
$frontendDir = Join-Path $projectRoot "frontend"
$tmpDir = Join-Path $projectRoot "tmp"
$logOut = Join-Path $tmpDir "backend-run.log"
$logErr = Join-Path $tmpDir "backend-run.err.log"
$frontendLogOut = Join-Path $tmpDir "frontend-run.log"
$frontendLogErr = Join-Path $tmpDir "frontend-run.err.log"

Write-Host "Starting KnowFlow..." -ForegroundColor Cyan

if (!(Test-Path $tmpDir)) {
    New-Item -ItemType Directory -Path $tmpDir | Out-Null
}

function Test-PortAvailable([int]$port) {
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

function Get-ListeningPids([int]$port) {
    $result = @()
    try {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique |
            ForEach-Object { if ($_ -gt 0) { $result += [int]$_ } }
    } catch {
    }
    if (($result | Measure-Object).Count -eq 0) {
        netstat -ano -p tcp | ForEach-Object {
            $line = $_.Trim()
            if ($line -notmatch "^TCP") { return }
            $parts = $line -split "\s+"
            if ($parts.Count -lt 5) { return }
            $localAddress = $parts[1]
            $state = $parts[3]
            $pidText = $parts[4]
            if ($state -ne "LISTENING") { return }
            if ($localAddress -notmatch "[:\.]$port$") { return }
            $procId = 0
            if ([int]::TryParse($pidText, [ref]$procId) -and $procId -gt 0) {
                $result += $procId
            }
        }
    }
    return @($result | Sort-Object -Unique)
}

function Stop-ByPort([int]$port, [string]$name) {
    $pids = Get-ListeningPids $port
    if ($pids.Count -eq 0) { return }
    Write-Host "$name port $port is occupied, stopping process(es): $($pids -join ', ')" -ForegroundColor Yellow
    foreach ($procId in $pids) {
        if ($procId -in 0, 4) { continue }
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
        } catch {
            Write-Host "Failed to stop PID ${procId}: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Start-Sleep -Milliseconds 700
}

Stop-ByPort -port $backendPort -name "Backend"
Stop-ByPort -port $frontendPort -name "Frontend"

if (!(Test-PortAvailable $backendPort)) {
    Write-Host "Backend port $backendPort is still occupied, please release it manually." -ForegroundColor Red
    exit 1
}
if (!(Test-PortAvailable $frontendPort)) {
    Write-Host "Frontend port $frontendPort is still occupied, please release it manually." -ForegroundColor Red
    exit 1
}

if (!(Test-Path $backendJar)) {
    Write-Host "Backend jar not found: $backendJar" -ForegroundColor Red
    Write-Host "Run: cd backend && .\mvnw.cmd -pl bootstrap -am -DskipTests package" -ForegroundColor Yellow
    exit 1
}
if (!(Test-Path $frontendDir)) {
    Write-Host "Frontend directory not found: $frontendDir" -ForegroundColor Red
    exit 1
}

Remove-Item $logOut, $logErr, $frontendLogOut, $frontendLogErr -ErrorAction SilentlyContinue

$javaArgs = @(
    "-Xms256m",
    "-Xmx512m",
    "-Xss512k",
    "-jar",
    $backendJar,
    "--server.port=$backendPort"
)
$javaProc = Start-Process -FilePath java -ArgumentList $javaArgs -RedirectStandardOutput $logOut -RedirectStandardError $logErr -PassThru
Write-Host "Backend PID: $($javaProc.Id)" -ForegroundColor Green

Write-Host "Waiting backend on $backendPort..." -ForegroundColor Yellow
$backendReady = $false
for ($i = 0; $i -lt 60; $i++) {
    if ($javaProc.HasExited) {
        Write-Host "Backend exited. See logs: $logOut / $logErr" -ForegroundColor Red
        exit 1
    }
    if (Test-NetConnection localhost -Port $backendPort -InformationLevel Quiet -WarningAction SilentlyContinue) {
        Write-Host "Backend ready: http://localhost:$backendPort/api/knowflow" -ForegroundColor Green
        $backendReady = $true
        break
    }
    Start-Sleep -Seconds 1
}
if (!$backendReady) {
    Write-Host "Backend not reachable on $backendPort. See logs: $logOut / $logErr" -ForegroundColor Red
    exit 1
}

if (!(Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Start-Process -FilePath npm.cmd -ArgumentList @("install") -WorkingDirectory $frontendDir -Wait
}

$env:VITE_PROXY_TARGET = "http://localhost:$backendPort"
Write-Host "Starting frontend on $frontendPort..." -ForegroundColor Yellow
$frontendProc = Start-Process -FilePath npm.cmd -ArgumentList @("run", "dev", "--", "--port", "$frontendPort", "--strictPort") -WorkingDirectory $frontendDir -RedirectStandardOutput $frontendLogOut -RedirectStandardError $frontendLogErr -PassThru
Write-Host "Frontend PID: $($frontendProc.Id)" -ForegroundColor Green

$frontendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    if ($frontendProc.HasExited) {
        Write-Host "Frontend exited. See logs: $frontendLogOut / $frontendLogErr" -ForegroundColor Red
        exit 1
    }
    if (Test-NetConnection localhost -Port $frontendPort -InformationLevel Quiet -WarningAction SilentlyContinue) {
        $frontendReady = $true
        break
    }
    Start-Sleep -Seconds 1
}
if (!$frontendReady) {
    Write-Host "Frontend not reachable on $frontendPort. See logs: $frontendLogOut / $frontendLogErr" -ForegroundColor Red
    exit 1
}

Write-Host "Frontend: http://localhost:$frontendPort/" -ForegroundColor Green
Start-Process "http://localhost:$frontendPort/"
