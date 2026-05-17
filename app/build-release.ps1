# build-release.ps1
# Chay: .\build-release.ps1
# Build + ky + tao latest.json cho OTA updater

$keyFile = "$env:USERPROFILE\.tauri\myapp.key"
$nsisDir = "src-tauri\target\release\bundle\nsis"

if (-not (Test-Path $keyFile)) {
    Write-Error "Khong tim thay private key tai $keyFile"
    exit 1
}

$env:TAURI_SIGNING_PRIVATE_KEY          = (Get-Content $keyFile -Raw).Trim()
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""

Write-Host "OK: Da load private key" -ForegroundColor Green

# --- Doc version tu tauri.conf.json ---
$conf = Get-Content "src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
$version = $conf.version
Write-Host "OK: Version = $version" -ForegroundColor Green

# --- Build ---
Write-Host ">> Build Tauri app..." -ForegroundColor Cyan
pnpm tauri build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build that bai" -ForegroundColor Red
    exit 1
}

# --- Xac dinh file ---
$exeName  = "QuanLyCongViec_${version}_x64-setup.exe"
$zipName  = "QuanLyCongViec_${version}_x64-setup.nsis.zip"
$sigName  = "${zipName}.sig"
$exePath  = Join-Path $nsisDir $exeName
$zipPath  = Join-Path $nsisDir $zipName
$sigPath  = Join-Path $nsisDir $sigName

# --- Tao file .zip tu .exe ---
if (-not (Test-Path $zipPath)) {
    Write-Host ">> Tao $zipName..." -ForegroundColor Cyan
    Compress-Archive -Path $exePath -DestinationPath $zipPath -Force
}

# --- Xoa .sig cu neu co ---
Remove-Item $sigPath -ErrorAction SilentlyContinue

# --- Ky file .zip bang Tauri CLI Node addon ---
Write-Host ">> Ky $zipName..." -ForegroundColor Cyan
node sign-updater2.mjs

if (-not (Test-Path $sigPath)) {
    Write-Host "ERROR: Khong tao duoc file .sig" -ForegroundColor Red
    exit 1
}

# --- Doc signature ---
$signature = (Get-Content $sigPath -Raw).Trim()

# --- Tao latest.json ---
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$latestJson = @{
    version  = $version
    notes    = "Ban cap nhat phien ban $version"
    pub_date = $now
    platforms = @{
        "windows-x86_64" = @{
            signature = $signature
            url       = "https://github.com/in4SECxMinDandy/Task-management/releases/download/v${version}/${zipName}"
        }
    }
} | ConvertTo-Json -Depth 5

$latestPath = Join-Path $nsisDir "latest.json"
$latestJson | Set-Content $latestPath -Encoding UTF8

Write-Host ""
Write-Host "=== BUILD HOAN TAT ===" -ForegroundColor Green
Write-Host "Version: $version"
Write-Host ""
Write-Host "Upload len GitHub Release (tag v$version):" -ForegroundColor Yellow
Write-Host "  - $exePath"
Write-Host "  - $zipPath"
Write-Host "  - $sigPath"
Write-Host "  - $latestPath"
Write-Host ""
Write-Host "Endpoint OTA: https://github.com/in4SECxMinDandy/Task-management/releases/latest/download/latest.json"
