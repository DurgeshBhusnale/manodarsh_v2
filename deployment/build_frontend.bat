@echo off
REM Build Frontend Production Bundle
REM This script creates the optimized production build for deployment

echo ================================================
echo Building SATHI Frontend Production Bundle
echo ================================================
echo.

cd frontend

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
echo Build location: frontend\build\
echo.

cd ..

echo ================================================
echo SUCCESS: Production build ready for deployment
echo ================================================
echo.
echo Next steps:
echo 1. Run: deployment\create_executable.bat
echo 2. Test: deployment\dist\SATHI.exe
echo.

pause
