# CRPF System - Known Issues & Solutions

## 📋 Known Issues and Workarounds

This document lists known issues and their solutions. Updated: 2026-02-04

---

## 🔴 Critical Issues

### None Currently

All critical issues have been resolved in Version 1.0

---

## 🟡 Minor Issues

### 1. Slow First Startup

**Issue**: System takes 60-90 seconds on first launch

**Cause**: 
- Python packages loading
- Database initialization
- AI models loading (TensorFlow, OpenCV)

**Workaround**:
- Expected behavior on first run
- Subsequent starts are faster (20-30 seconds)
- Wait patiently, don't close window

**Status**: Expected behavior, not a bug

---

### 2. External USB Webcam Black Frame

**Issue**: External USB camera shows black screen on first frame

**Cause**: 
- USB cameras need initialization time
- DirectShow backend requires warmup

**Solution**: 
✅ **FIXED in v1.0** - Implemented frame warmup and multi-frame validation

**Workaround** (if still occurs):
1. Wait 2-3 seconds after camera starts
2. Close and reopen camera
3. Use built-in camera if available

**Status**: Fixed in current version

---

### 3. Browser Auto-Open Fails on Some Systems

**Issue**: Browser doesn't open automatically after system starts

**Cause**:
- Default browser not set in Windows
- Browser blocked by security policy

**Workaround**:
1. Manually open browser
2. Navigate to: `http://localhost:5000`
3. Bookmark for future use

**Solution**:
- Set default browser in Windows
- Or use batch script to open specific browser

**Status**: Minor UX issue, not blocking

---

### 4. Port 5000 Already in Use

**Issue**: "Address already in use" error on startup

**Cause**:
- Another application using port 5000
- Previous instance not properly closed

**Solutions**:
1. Find and close conflicting app:
   ```cmd
   netstat -ano | findstr :5000
   taskkill /PID [PID_NUMBER] /F
   ```

2. Or restart computer (cleans all ports)

**Prevention**:
- Always stop system via tray icon (clean shutdown)
- Don't kill process abruptly

**Status**: User education needed

---

## 🟢 Minor Annoyances

### 5. Console Window Shows During Startup

**Issue**: Black console window visible while system starts

**Cause**: 
- Launcher runs in console mode for debugging
- Provides status messages

**Future Fix**:
- Option to hide console after stable startup
- Run as Windows service (v2.0)

**Workaround**:
- Minimize console window
- Focus on browser when it opens

**Status**: Cosmetic, provides useful info

---

### 6. System Tray Icon Not Available

**Issue**: No system tray icon on some systems

**Cause**:
- `pystray` Python package not installed
- Windows tray icon settings

**Solution**:
1. Install pystray:
   ```cmd
   python\python.exe -m pip install pystray Pillow
   ```

2. Enable tray icons in Windows:
   - Settings → Personalization → Taskbar
   - Select which icons appear on taskbar

**Status**: Minor, system still works without tray

---

### 7. Antivirus False Positives

**Issue**: Windows Defender flags CRPF_System.exe

**Cause**:
- PyInstaller executables sometimes flagged
- Unsigned executable

**Solution**:
1. Add exception in Windows Defender:
   - Windows Security → Virus & threat protection
   - Manage settings → Add exclusion
   - Add: `C:\Program Files\CRPF_System\`

2. Or download from trusted CRPF source
3. Verify file hash (check with IT)

**Future**:
- Code signing certificate (v1.1)

**Status**: Common for PyInstaller apps

---

## 🐛 Rare Issues

### 8. Database Initialization Fails on First Run

**Issue**: "Database error" on first launch

**Causes**:
- MySQL didn't start properly
- Insufficient permissions
- Port 3306 already in use

**Solutions**:

**A. Check MySQL is running:**
```cmd
tasklist | findstr mysqld
```

**B. Check port 3306:**
```cmd
netstat -ano | findstr :3306
```

**C. Manual database initialization:**
```cmd
cd "C:\Program Files\CRPF_System"
python\python.exe deployment\init_database.py
```

**D. Check logs:**
```cmd
notepad logs\mysql.log
```

**Prevention**:
- Don't install if another MySQL is running
- Run installer as administrator

**Status**: Rare, usually installation issue

---

### 9. React Frontend 404 Errors

**Issue**: "Page not found" when navigating in app

**Cause**:
- Frontend build not created
- Flask not serving React correctly

**Solution**:

**A. Verify build exists:**
```cmd
dir "C:\Program Files\CRPF_System\app\frontend\build\index.html"
```

**B. Rebuild frontend:**
```cmd
cd [source]\frontend
npm run build
xcopy /E /I /Y build "C:\Program Files\CRPF_System\app\frontend\build"
```

**C. Check Flask routes:**
- API routes work? Check http://localhost:5000/api/health
- If API works but frontend doesn't, it's a build issue

**Prevention**:
- Ensure build step completed during installation

**Status**: Rare, build issue

---

### 10. High Memory Usage (TensorFlow)

**Issue**: System uses 1-2 GB RAM

**Cause**:
- TensorFlow loads AI models into memory
- Expected for ML applications

**Mitigation**:
- Ensure 4 GB+ RAM available
- Close other heavy applications
- Restart system weekly

**Not a Bug**: ML models require memory

**Status**: Expected behavior

---

## 🔍 Diagnostic Commands

### Check System Status

```cmd
REM Check if processes running
tasklist | findstr "python.exe mysqld.exe"

