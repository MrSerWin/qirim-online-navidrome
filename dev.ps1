# Start Navidrome in development mode (Windows)
# Equivalent of 'make dev' - runs frontend and backend with hot-reload

# Load .env if exists
if (Test-Path .env) {
    Write-Host "Loading environment variables from .env file"
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

$env:ND_ENABLEINSIGHTSCOLLECTOR = "false"

Write-Host "Starting Navidrome in development mode..." -ForegroundColor Green
Write-Host "  Frontend: http://localhost:4533 (via Vite proxy)" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop both processes" -ForegroundColor Yellow
Write-Host ""

# Start frontend (React dev server)
$jsJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location ui
    npm start 2>&1
}

# Start backend (Go with reflex hot-reload)
$goJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    # Load env vars in job context too
    if (Test-Path .env) {
        Get-Content .env | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
            }
        }
    }
    $env:ND_ENABLEINSIGHTSCOLLECTOR = "false"
    go run -tags netgo . 2>&1
}

try {
    # Stream output from both jobs
    while ($true) {
        $jsOutput = Receive-Job -Job $jsJob 2>&1
        $goOutput = Receive-Job -Job $goJob 2>&1

        foreach ($line in $jsOutput) {
            Write-Host "[JS] $line" -ForegroundColor Blue
        }
        foreach ($line in $goOutput) {
            Write-Host "[GO] $line" -ForegroundColor Green
        }

        # Check if both jobs have stopped
        if ($jsJob.State -ne 'Running' -and $goJob.State -ne 'Running') {
            break
        }

        Start-Sleep -Milliseconds 200
    }
}
finally {
    Write-Host "`nStopping development servers..." -ForegroundColor Yellow
    Stop-Job -Job $jsJob, $goJob -ErrorAction SilentlyContinue
    Remove-Job -Job $jsJob, $goJob -Force -ErrorAction SilentlyContinue
    Write-Host "Done." -ForegroundColor Green
}
