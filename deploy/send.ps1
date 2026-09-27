Write-Host ""
Write-Host "=== KBHFILMS SEND PACKAGE ==="

# Latest package
$package = Get-ChildItem ".\deploy\packages\*.zip" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if ($null -eq $package) {
    Write-Host "No deployment package found." -ForegroundColor Red
    exit
}

$packagePath = (Resolve-Path $package.FullName).Path

$phoneUser = "u0_a775"
$phoneIP   = "192.168.100.158"
$phonePort = 8022
$remoteDir = "/data/data/com.termux/files/home/deploy"

Write-Host ""
Write-Host "Uploading package..."
Write-Host $package.Name

scp -P $phonePort "$packagePath" "${phoneUser}@${phoneIP}:${remoteDir}/"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Upload failed." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Upload complete." -ForegroundColor Green

Write-Host ""
Write-Host "Starting remote deployment..."

ssh -p $phonePort "${phoneUser}@${phoneIP}" "~/deploy/deploy-phone.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Remote deployment failed." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "====================================="
Write-Host "Deployment completed successfully." -ForegroundColor Green
Write-Host "====================================="