$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content "C:\Users\haqua\.tauri\myapp.key" -Raw)
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""

Write-Host "Building Tauri app 0.1.3 with built-in updater bundle generation..." -ForegroundColor Cyan
pnpm tauri build
