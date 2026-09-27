Write-Host ""

Write-Host "=== KBHFILMS Deployment Prepare ==="

$staging = ".\deploy\staging"

if (Test-Path $staging) {

    Remove-Item "$staging\*" -Recurse -Force -ErrorAction SilentlyContinue

}

New-Item -ItemType Directory -Force -Path "$staging\assets" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\css" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\functions" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\js" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\lib" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\pages" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\scripts" | Out-Null

# Assets (EXCLUDE Music)
Copy-Item assets\icons  "$staging\assets" -Recurse -Force
Copy-Item assets\images "$staging\assets" -Recurse -Force
Copy-Item assets\sounds "$staging\assets" -Recurse -Force

Copy-Item css\*         "$staging\css"         -Recurse -Force
Copy-Item functions\*   "$staging\functions"   -Recurse -Force
Copy-Item js\*          "$staging\js"          -Recurse -Force
Copy-Item lib\*         "$staging\lib"         -Recurse -Force
Copy-Item pages\*       "$staging\pages"       -Recurse -Force
Copy-Item scripts\*     "$staging\scripts"     -Recurse -Force

Copy-Item index.html "$staging" -Force
Copy-Item login.html "$staging" -Force
Copy-Item manifest.json "$staging" -Force
Copy-Item package.json "$staging" -Force
Copy-Item server.js "$staging" -Force
Copy-Item service-worker.js "$staging" -Force

Write-Host ""

Write-Host "Staging package ready." -ForegroundColor Green