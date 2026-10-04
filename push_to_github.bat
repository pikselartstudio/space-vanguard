@echo off
chcp 65001 >nul
echo ======================================================
echo    SPACE VANGUARD - GITHUB VE RENDER GUNCELLEME
echo ======================================================
echo.
echo Guncellemeler GitHub'a gonderiliyor...
cd /d "%~dp0"
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo [BASARILI] Guncellemeler GitHub'a aktarildi!
    echo Render otomatik olarak yeni surumu derleyip yayinlayacaktir.
) else (
    echo [HATA] Bir sorun olustu. Eger GitHub girisi istenirse ekrandaki adimlari takip edin.
)
echo.
pause
