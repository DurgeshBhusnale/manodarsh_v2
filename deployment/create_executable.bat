REM CRPF Mental Health System - Quick Start
REM This creates a standalone executable for easy distribution

@echo off
title Creating CRPF System Executable
echo ============================================================
echo Creating Standalone Executable for CRPF System
echo ============================================================
echo.

REM Check if PyInstaller is installed
pip show pyinstaller >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing PyInstaller...
    pip install pyinstaller
)

echo Creating executable...
cd /d "%~dp0"

REM Create the executable with SATHI PNG logo (best quality)
pyinstaller --onefile --windowed --name="CRPF_Mental_Health_System" --icon=sathi_logo.png crpf_launcher.py

if exist "dist\CRPF_Mental_Health_System.exe" (
    echo ✅ Executable created successfully!
    echo Location: dist\CRPF_Mental_Health_System.exe
    
    REM Copy to main directory for easy access
    copy "dist\CRPF_Mental_Health_System.exe" "..\CRPF_Mental_Health_System.exe"
    
    echo.
    echo 📋 Deployment Package Ready:
    echo   • CRPF_Mental_Health_System.exe (main executable)
    echo   • backend\ (Flask application)
    echo   • frontend\ (React application)  
    echo   • deployment\ (configuration files)
    echo.
    echo 🚀 For CRPF Deployment:
    echo   1. Copy entire project folder to CRPF computer
    echo   2. Run deployment\install.bat as Administrator
    echo   3. Double-click CRPF_Mental_Health_System.exe to use
    
) else (
    echo ❌ Failed to create executable
    echo Check for errors above
)

echo.
pause
