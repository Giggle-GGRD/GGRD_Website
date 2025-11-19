# ============================================================
# GGRD Website - Quick Update & Push to GitHub
# ============================================================
# Szybki skrypt do pushowania zmian na GitHub
# ============================================================

param(
    [string]$Message = "Update website content"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GGRD - Quick Git Push" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Przejdz do folderu projektu
$PROJECT_PATH = "C:\APLIKACJE\GGRD_Website"
Set-Location $PROJECT_PATH

Write-Host "Folder: $PROJECT_PATH" -ForegroundColor Yellow
Write-Host ""

# Sprawdz zmiany
Write-Host "Sprawdzanie zmian..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "Czy chcesz commitowac i pushowac te zmiany? (T/N): " -NoNewline -ForegroundColor Yellow
$answer = Read-Host

if ($answer -eq "T" -or $answer -eq "t" -or $answer -eq "Y" -or $answer -eq "y") {
    
    # Dodaj wszystkie zmiany
    Write-Host ""
    Write-Host "Dodawanie plikow..." -ForegroundColor Cyan
    git add .
    
    # Commit
    Write-Host "Commitowanie..." -ForegroundColor Cyan
    git commit -m "$Message"
    
    # Push
    Write-Host "Pushowanie do GitHub..." -ForegroundColor Cyan
    git push origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  SUKCES - Zmiany wypushowane!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Sprawdz: https://github.com/giggle-ggrd/GGRD_Website" -ForegroundColor Cyan
        
        # Jesli GitHub Pages jest skonfigurowane
        Write-Host ""
        Write-Host "GitHub Pages zaktualizuje sie za ~1-2 minuty" -ForegroundColor Yellow
        Write-Host "URL: https://ggrd.me" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "Blad podczas push!" -ForegroundColor Red
    }
    
} else {
    Write-Host ""
    Write-Host "Anulowano" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Nacisnij Enter, aby zakonczyc"
