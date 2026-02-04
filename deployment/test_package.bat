@echo off
REM Quick test of the built package
title Testing CRPF System Package

echo ============================================================
echo    CRPF SYSTEM - PACKAGE TEST
echo ============================================================
echo.

if not exist package\CRPF_System.exe (
    echo ERROR: Package not built yet!
    echo Run: build_installer.bat first
    pause
    exit /b 1
)

echo Testing package structure...
echo.

REM Check critical files
set ERROR=0

if not exist package\python\python.exe (
    echo ❌ Python not found
    set ERROR=1
) else (
    echo ✅ Python found
)

if not exist package\app\backend\app.py (
    echo ❌ Backend not found
    set ERROR=1
) else (
    echo ✅ Backend found
)

if not exist package\app\frontend\build\index.html (
    echo ❌ Frontend build not found
    set ERROR=1
) else (
    echo ✅ Frontend build found
)

if not exist package\CRPF_System.exe (
    echo ❌ Launcher not found
    set ERROR=1
) else (
    echo ✅ Launcher found
)

echo.
if %ERROR%==0 (
    echo ============================================================
    echo ✅ PACKAGE STRUCTURE OK
    echo ============================================================
    echo.
    echo You can now:
    echo   1. Test manually: cd package ^&^& CRPF_System.exe
    echo   2. Create installer: "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
    echo.
) else (
    echo ============================================================
    echo ❌ PACKAGE HAS ERRORS
    echo ============================================================
    echo.
    echo Fix errors and rebuild
    echo.
)

pause
