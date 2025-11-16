# ============================================================
# GGRD Website - Auto Deploy to GitHub
# ============================================================
# Skrypt automatycznie tworzy repozytorium GitHub i pushuje kod
# Autor: GGRD Team
# Data: 2024
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GGRD - GitHub Auto Deploy Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Konfiguracja - ZMIEN TE WARTOSCI!
# ============================================================
$GITHUB_USERNAME = "Giggle-GGRD"               # Twoja nazwa uzytkownika GitHub
$REPO_NAME = "GGRD_Website"                # Nazwa repozytorium
$REPO_DESCRIPTION = "Giggle Reloaded - Official Website | Fair Launch Memecoin on Solana"
$REPO_VISIBILITY = "public"                # "public" lub "private"
$PROJECT_PATH = "C:\APLIKACJE\GGRD_Website"

# ============================================================
# KROK 1: Sprawdzenie wymagan
# ============================================================

Write-Host "[1/7] Sprawdzanie wymagan..." -ForegroundColor Yellow

# Sprawdz Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "BLAD: Git nie jest zainstalowany!" -ForegroundColor Red
    Write-Host "Pobierz Git z: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}
Write-Host "Git zainstalowany: $(git --version)" -ForegroundColor Green

# Sprawdz GitHub CLI (opcjonalne, ale polecane)
$useGitHubCLI = $false
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "GitHub CLI zainstalowane: $(gh --version | Select-Object -First 1)" -ForegroundColor Green
    $useGitHubCLI = $true
} else {
    Write-Host "GitHub CLI nie jest zainstalowane (opcjonalne)" -ForegroundColor Yellow
    Write-Host "Pobierz z: https://cli.github.com/" -ForegroundColor Cyan
}

Write-Host ""

# ============================================================
# KROK 2: Przejdz do folderu projektu
# ============================================================

Write-Host "[2/7] Przechodzenie do folderu projektu..." -ForegroundColor Yellow

if (-not (Test-Path $PROJECT_PATH)) {
    Write-Host "BLAD: Folder projektu nie istnieje: $PROJECT_PATH" -ForegroundColor Red
    exit 1
}

Set-Location $PROJECT_PATH
Write-Host "Folder projektu: $PROJECT_PATH" -ForegroundColor Green
Write-Host ""

# ============================================================
# KROK 3: Inicjalizacja Git (jesli nie istnieje)
# ============================================================

Write-Host "[3/7] Inicjalizacja Git..." -ForegroundColor Yellow

if (-not (Test-Path ".git")) {
    git init
    Write-Host "Git zainicjalizowany" -ForegroundColor Green
} else {
    Write-Host "Git juz zainicjalizowany" -ForegroundColor Green
}

# Ustaw glowna galaz na 'main'
git branch -M main 2>$null
Write-Host ""

# ============================================================
# KROK 4: Tworzenie .gitignore
# ============================================================

Write-Host "[4/7] Tworzenie .gitignore..." -ForegroundColor Yellow

$gitignoreContent = @'
# System Files
.DS_Store
Thumbs.db
desktop.ini

# Editors
.vscode/
.idea/
*.swp
*.swo
*~

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local

# Build outputs
dist/
build/

# Dependencies
node_modules/

# Temporary files
*.tmp
*.temp
'@

$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8 -Force
Write-Host ".gitignore utworzony" -ForegroundColor Green
Write-Host ""

# ============================================================
# KROK 5: Tworzenie README.md
# ============================================================

Write-Host "[5/7] Tworzenie README.md..." -ForegroundColor Yellow

$readmeContent = @'
# GGRD - Giggle Reloaded

**The Robin Hood of Solana** - Fair Launch Memecoin with Charitable Impact

## About GGRD

Giggle Reloaded ($GGRD) is a fair-launch Solana memecoin with a fixed supply of 1,000,000 tokens, designed to combine meme-coin speculation with transparent, on-chain charity supporting Ukrainian war victims.

### Key Features

- Fair Launch via Meteora Dynamic Bonding Curve
- Zero Tax - No buy/sell tax, no hidden fees
- 10% for Charity - Supporting Ukrainian children with cancer
- Multisig Security - 3/4 Squads multisig control
- Transparent Tokenomics - Fully documented and verifiable

## Tokenomics

| Allocation | Amount | Percentage |
|------------|--------|------------|
| DBC Launch | 400,000 GGRD | 40% |
| Charity Treasury | 100,000 GGRD | 10% |
| LP Policy | 100,000 GGRD | 10% |
| Community | 70,000 GGRD | 7% |
| Team (Vested) | 70,000 GGRD | 7% |
| Marketing | 80,000 GGRD | 8% |
| Treasury Reserve | 180,000 GGRD | 18% |

**Total Supply:** 1,000,000 GGRD (Fixed, No Inflation)

## Official Links

- Website: https://ggrd.me
- Twitter: https://twitter.com/ContactGiggle
- Telegram: https://t.me/GGRDchat
- Announcements: https://t.me/GGRDofficial
- Whitepaper: https://ggrd.me/GGRD_Whitepaper_EN.pdf

## Charity Partner

**Tabletochki Charity Foundation** - Supporting Ukrainian children with cancer and families affected by war since 2012.

- Website: https://tabletochki.org/
- Verified crypto donations accepted

## Security

