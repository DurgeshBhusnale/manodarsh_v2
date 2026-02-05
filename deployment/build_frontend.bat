@echo off
REM Build Frontend Production Bundle
REM This script creates the optimized production build for deployment
REM Can be run from GUI (double-click) or command line

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
REM Remove trailing backslash
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%
REM Get parent directory (project root)
for %%I in ("%SCRIPT_DIR%\..") do set PROJECT_ROOT=%%~fI

echo ================================================
echo Building SATHI Frontend Production Bundle
echo ================================================
echo.
echo Script location: %SCRIPT_DIR%
echo Project root: %PROJECT_ROOT%
echo.

REM Navigate to frontend folder
cd /d "%PROJECT_ROOT%\frontend"
if errorlevel 1 (
    echo ERROR: Cannot find frontend folder at %PROJECT_ROOT%\frontend
    pause
    exit /b 1
)

echo [1/3] Installing dependencies...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/3] Creating optimized production build...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to create build
    pause
    exit /b 1
)

echo.
echo [3/3] Build complete!
echo Build location: %PROJECT_ROOT%\frontend\build\
echo.

REM Return to deployment folder
cd /d "%SCRIPT_DIR%"

echo ================================================
echo SUCCESS: Production build ready for deployment
echo ================================================
echo.
echo Next steps:
echo 1. Run: create_executable.bat (in this folder)
echo 2. Test: dist\SATHI.exe (after creating executable)
echo.

pause
