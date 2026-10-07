<#
.SYNOPSIS
  GuidedReel desktop installer for Windows (no developer tools needed).

.DESCRIPTION
  Downloads the latest installer from the project's GitHub release and runs it.

    irm https://github.com/prlama55/GuidedReel/raw/main/scripts/install.ps1 | iex

  With options (download first, then run):

    irm https://github.com/prlama55/GuidedReel/raw/main/scripts/install.ps1 -OutFile install.ps1
    .\install.ps1 -Version v0.2.0 -Silent

.PARAMETER Version   Release tag to install (default: latest).
.PARAMETER File      Install from a downloaded .exe instead of fetching it.
.PARAMETER Silent    Run the installer without the wizard (per-user install).
.PARAMETER NoOpen    Do not launch the app after a silent install.
#>
[CmdletBinding()]
param(
  [string]$Version = $(if ($env:GUIDEDREEL_VERSION) { $env:GUIDEDREEL_VERSION } else { 'latest' }),
  [string]$File = '',
  [switch]$Silent,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'
$AppName = 'GuidedReel'
$RepoUrl = if ($env:GUIDEDREEL_REPO_URL) { $env:GUIDEDREEL_REPO_URL } else { 'https://github.com/prlama55/GuidedReel' }
$OwnerRepo = $RepoUrl -replace '^https://github\.com/', '' -replace '/$', ''

function Write-Step([string]$Message) { Write-Host "==> $Message" -ForegroundColor Cyan }

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

$arch = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
$archPattern = switch ($arch) {
  'ARM64' { 'arm64' }
  default { 'x64|x86_64|amd64' }
}
Write-Step "$AppName installer for Windows ($arch)"

if ($File) {
  if (-not (Test-Path $File)) { throw "File not found: $File" }
  $installer = (Resolve-Path $File).Path
} else {
  $api = if ($Version -eq 'latest') {
    "https://api.github.com/repos/$OwnerRepo/releases/latest"
  } else {
    $tag = if ($Version.StartsWith('v')) { $Version } else { "v$Version" }
    "https://api.github.com/repos/$OwnerRepo/releases/tags/$tag"
  }
  Write-Step "Looking up release ($Version) from $RepoUrl"
  try {
    $release = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = "$AppName-installer" }
  } catch {
    throw "No published release found ($api). Releases: $RepoUrl/releases"
  }
  $exes = @($release.assets | Where-Object { $_.name -match '\.exe$' })
  $asset = $exes | Where-Object { $_.name -match "($archPattern)" } | Select-Object -First 1
  if (-not $asset -and $arch -ne 'ARM64') { $asset = $exes | Where-Object { $_.name -notmatch 'arm64' } | Select-Object -First 1 }
  if (-not $asset) { throw "No Windows installer in this release. Available files: $RepoUrl/releases" }

  $installer = Join-Path $env:TEMP $asset.name
  Write-Step "Downloading $($asset.name)"
  $previous = $ProgressPreference
  $ProgressPreference = 'SilentlyContinue'
  try { Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installer -UseBasicParsing } finally { $ProgressPreference = $previous }
}

if ($Silent) {
  Write-Step 'Installing silently'
  $proc = Start-Process -FilePath $installer -ArgumentList '/S' -Wait -PassThru
  if ($proc.ExitCode -ne 0) { throw "Installer exited with code $($proc.ExitCode)" }
  $exe = Join-Path $env:LOCALAPPDATA "Programs\$AppName\$AppName.exe"
  Write-Step "Installed $AppName"
  if (-not $NoOpen -and (Test-Path $exe)) { Start-Process -FilePath $exe }
} else {
  Write-Step 'Starting the installer'
  Write-Host 'Beta builds are not code-signed. If Windows shows "Windows protected your PC",' -ForegroundColor Yellow
  Write-Host 'choose "More info", then "Run anyway". The wizard can launch the app when it finishes.' -ForegroundColor Yellow
  $proc = Start-Process -FilePath $installer -Wait -PassThru
  if ($proc.ExitCode -ne 0) { throw "Installer exited with code $($proc.ExitCode)" }
  Write-Step "Installed $AppName"
}

Write-Host ''
Write-Host "Done. User guide: $RepoUrl/blob/main/docs/user-guide/README.md"
