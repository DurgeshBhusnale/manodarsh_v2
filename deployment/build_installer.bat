@echo off
REM SATHI - Mental Health System - Professional Installer Builder
REM Windows Batch Script
REM Version: 1.0

title SATHI - Building Professional Installer
echo ============================================================
echo    SATHI - MENTAL HEALTH SYSTEM - BUILD INSTALLER
echo    Version 1.0
echo ============================================================
echo.

REM Step 1: Clean previous builds
echo [1/5] Cleaning previous build...
if exist package rmdir /s /q package
if exist output rmdir /s /q output
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build
mkdir package
mkdir output
echo    Done

REM Step 2: Build portable package
echo.
echo [2/5] Building portable package...
echo    This will download Python, install packages (10-15 mins)
echo    NOTE: MySQL is NOT included (must be pre-installed)
python build_package.py
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Package build failed!
    pause
    exit /b 1
)

REM Step 3: Build frontend
echo.
echo [3/5] Building React frontend...
cd ..\frontend
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Frontend build failed!
    cd ..\deployment
    pause
    exit /b 1
)
cd ..\deployment
echo    Done

REM Step 4: Copy frontend to package
echo.
echo [4/5] Copying frontend to package...
if exist package\app\frontend\build rmdir /s /q package\app\frontend\build
xcopy /E /I /Y ..\frontend\build package\app\frontend\build > nul
echo    Done

REM Step 5: Create launcher executable
echo.
echo [5/5] Creating SATHI.exe launcher...
pyinstaller SATHI.spec --clean
if %errorlevel% neq 0 (
    echo.
    echo ERROR: PyInstaller failed!
    echo Make sure PyInstaller is installed: pip install pyinstaller
    pause
    exit /b 1
)

copy dist\SATHI.exe package\SATHI.exe
echo    Done

echo.
echo ============================================================
echo ✅ BUILD COMPLETE!
echo ============================================================
echo.
echo Package location: package\
echo Launcher: package\SATHI.exe
echo Package size (approx): ~750 MB
echo.
echo Next Steps:
echo   1. Test the package manually (see below)
echo   2. Create installer with Inno Setup (if available):
echo      "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
echo.
echo Manual Testing:
echo   • Ensure MySQL 8.0 is installed and running
echo   • cd package
echo   • SATHI.exe
echo.
echo For CRPF Deployment:
echo   • Target PC must have MySQL 8.0 installed
echo   • Run SATHI_Installer.exe on target PC
echo   • Desktop shortcut will be created
echo.
pause
