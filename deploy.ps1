Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       STARTING QUICK DEPLOYMENT        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Prepare
Write-Host "`n[1/3] Running prepare.ps1..." -ForegroundColor Yellow
& ".\deploy\prepare.ps1"

# 2. Package
Write-Host "`n[2/3] Running package.ps1..." -ForegroundColor Yellow
& ".\deploy\package.ps1"

# 3. Send
Write-Host "`n[3/3] Running send.ps1..." -ForegroundColor Yellow
& ".\deploy\send.ps1"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "    DEPLOYMENT COMPLETED SUCCESSFULLY!   " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green