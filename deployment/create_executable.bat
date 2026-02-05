REM SATHI - Mental Health System - Create Executable
REM This creates a standalone executable for distribution

@echo off
title Creating SATHI Executable
echo ============================================================
echo Creating Standalone Executable for SATHI
echo ============================================================
echo.

REM Check if PyInstaller is installed
pip show pyinstaller >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing PyInstaller...
    pip install pyinstaller
)

echo Creating executable from SATHI.spec...
cd /d "%~dp0"

REM Use the SATHI.spec file for consistent builds
pyinstaller SATHI.spec --clean

if exist "dist\SATHI.exe" (
    echo.
    echo ============================================================
    echo ✅ SATHI.exe created successfully!
    echo ============================================================
    echo Location: dist\SATHI.exe
    echo Size: 
    dir dist\SATHI.exe | find "SATHI.exe"
    
    echo.
    echo 📋 Next Steps:
    echo   1. Copy dist\SATHI.exe to package\ folder
    echo   2. Run build_installer.bat to create SATHI_Installer.exe
    echo.
    echo 🚀 For CRPF Deployment:
    echo   • Requires MySQL 8.0 installed on target PC
    echo   • Run SATHI_Installer.exe on target PC
    echo   • Desktop shortcut "SATHI" will be created
    
) else (
    echo.
    echo ============================================================
    echo ❌ Failed to create executable
    echo ============================================================
    echo Check for errors above
)

echo.
pause
