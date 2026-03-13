@echo off
REM ============================================================================
REM Project Update Script for Client Deployment
REM ============================================================================
REM This script automates the update workflow:
REM 1. Fetch and switch to the GitHub default branch, then pull latest changes
REM 2. Build frontend with npm
REM 3. Clean deployment artifacts
REM 4. Create executable
REM
REM Usage: Run this script from the project root directory
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo                    PROJECT UPDATE SCRIPT
echo ============================================================================
echo.

REM Store the script's directory as the project root
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

REM ============================================================================
REM Step 1: Git Fetch and Sync to Default Branch
REM ============================================================================
echo [Step 1/4] Syncing with default branch...
echo ----------------------------------------------------------------------------

REM Check if .git directory exists
if not exist ".git" (
    echo ERROR: Not a git repository. .git directory not found.
    echo Please run this script from the project root.
    goto :error
)

REM Fetch all commits and metadata
git fetch origin
if errorlevel 1 (
    echo ERROR: Failed to fetch from remote repository.
    goto :error
)

REM Update origin/HEAD and get default branch name
git remote set-head origin -a
for /f "tokens=2 delims=/" %%i in ('git symbolic-ref --short refs/remotes/origin/HEAD') do set DEFAULT_BRANCH=%%i

REM Switch and pull from default branch
git switch %DEFAULT_BRANCH%
git pull

echo SUCCESS: Synced with branch %DEFAULT_BRANCH%.
echo.

REM ============================================================================
REM Step 2: Build Frontend
REM ============================================================================
echo [Step 2/4] Building frontend...
echo ----------------------------------------------------------------------------

REM Navigate to frontend directory
if not exist "frontend" (
    echo ERROR: frontend directory not found.
    goto :error
)

cd frontend
if errorlevel 1 (
    echo ERROR: Failed to navigate to frontend directory.
    goto :error
)

REM Run npm build
echo Running: npm run build
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed.
    cd /d "%PROJECT_ROOT%"
    goto :error
)

echo SUCCESS: Frontend built successfully.
cd /d "%PROJECT_ROOT%"
echo.

REM ============================================================================
REM Step 3: Clean Deployment Artifacts
REM ============================================================================
echo [Step 3/4] Cleaning deployment artifacts...
echo ----------------------------------------------------------------------------

REM Navigate to deployment directory
if not exist "deployment" (
    echo ERROR: deployment directory not found.
    goto :error
)

cd deployment
if errorlevel 1 (
    echo ERROR: Failed to navigate to deployment directory.
    goto :error
)

REM Delete build folder if it exists
if exist "build" (
    echo Deleting build folder...
    rd /s /q "build"
    if errorlevel 1 (
        echo WARNING: Failed to delete build folder completely.
    ) else (
        echo Deleted: build folder
    )
) else (
    echo No build folder to delete.
)

REM Delete dist folder if it exists
if exist "dist" (
    echo Deleting dist folder...
    rd /s /q "dist"
    if errorlevel 1 (
        echo WARNING: Failed to delete dist folder completely.
    ) else (
        echo Deleted: dist folder
    )
) else (
    echo No dist folder to delete.
)

echo SUCCESS: Deployment artifacts cleaned.
echo.

REM ============================================================================
REM Step 4: Create Executable
REM ============================================================================
echo [Step 4/4] Creating executable...
echo ----------------------------------------------------------------------------

REM Check if create_executable.bat exists
if not exist "create_executable.bat" (
    echo ERROR: create_executable.bat not found in deployment directory.
    cd /d "%PROJECT_ROOT%"
    goto :error
)

REM Run create_executable.bat
echo Running: create_executable.bat
call create_executable.bat
if errorlevel 1 (
    echo ERROR: Executable creation failed.
    cd /d "%PROJECT_ROOT%"
    goto :error
)

echo SUCCESS: Executable created successfully.
cd /d "%PROJECT_ROOT%"
echo.

REM ============================================================================
REM Success
REM ============================================================================
echo ============================================================================
echo                    UPDATE COMPLETED SUCCESSFULLY!
echo ============================================================================
echo.
echo All steps completed:
echo   [OK] Synced with default branch
echo   [OK] Frontend build
echo   [OK] Deployment artifacts cleaned
echo   [OK] Executable created
echo.
echo The project has been updated successfully.
echo ============================================================================
goto :end

REM ============================================================================
REM Error Handler
REM ============================================================================
:error
echo.
echo ============================================================================
echo                         UPDATE FAILED!
echo ============================================================================
echo.
echo An error occurred during the update process.
echo Please check the error messages above and resolve the issue.
echo.
pause
exit /b 1

REM ============================================================================
REM Normal Exit
REM ============================================================================
:end
echo.
pause
exit /b 0
