@echo off
REM Clean all build artifacts
title Cleaning Build Artifacts

echo Cleaning build directories...

if exist package rmdir /s /q package
if exist output rmdir /s /q output
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build
if exist downloads rmdir /s /q downloads
if exist __pycache__ rmdir /s /q __pycache__

echo Cleaning Python cache...
del /s /q *.pyc 2>nul
del /s /q *.pyo 2>nul

echo.
echo ✅ Clean complete!
echo.
pause