REM Check ports
netstat -ano | findstr ":5000 :3306"

REM Check disk space
wmic logicaldisk get size,freespace,caption

REM Check Python packages
"C:\Program Files\CRPF_System\python\python.exe" -m pip list
```

### View Logs

```cmd
REM Backend log
notepad "C:\Program Files\CRPF_System\logs\backend.log"

REM MySQL log
notepad "C:\Program Files\CRPF_System\logs\mysql.log"

REM Launcher log
notepad "C:\Program Files\CRPF_System\logs\launcher.log"
```

### Test Components

```cmd
REM Test Python
"C:\Program Files\CRPF_System\python\python.exe" --version

REM Test MySQL
"C:\Program Files\CRPF_System\mysql\bin\mysqld.exe" --version

REM Test backend (in browser)
http://localhost:5000/api/health
```

---

## 🛠️ Recovery Procedures

### Complete System Reset

If system is completely broken:

1. **Stop all processes:**
   ```cmd
   taskkill /IM python.exe /F
   taskkill /IM mysqld.exe /F
   ```

2. **Delete PID files:**
   ```cmd
   del "C:\Program Files\CRPF_System\.pids\*.*"
   ```

3. **Restart system:**
   ```cmd
   "C:\Program Files\CRPF_System\CRPF_System.exe"
   ```

### Database Rebuild (Destructive)

⚠️ **WARNING**: This deletes all data!

```cmd
REM Stop system
taskkill /IM mysqld.exe /F

REM Delete database
rmdir /s /q "C:\Program Files\CRPF_System\mysql\data\crpf_mental_health"

REM Reinitialize
cd "C:\Program Files\CRPF_System"
python\python.exe deployment\init_database.py
```

### Clean Reinstall

If all else fails:

1. Uninstall via Windows Settings
2. Choose "Delete all data"
3. Restart computer
4. Run installer again
5. Fresh installation

---

## 📊 Performance Benchmarks

### Normal Resource Usage

| Resource | Normal | High | Critical |
|----------|--------|------|----------|
| RAM | 500 MB | 1.5 GB | 2 GB+ |
| CPU | 5-10% | 30% | 50%+ |
| Disk | 1.5 GB | 2 GB | 3 GB+ |
| Startup | 20-30s | 60s | 90s+ |

If exceeding "Critical" levels, investigate.

---

## 🔐 Security Considerations

### False Positive Antivirus

**Why it happens**:
- PyInstaller bundles Python interpreter
- Looks like "packer" to antivirus
- No actual malware

**Verification**:
1. Download from official CRPF source only
2. Verify file hash (check with IT)
3. Scan with multiple antivirus tools
4. Check digital signature (if signed)

### Firewall Issues

**Symptom**: System starts but browser can't connect

**Cause**: Windows Firewall blocking port 5000

**Solution**:
```cmd
netsh advfirewall firewall add rule name="CRPF System" dir=in action=allow protocol=TCP localport=5000
```

Or allow in Windows Firewall UI.

---

## 📞 Reporting New Issues

### Information to Provide

When reporting a new issue:

1. **System Information**:
   - Windows version (Win+R → `winver`)
   - RAM amount
   - Disk free space

2. **Error Details**:
   - Exact error message
   - Screenshot
   - When it occurred

3. **Logs**:
   - Attach `logs\backend.log`
   - Attach `logs\mysql.log`
   - Attach `logs\launcher.log`

4. **Steps to Reproduce**:
   - What you did
   - What you expected
   - What actually happened

### Where to Report

- **Email**: support@crpf.gov.in
- **Subject**: CRPF System Issue - [Brief Description]
- **Attach**: Logs and screenshots

---

## 🔄 Version History

### Version 1.0 (2026-02-04)

**Fixed Issues**:
- External USB webcam black frame (DirectShow warmup)
- Session timeout unexpectedly logging out users
- Face model management page UI inconsistencies

**Known Issues**:
- Console window shows during startup (minor)
- Slow first launch (expected)
- Browser auto-open fails on some systems (minor)

---

## ✅ Issue Resolution Checklist

Before contacting support, try these:

- [ ] Restart the CRPF system (tray icon → Restart)
- [ ] Check logs in `logs\` folder
- [ ] Restart computer
- [ ] Check disk space (need 1 GB free)
- [ ] Check Windows Task Manager for errors
- [ ] Try manual browser open: http://localhost:5000
- [ ] Check camera privacy settings in Windows
- [ ] Verify installation path exists
- [ ] Check antivirus isn't blocking
- [ ] Review this known issues list

Still not working? Contact support with logs.

---

*CRPF Mental Health System - Version 1.0*
*Known Issues Document - Updated 2026-02-04*
