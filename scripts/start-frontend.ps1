$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$frontendDir = Join-Path $projectRoot "frontend"
$frontendPort = if ($env:RAGENT_FRONTEND_PORT) { [int]$env:RAGENT_FRONTEND_PORT } else { 5173 }

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

if (!(Test-PortAvailable $frontendPort)) {
    Write-Host "Port $frontendPort is occupied. Run scripts\\stop-ragent.cmd first." -ForegroundColor Yellow
}

Set-Location -Path $frontendDir
npm run dev -- --port $frontendPort --strictPort
