<#
.SYNOPSIS
  Axiom Proof — Windows 11 Home Staging Environment Setup & Prerequisites Helper
.DESCRIPTION
  Validates Docker Desktop with WSL2 backend, detects local network IP, opens Windows Firewall
  ports for LAN access, and configures .env.staging.
.EXAMPLE
  .\scripts\setup-windows-staging.ps1
#>

[CmdletBinding()]
param(
  [switch]$SkipFirewall = $false,
  [string]$OverrideIP = ""
)

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  Axiom Proof — Windows 11 Staging Environment Setup" -ForegroundColor Cyan
Write-Host "  'Agents do the work. You approve. The proof is automatic.'" -ForegroundColor DarkGray
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check WSL2 and Docker Desktop
Write-Host "[Step 1/4] Checking Docker Desktop & WSL2 Engine..." -ForegroundColor Yellow

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
  Write-Host "  [X] Docker CLI not found. Please install Docker Desktop for Windows:" -ForegroundColor Red
  Write-Host "      https://docs.docker.com/desktop/setup/install/windows-install/" -ForegroundColor White
  exit 1
}

try {
  $dockerInfo = docker info 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  [!] Docker daemon is not running. Attempting to start Docker Desktop..." -ForegroundColor Yellow
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
    $timeout = 60
    $elapsed = 0
    while ($elapsed -lt $timeout) {
      Start-Sleep -Seconds 3
      $elapsed += 3
      docker info >$null 2>&1
      if ($LASTEXITCODE -eq 0) { break }
      Write-Host "      Waiting for Docker daemon to respond... (${elapsed}s/${timeout}s)" -ForegroundColor DarkGray
    }
  }
  Write-Host "  [OK] Docker Desktop is running and responsive." -ForegroundColor Green
} catch {
  Write-Host "  [!] Could not connect to Docker daemon. Please ensure Docker Desktop is open." -ForegroundColor Red
  exit 1
}

# 2. Detect Local Network IPv4 Address
Write-Host "`n[Step 2/4] Detecting Local Network IPv4 Address for LAN Staging..." -ForegroundColor Yellow

$detectedIP = ""
if ($OverrideIP) {
  $detectedIP = $OverrideIP
} else {
  $activeAdapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -notmatch "Loopback|vEthernet|VirtualBox|VMware|WSL" -and
    $_.IPAddress -notmatch "^(127\.|169\.254\.)"
  }
  if ($activeAdapters) {
    $detectedIP = ($activeAdapters | Select-Object -First 1).IPAddress
  }
}

if (-not $detectedIP) {
  $detectedIP = "192.168.1.11"
  Write-Host "  [!] Could not auto-detect adapter IP; defaulting to $detectedIP" -ForegroundColor Yellow
} else {
  Write-Host "  [OK] Detected Local LAN IP: $detectedIP" -ForegroundColor Green
}

# 3. Configure Windows Firewall for LAN access
Write-Host "`n[Step 3/4] Configuring Windows Firewall for LAN Access..." -ForegroundColor Yellow

$ports = @(3000, 3001, 4000, 8000, 8001, 8233, 55321, 55322, 55323)
$ruleName = "Axiom Proof Staging LAN Access"

if (-not $SkipFirewall) {
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if ($isAdmin) {
    try {
      $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
      if (-not $existingRule) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $ports -Protocol TCP -Action Allow -Profile Private,Domain >$null
        Write-Host "  [OK] Windows Firewall rules created for ports: $($ports -join ', ')" -ForegroundColor Green
      } else {
        Write-Host "  [OK] Windows Firewall rules already active for Axiom Proof ports." -ForegroundColor Green
      }
    } catch {
      Write-Host "  [!] Notice: Could not set firewall rules: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  } else {
    Write-Host "  [i] Non-admin PowerShell: To allow access from other devices on your WiFi/LAN," -ForegroundColor DarkGray
    Write-Host "      run this script once from an 'Administrator: PowerShell' terminal." -ForegroundColor DarkGray
  }
}

# 4. Generate / Update infra/docker/environments/.env.staging
Write-Host "`n[Step 4/4] Generating Staging Configuration with LAN IP ($detectedIP)..." -ForegroundColor Yellow

$envFile = "infra/docker/environments/.env.staging"
if (Test-Path $envFile) {
  $content = Get-Content $envFile -Raw
  $content = $content -replace "HOST_IP=.*", "HOST_IP=$detectedIP"
  $content = $content -replace "NEXT_PUBLIC_SUPABASE_URL=http://[^:]+:", "NEXT_PUBLIC_SUPABASE_URL=http://${detectedIP}:"
  $content = $content -replace "NEXT_PUBLIC_BFF_URL=http://[^:]+:", "NEXT_PUBLIC_BFF_URL=http://${detectedIP}:"
  $content = $content -replace "NEXT_PUBLIC_APP_URL=http://[^:]+:", "NEXT_PUBLIC_APP_URL=http://${detectedIP}:"
  $content = $content -replace "NEXT_PUBLIC_MARKETING_URL=http://[^:]+:", "NEXT_PUBLIC_MARKETING_URL=http://${detectedIP}:"
  Set-Content -Path $envFile -Value $content -NoNewline
  Write-Host "  [OK] Updated $envFile with LAN Host IP: $detectedIP" -ForegroundColor Green
} else {
  Write-Host "  [!] $envFile not found. Copying from example template..." -ForegroundColor Yellow
  Copy-Item "infra/docker/environments/.env.staging.example" $envFile
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  [OK] Windows 11 Staging Environment Ready!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "Next step: Run the deployment script:" -ForegroundColor White
Write-Host "  .\scripts\deploy-staging.ps1" -ForegroundColor Cyan
Write-Host ""
