# How to Create SATHI System Executable

## Prerequisites
- Python virtual environment set up in `backend/venv`
- All dependencies installed in venv

## Steps to Create EXE

### 1. Activate Virtual Environment
```bash
cd D:\Manodarsh\backend
venv\Scripts\activate
```

### 2. Install PyInstaller Dependencies (if not already)
```bash
pip install pyinstaller psutil requests
```

### 3. Navigate to Deployment Folder
```bash
cd ..\deployment
```

### 4. Run the Build Script
```bash
.\create_executable.bat
```

## What the Script Does
1. ✅ Checks if you're in venv (prevents global Python issues)
2. ✅ Installs PyInstaller if needed
3. ✅ Creates `SATHI.exe` in `deployment/dist/` folder
4. ✅ Bundles all required dependencies (psutil, requests)

## Output Location
- **Executable**: `deployment/dist/SATHI.exe`
- **Spec File**: `deployment/SATHI.spec` (can customize if needed)

## How the EXE Works
1. When you run `SATHI.exe`, it will:
   - Check if system is already running
   - Start backend using `backend/venv/Scripts/python.exe` (your venv Python)
   - Start frontend (either production build or dev mode)
   - Open browser automatically
   - Run in background

2. Click `SATHI.exe` again to stop the system

## Important Notes
- ✅ The EXE launcher uses your venv Python to run the backend
- ✅ All backend dependencies come from your venv, not bundled
- ✅ Only the launcher script is bundled into EXE
- ✅ No need to rebuild EXE if you change backend/frontend code
- ⚠️ Must keep `backend/` and `frontend/` folders with the EXE

## Troubleshooting

### "Not running in virtual environment" Error
**Solution**: Activate venv first before running the script
```bash
cd D:\Manodarsh\backend
venv\Scripts\activate
cd ..\deployment
.\create_executable.bat
```

### EXE doesn't start backend
**Solution**: Make sure `backend/venv/` folder exists with the EXE

### Missing dependencies when running EXE
**Solution**: Rebuild with venv activated to bundle correct packages

## Distribution Package Structure
When distributing to others, include:
```
SATHI/
├── SATHI.exe           (the launcher)
├── backend/            (entire folder with venv)
├── frontend/           (entire folder with build/)
└── deployment/         (config files)
```

## Quick Commands Reference
```bash
# Create EXE (from venv)
cd D:\Manodarsh\backend
venv\Scripts\activate
cd ..\deployment
.\create_executable.bat

# Test EXE
cd dist
.\SATHI.exe

# Stop system (click EXE again or use Task Manager)
```
