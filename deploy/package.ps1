Write-Host ""
Write-Host "=== KBHFILMS Package Builder ==="

$time = Get-Date -Format "yyyy-MM-dd-HHmm"
$zip = ".\deploy\packages\$time.zip"

if (Test-Path $zip) {
    Remove-Item $zip -Force
}

$sevenZip = "C:\Program Files\7-Zip\7z.exe"

Push-Location ".\deploy\staging"

& $sevenZip a -tzip "..\packages\$time.zip" * -mx=5

$exitCode = $LASTEXITCODE

Pop-Location

if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "Package creation failed." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Package created:"
Write-Host $zip -ForegroundColor Green