- **Mint Authority:** Revoked after initial mint
- **Freeze Authority:** None
- **Multisig Control:** All treasuries controlled by 3/4 Squads multisigs
- **No Presale:** Fair launch only via DBC
- **No VC Allocation:** 100% community distribution

## Disclaimer

GGRD is a memecoin with **no intrinsic value or expectation of financial return**. This is a high-risk investment. Only invest what you can afford to lose. Always do your own research (DYOR).

## License

This project is open source. See LICENSE file for details.

---

**Built by the GGRD community**

*From the people, for the people.*
'@

$readmeContent | Out-File -FilePath "README.md" -Encoding UTF8 -Force
Write-Host "README.md utworzony" -ForegroundColor Green
Write-Host ""

# ============================================================
# KROK 6: Dodanie i commit plikow
# ============================================================

Write-Host "[6/7] Dodawanie i commitowanie plikow..." -ForegroundColor Yellow

# Usun poprzedni remote jesli istnieje
git remote remove origin 2>$null

# Dodaj wszystkie pliki
git add .

# Sprawdz status
Write-Host ""
Write-Host "Pliki do commitowania:" -ForegroundColor Cyan
git status --short

# Commit
$commitMessage = "Initial commit: GGRD Website - Fair Launch Memecoin on Solana"
git commit -m "$commitMessage"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Commit pomyslny" -ForegroundColor Green
} else {
    Write-Host "Brak zmian do commitowania" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================
# KROK 7: Tworzenie repozytorium GitHub i push
# ============================================================

Write-Host "[7/7] Tworzenie repozytorium GitHub..." -ForegroundColor Yellow

if ($useGitHubCLI) {
    # Opcja A: GitHub CLI (automatyczne)
    Write-Host "Uzywam GitHub CLI..." -ForegroundColor Cyan
    
    # Sprawdz czy uzytkownik jest zalogowany
    $ghAuthStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Nie jestes zalogowany do GitHub CLI!" -ForegroundColor Red
        Write-Host "Zaloguj sie uzywajac: gh auth login" -ForegroundColor Yellow
        exit 1
    }
    
    # Tworz repozytorium
    Write-Host "Tworzenie repozytorium: $REPO_NAME..." -ForegroundColor Cyan
    gh repo create $REPO_NAME --$REPO_VISIBILITY --description "$REPO_DESCRIPTION" --source=. --remote=origin --push
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Repozytorium utworzone i kod wypushowany!" -ForegroundColor Green
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  SUKCES!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "URL Repozytorium:" -ForegroundColor Cyan
        Write-Host "https://github.com/$GITHUB_USERNAME/$REPO_NAME" -ForegroundColor White
        Write-Host ""
        Write-Host "Nastepne kroki:" -ForegroundColor Yellow
        Write-Host "1. Przejdz do: https://github.com/$GITHUB_USERNAME/$REPO_NAME/settings/pages" -ForegroundColor White
        Write-Host "2. W 'Source' wybierz: main / (root)" -ForegroundColor White
        Write-Host "3. Dodaj custom domain: ggrd.me" -ForegroundColor White
        Write-Host "4. Ustaw DNS na Hostinger (patrz instrukcja)" -ForegroundColor White
    } else {
        Write-Host "Blad podczas tworzenia repozytorium!" -ForegroundColor Red
    }
    
} else {
    # Opcja B: Manualne instrukcje (bez GitHub CLI)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  INSTRUKCJE MANUALNE" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "GitHub CLI nie jest zainstalowane. Wykonaj nastepujace kroki:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Stworz nowe repozytorium na GitHub:" -ForegroundColor Yellow
    Write-Host "   Otworz: https://github.com/new" -ForegroundColor White
    Write-Host "   Repository name: $REPO_NAME" -ForegroundColor White
    Write-Host "   Description: $REPO_DESCRIPTION" -ForegroundColor White
    Write-Host "   Visibility: $REPO_VISIBILITY" -ForegroundColor White
    Write-Host "   NIE zaznaczaj 'Initialize with README'" -ForegroundColor Red
    Write-Host "   Kliknij 'Create repository'" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Skopiuj i wykonaj nastepujace komendy:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git" -ForegroundColor Cyan
    Write-Host "git push -u origin main" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Czy chcesz automatycznie dodac remote i push? (T/N): " -NoNewline -ForegroundColor Yellow
    $answer = Read-Host
    
    if ($answer -eq "T" -or $answer -eq "t" -or $answer -eq "Y" -or $answer -eq "y") {
        Write-Host ""
        Write-Host "Dodawanie remote origin..." -ForegroundColor Cyan
        git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
        
        Write-Host "Pushowanie do GitHub..." -ForegroundColor Cyan
        git push -u origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "  SUKCES!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "URL Repozytorium:" -ForegroundColor Cyan
            Write-Host "https://github.com/$GITHUB_USERNAME/$REPO_NAME" -ForegroundColor White
        } else {
            Write-Host ""
            Write-Host "Blad podczas push! Sprawdz czy:" -ForegroundColor Red
            Write-Host "- Repozytorium zostalo utworzone na GitHub" -ForegroundColor Yellow
            Write-Host "- Nazwa uzytkownika jest poprawna: $GITHUB_USERNAME" -ForegroundColor Yellow
            Write-Host "- Masz uprawnienia do tego repozytorium" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Skrypt zakonczony" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Pauza, zeby zobaczyc wyniki
Read-Host "Nacisnij Enter, aby zakonczyc"
