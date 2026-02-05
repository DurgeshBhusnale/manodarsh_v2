@echo off
REM CRPF Mental Health System - Create Executable
REM This creates a standalone executable for easy distribution
REM Can be run from GUI (double-click) or command line

title Creating CRPF SATHI Executable

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
REM Remove trailing backslash
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%
REM Get parent directory (project root)
for %%I in ("%SCRIPT_DIR%\..") do set PROJECT_ROOT=%%~fI

echo ============================================================
echo Creating Standalone Executable for SATHI System
echo ============================================================
echo.
echo Script location: %SCRIPT_DIR%
echo Project root: %PROJECT_ROOT%
echo.

REM Navigate to deployment directory
cd /d "%SCRIPT_DIR%"

REM Check if frontend build exists
if not exist "%PROJECT_ROOT%\frontend\build\index.html" (
    echo ================================================
    echo WARNING: Frontend build not found!
    echo ================================================
    echo.
    echo The production build is required for deployment.
    echo.
    echo Please run build_frontend.bat first, then try again.
    echo.
    echo Location expected: %PROJECT_ROOT%\frontend\build\
    echo.
    pause
    exit /b 1
)

echo ✅ Frontend build found
echo.

REM Check if PyInstaller is installed
echo Checking PyInstaller...
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo Installing PyInstaller...
    pip install pyinstaller
    if errorlevel 1 (
        echo ERROR: Failed to install PyInstaller
        echo Make sure Python and pip are installed and in PATH
        pause
        exit /b 1
    )
)

echo ✅ PyInstaller ready
echo.

REM Clean previous builds (optional)
if exist "build" (
    echo Cleaning previous build files...
    rmdir /s /q build
)
if exist "dist" (
    echo Cleaning previous dist files...
    rmdir /s /q dist
)

echo.
echo Creating executable using SATHI.spec...
echo This will take 30-60 seconds...
echo.

REM Force windowless mode with --noconsole flag (overrides spec if needed)
pyinstaller --clean --noconsole SATHI.spec
if errorlevel 1 (
    echo.
    echo ================================================
    echo ERROR: PyInstaller failed
    echo ================================================
    echo.
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================

if exist "dist\SATHI.exe" (
    echo ✅ Executable created successfully!
    echo ============================================================
    echo.
    echo 📦 Deployment Package Location: %SCRIPT_DIR%\dist\
    echo.
    echo Contents:
    echo   • SATHI.exe       (main executable - windowless)
    echo   • backend\        (Flask API server)
    echo   • frontend\       (React production build)
    echo   • _internal\      (Python runtime and dependencies)
    echo.
    echo 🚀 How to Test:
    echo   1. Open: %SCRIPT_DIR%\dist\
    echo   2. Double-click: SATHI.exe
    echo   3. Browser opens automatically (no terminal window)
    echo   4. Loading screen appears
    echo   5. Login page loads after 3-5 seconds
    echo.
    echo 📋 For CRPF Deployment:
    echo   1. Copy entire dist\ folder to target PC
    echo   2. Ensure MySQL is installed and running
    echo   3. Double-click SATHI.exe
    echo.
) else (
    echo ❌ Failed to create executable
    echo ============================================================
    echo.
    echo The executable was not created. Check errors above.
    echo.
    echo Common issues:
    echo   - Python not in PATH
    echo   - PyInstaller installation failed
    echo   - SATHI.spec file missing or invalid
    echo.
)

echo.
pause
