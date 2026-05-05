$ErrorActionPreference = "Stop"

$backendPort = if ($env:RAGENT_SERVER_PORT) { [int]$env:RAGENT_SERVER_PORT } else { 9090 }
$frontendPort = if ($env:RAGENT_FRONTEND_PORT) { [int]$env:RAGENT_FRONTEND_PORT } else { 5173 }

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
    if ($pids.Count -eq 0) {
        Write-Host "$name port $port is free." -ForegroundColor Green
        return
    }
    Write-Host "$name port $port occupied by PID(s): $($pids -join ', ')" -ForegroundColor Yellow
    foreach ($procId in $pids) {
        if ($procId -in 0, 4) { continue }
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host "Stopped PID $procId" -ForegroundColor Green
        } catch {
            Write-Host "Failed to stop PID ${procId}: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Stop-ByPort -port $backendPort -name "Backend"
Stop-ByPort -port $frontendPort -name "Frontend"
