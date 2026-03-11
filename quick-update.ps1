# Quick commit and push helper for GGRD website
param(
  [string]$Message = "Update website content"
)

$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectPath

Write-Host "[GGRD] Project path: $ProjectPath" -ForegroundColor Cyan
Write-Host "[GGRD] Git status:" -ForegroundColor Yellow
git status --short

Write-Host ""
$answer = Read-Host "Commit and push these changes? (Y/N)"
if ($answer -notin @('Y','y','T','t')) {
  Write-Host "Cancelled." -ForegroundColor Yellow
  exit 0
}

Write-Host "[GGRD] git add ." -ForegroundColor Cyan
git add .

Write-Host "[GGRD] git commit" -ForegroundColor Cyan
git commit -m "$Message"

Write-Host "[GGRD] git push origin main" -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
  Write-Host "Push completed." -ForegroundColor Green
  Write-Host "Website URL: https://ggrd.me" -ForegroundColor Green
} else {
  Write-Host "Push failed." -ForegroundColor Red
  exit 1
}
