# GGRD website bootstrap and publish helper
# Creates/uses GitHub repo and pushes current project files without regenerating docs.

param(
  [string]$RepoName = "GGRD_Website",
  [string]$RepoVisibility = "public",
  [string]$RepoDescription = "Giggle Reloaded - Official BSC Website",
  [string]$CommitMessage = "Update website to BSC mainnet docs"
)

$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectPath

Write-Host "[GGRD] Project path: $ProjectPath" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Git is required but not found." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path ".git")) {
  git init
  git branch -M main
}

git add .
$hasChanges = (git status --porcelain)
if ($hasChanges) {
  git commit -m "$CommitMessage"
} else {
  Write-Host "[GGRD] No local changes to commit." -ForegroundColor Yellow
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "GitHub CLI not found. Set remote manually and run: git push origin main" -ForegroundColor Yellow
  exit 0
}

$auth = gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Please login first: gh auth login" -ForegroundColor Yellow
  exit 1
}

$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
  gh repo create $RepoName --$RepoVisibility --description "$RepoDescription" --source=. --remote=origin
}

git push origin main
if ($LASTEXITCODE -eq 0) {
  Write-Host "[GGRD] Push completed." -ForegroundColor Green
  Write-Host "[GGRD] Configure Pages in repository settings if needed." -ForegroundColor Green
}
