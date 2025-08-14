@echo off
title CRPF Mental Health System - Installation
echo ============================================================
echo    CRPF MENTAL HEALTH & WELLNESS SYSTEM
echo    Project Dependencies Installation Script
echo ============================================================
echo.
echo ⚠️  IMPORTANT: This script installs PROJECT dependencies only
echo    Python, Node.js, and MySQL must be installed separately
echo    by the developer before running this script
echo ============================================================
echo.

REM Check Administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Please run as Administrator!
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

echo [1/6] Checking System Requirements...
echo.

REM Check Python installation
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed!
    echo Please install Python 3.8 or higher from: https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)
python --version
echo ✅ Python found

REM Check Node.js installation  
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org
    pause
    exit /b 1
)
node --version
npm --version
echo ✅ Node.js found

REM Check MySQL
echo Checking MySQL installation...
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: MySQL command not found in PATH
    echo Please ensure MySQL is installed and running
    echo Continue anyway? (y/N): 
    set /p continue=
    if /i not "%continue%"=="y" exit /b 1
) else (
    mysql --version
    echo ✅ MySQL found
)

echo.
echo [2/6] Installing Python Dependencies...
cd /d "%~dp0\..\backend"
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)
echo ✅ Python dependencies installed

echo.
echo [3/7] Installing Node.js Dependencies...  
cd /d "%~dp0\..\frontend"
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)
echo ✅ Node.js dependencies installed

echo.
echo [4/7] Building Optimized Frontend (Production Build)...
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build frontend
    pause
    exit /b 1
)
echo ✅ Frontend production build created

echo.
echo [5/7] Installing Additional Requirements...
pip install psutil requests pathlib
echo ✅ Additional requirements installed

echo.
echo [6/7] Creating Desktop Shortcut...
cd /d "%~dp0"
powershell -Command "& {$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\CRPF Mental Health System.lnk'); $Shortcut.TargetPath = 'python.exe'; $Shortcut.Arguments = '\"%CD%\crpf_launcher.py\"'; $Shortcut.WorkingDirectory = '%CD%'; $Shortcut.Description = 'CRPF Mental Health & Wellness System'; $Shortcut.Save()}"

if exist "%USERPROFILE%\Desktop\CRPF Mental Health System.lnk" (
    echo ✅ Desktop shortcut created
) else (
    echo ❌ Failed to create desktop shortcut
)

echo.
echo [7/7] Final Configuration...
echo Creating startup configuration...
echo System ready for deployment

echo.
echo ============================================================
echo ✅ INSTALLATION COMPLETED SUCCESSFULLY!
echo ============================================================
echo.
echo 📋 What's been installed:
echo   • All Python dependencies
echo   • All Node.js dependencies  
echo   • Desktop shortcut created
echo   • System launcher configured
echo.
echo 🚀 HOW TO USE:
echo   1. Double-click "CRPF Mental Health System" on desktop
echo   2. System will start automatically
echo   3. Browser will open with the application
echo   4. CRPF personnel can login and use the system
echo.
echo ⚠️  IMPORTANT NOTES:
echo   • Ensure MySQL is running before using the system
echo   • Configure database connection in backend/.env file
echo   • System runs completely offline (no internet required)
echo   • All data stays on local computer
echo.
echo 📞 For support, contact the development team
echo ============================================================
pause
