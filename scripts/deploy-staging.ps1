<#
.SYNOPSIS
  Axiom Proof — Windows 11 Home & Docker Hub Staging Deployment Manager
.DESCRIPTION
  Deploys all 10 Axiom Proof modules and dependencies on Docker Desktop for Windows 11 Home,
  with automatic Supabase containerization, LAN IP support, and Docker Hub image pulling.
.EXAMPLE
  .\scripts\deploy-staging.ps1
  .\scripts\deploy-staging.ps1 -Build
  .\scripts\deploy-staging.ps1 -Registry "vikashkaruna"
  .\scripts\deploy-staging.ps1 -Down
#>

[CmdletBinding()]
param(
  [switch]$Build = $false,
  [switch]$Down = $false,
  [switch]$Restart = $false,
  [switch]$Status = $false,
  [string]$Registry = "",
  [string]$Logs = ""
)

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host "  AXIOM PROOF — Windows 11 Staging Deployment Platform" -ForegroundColor Magenta
Write-Host "  'Agents do the work. You approve. The proof is automatic.'" -ForegroundColor DarkGray
Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host ""

$envFile = "infra/docker/environments/.env.staging"
if (-not (Test-Path $envFile)) {
  Write-Host "[!] Staging configuration ($envFile) not found. Running setup..." -ForegroundColor Yellow
  & ".\scripts\setup-windows-staging.ps1"
}

# Read HOST_IP from .env.staging
$hostIP = "localhost"
if (Test-Path $envFile) {
  $match = Select-String -Path $envFile -Pattern "^HOST_IP=(.*)"
  if ($match) {
    $hostIP = $match.Matches[0].Groups[1].Value.Trim()
  }
}

# Base compose arguments
$composeFiles = @(
  "-f", "docker-compose.yml",
  "-f", "infra/docker/docker-compose.staging.yml"
)

# Handle Stop / Down
if ($Down) {
  Write-Host "Stopping and removing all staging containers..." -ForegroundColor Yellow
  docker compose $composeFiles --env-file $envFile down
  Write-Host "[OK] Staging containers stopped." -ForegroundColor Green
  exit 0
}

# Check if Supabase is already running on host port 55321
$supabaseLive = $false
try {
  $testConn = Test-NetConnection -ComputerName 127.0.0.1 -Port 55321 -WarningAction SilentlyContinue -InformationLevel Quiet
  if ($testConn) {
    $supabaseLive = $true
    Write-Host "[OK] Detected Supabase running on port 55321 (CLI/host instance)." -ForegroundColor Green
  }
} catch {
  $supabaseLive = $false
}

if (-not $supabaseLive) {
  Write-Host "[i] No host Supabase detected on port 55321." -ForegroundColor Cyan
  Write-Host "    Attaching turnkey containerized Supabase services (docker-compose.supabase.yml)..." -ForegroundColor Cyan
  $composeFiles += @("-f", "infra/docker/docker-compose.supabase.yml")
}

# Handle Logs
if ($Logs) {
  docker compose $composeFiles --env-file $envFile logs -f $Logs
  exit 0
}

# Set Registry environment variable if supplied
if ($Registry) {
  $env:DOCKER_REGISTRY = $Registry
  Write-Host "[i] Using Docker Hub registry: $Registry" -ForegroundColor Cyan
}

# Handle Restart
if ($Restart) {
  Write-Host "Restarting all staging services..." -ForegroundColor Yellow
  docker compose $composeFiles --env-file $envFile restart
  exit 0
}

# Build or Pull
if ($Build) {
  Write-Host "[Step 1/3] Building all Axiom Proof container images..." -ForegroundColor Yellow
  docker compose $composeFiles --env-file $envFile build
} elseif ($Registry) {
  Write-Host "[Step 1/3] Pulling images from Docker Hub ($Registry)..." -ForegroundColor Yellow
  docker compose $composeFiles --env-file $envFile pull
}

# Deploy
Write-Host "`n[Step 2/3] Launching Axiom Proof staging stack..." -ForegroundColor Yellow
docker compose $composeFiles --env-file $envFile up -d

# Health probes
Write-Host "`n[Step 3/3] Probing component health endpoints..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$endpoints = @(
  @{ Name = "Web Workbench";   Port = 3001; Path = "" },
  @{ Name = "Marketing Site";  Port = 3000; Path = "" },
  @{ Name = "BFF API Engine";  Port = 4000; Path = "/health" },
  @{ Name = "Agent Runtime";   Port = 8000; Path = "/health" },
  @{ Name = "Model Gateway";   Port = 8001; Path = "/health" },
  @{ Name = "Temporal UI";     Port = 8233; Path = "" }
)

Write-Host ""
Write-Host "  MODULE                   PORT   STATUS      LOCAL URL                    LAN ACCESS URL" -ForegroundColor Cyan
Write-Host "  ------------------------------------------------------------------------------------------------" -ForegroundColor DarkGray

foreach ($ep in $endpoints) {
  $url = "http://127.0.0.1:$($ep.Port)$($ep.Path)"
  $lanUrl = "http://${hostIP}:$($ep.Port)$($ep.Path)"
  $status = "STARTING"
  try {
    $resp = Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($resp.StatusCode -in @(200, 301, 302, 307, 308, 404)) {
      $status = "HEALTHY "
    }
  } catch {
    $status = "PENDING "
  }

  $color = if ($status -eq "HEALTHY ") { "Green" } else { "Yellow" }
  $modFormatted = $ep.Name.PadRight(24)
  $portFormatted = "$($ep.Port)".PadRight(6)
  Write-Host "  $modFormatted $portFormatted " -NoNewline
  Write-Host "$status  " -ForegroundColor $color -NoNewline
  Write-Host "$url".PadRight(28) -NoNewline
  Write-Host "$lanUrl" -ForegroundColor White
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  [OK] Axiom Proof Staging is Live on your Local Network!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  * Open Workbench:    http://${hostIP}:3001" -ForegroundColor Cyan
Write-Host "  * Onboard Org:       http://${hostIP}:3001/onboarding" -ForegroundColor Cyan
Write-Host "  * Approval Console:  http://${hostIP}:3001/approval" -ForegroundColor Cyan
Write-Host "  * Agent Fleet:       http://${hostIP}:3001/workbench" -ForegroundColor Cyan
Write-Host "  * Marketing / Scan:  http://${hostIP}:3000" -ForegroundColor Cyan
Write-Host "  * Temporal Engine:   http://${hostIP}:8233" -ForegroundColor Cyan
Write-Host ""
Write-Host "To execute the full dynamic end-to-end audit functional flow:" -ForegroundColor White
Write-Host "  .\scripts\run-staging-flow.ps1" -ForegroundColor Yellow
Write-Host ""
