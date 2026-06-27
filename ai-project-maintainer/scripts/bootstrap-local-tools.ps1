param(
  [string[]]$Tools = @("gitleaks", "trivy", "squawk"),
  [string]$InstallDir = "$env:USERPROFILE\.codex\security-tools",
  [switch]$AddToPath
)

$ErrorActionPreference = "Stop"
$binDir = Join-Path $InstallDir "bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
$requestedTools = @()
foreach ($item in $Tools) {
  $requestedTools += ($item -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

function Write-Step($Message) {
  Write-Host "==> $Message"
}

function Test-Command($Name) {
  $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-Asset($Repo, [string[]]$Patterns) {
  $release = Invoke-RestMethod -Headers @{ "User-Agent" = "ai-project-maintainer" } -Uri "https://api.github.com/repos/$Repo/releases/latest"
  foreach ($pattern in $Patterns) {
    $asset = $release.assets | Where-Object { $_.name -match $pattern -and $_.name -match '\.zip$' } | Select-Object -First 1
    if ($asset) { return $asset }
  }
  throw "No Windows zip asset matched $($Patterns -join ', ') for $Repo"
}

function Install-FromGitHubZip($Name, $Repo, [string[]]$Patterns, $ExeName) {
  if (Test-Command $ExeName) {
    Write-Step "$Name already available on PATH"
    return
  }

  $asset = Get-Asset -Repo $Repo -Patterns $Patterns
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("$Name-" + [guid]::NewGuid())
  $zip = Join-Path $tmp $asset.name
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null

  Write-Step "Downloading $Name from $Repo ($($asset.name))"
  Invoke-WebRequest -Headers @{ "User-Agent" = "ai-project-maintainer" } -Uri $asset.browser_download_url -OutFile $zip
  Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force

  $exe = Get-ChildItem -Path $tmp -Recurse -File -Filter "$ExeName.exe" | Select-Object -First 1
  if (-not $exe) { throw "Downloaded $Name but could not find $ExeName.exe in archive" }

  Copy-Item -LiteralPath $exe.FullName -Destination (Join-Path $binDir "$ExeName.exe") -Force
  Write-Step "Installed $Name to $binDir"
}

function Install-WithUvTool($Name, $Package, $ExeName) {
  if (Test-Command $ExeName) {
    Write-Step "$Name already available on PATH"
    return
  }
  if (-not (Test-Command "uv")) {
    Write-Warning "uv is not installed; cannot install $Name locally. Install uv, Python, or Docker and rerun."
    return
  }
  Write-Step "Installing $Name with uv tool install $Package"
  & uv tool install $Package
  if ($LASTEXITCODE -ne 0) {
    throw "uv tool install $Package failed with exit code $LASTEXITCODE"
  }
}

foreach ($tool in $requestedTools) {
  try {
    switch ($tool.ToLowerInvariant()) {
      "gitleaks" {
        Install-FromGitHubZip -Name "gitleaks" -Repo "gitleaks/gitleaks" -Patterns @("windows.*x64", "windows.*64") -ExeName "gitleaks"
      }
      "trivy" {
        Install-FromGitHubZip -Name "trivy" -Repo "aquasecurity/trivy" -Patterns @("windows-64bit", "windows.*64") -ExeName "trivy"
      }
      "squawk" {
        Install-FromGitHubZip -Name "squawk" -Repo "sbdchd/squawk" -Patterns @("windows.*x86_64", "windows.*amd64", "windows.*64") -ExeName "squawk"
      }
      "semgrep" {
        Install-WithUvTool -Name "semgrep" -Package "semgrep" -ExeName "semgrep"
      }
      "checkov" {
        Install-WithUvTool -Name "checkov" -Package "checkov" -ExeName "checkov"
      }
      default {
        Write-Warning "Unknown local bootstrap tool '$tool'. Supported: gitleaks, trivy, squawk, semgrep, checkov."
      }
    }
  } catch {
    Write-Warning "Could not install ${tool}: $($_.Exception.Message)"
  }
}

if ($AddToPath) {
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  $parts = $current -split ';' | Where-Object { $_ }
  if ($parts -notcontains $binDir) {
    [Environment]::SetEnvironmentVariable("Path", ($parts + $binDir -join ';'), "User")
    Write-Step "Added $binDir to the user PATH. Restart terminals/Codex to pick it up."
  } else {
    Write-Step "$binDir is already in the user PATH"
  }
}

Write-Step "Installed tools:"
Get-ChildItem -File -LiteralPath $binDir | Select-Object Name,Length,LastWriteTime
