# CRPF Mental Health & Wellness System
## Complete Deployment Guide

---

## 📋 **System Requirements**

| Component | Requirement |
|-----------|-------------|
| **Operating System** | Windows 10/11 (64-bit) |
| **RAM** | Minimum 8GB (Recommended 16GB) |
| **Storage** | 5GB free space |
| **Internet** | Required only during initial setup |
| **Database** | MySQL 8.0+ (included in installation) |

---

## 🚀 **FASTEST INSTALLATION METHOD (Recommended)**

### Step 1: Extract Files
```
Extract CRPF_Mental_Health_System.zip to C:\CRPF_System\
```

### Step 2: Run Automatic Installation (AS ADMINISTRATOR)
```
Right-click install.bat → "Run as Administrator"
Wait for installation to complete (15-20 minutes)
System will create desktop shortcut automatically
```

### Step 3: Launch System
```
Option 1: Double-click desktop shortcut: "CRPF Mental Health System"
Option 2: Double-click CRPF_Mental_Health_System.exe in deployment folder
```

**⏱️ Total Time: 15-20 minutes**

---

## 📋 **What install.bat Does Automatically**

1. ✅ Checks Python/Node.js installation (installs if missing)
2. ✅ Installs MySQL 8.0+ if not present
3. ✅ Creates virtual environment
4. ✅ Installs 122 Python packages
5. ✅ Builds optimized frontend
6. ✅ Configures database connection
7. ✅ Creates desktop shortcut
8. ✅ Tests system startup

---

## 🔧 **Manual Installation (If Automatic Fails)**

### Prerequisites:
```bash
# Download and install (in order):
1. Python 3.8+ (from python.org) - CHECK "Add Python to PATH"
2. Node.js 18+ (from nodejs.org)
3. MySQL 8.0+ (Community Server) - Set root password: crpf@2024
```

### Manual Commands:
```bash
cd C:\CRPF_System\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

cd ..\frontend
npm install
npm run build

# Configure database credentials in backend\.env if needed
```

---

## ⚡ **Daily System Usage**

### Starting the System:
- **Method 1**: Double-click desktop shortcut
- **Method 2**: Double-click `CRPF_Mental_Health_System.exe` in deployment folder
- **Method 3**: Manual start (advanced users only):
  ```bash
  cd C:\CRPF_System\deployment
  python crpf_launcher.py
  ```

### What Happens During Startup:
1. System checks backend/frontend readiness
2. Starts Flask backend (localhost:5000)
3. Serves React frontend (localhost:3000)
4. Opens browser automatically after 30-60 seconds
5. Shows login page ready for use

### Stopping the System:
- **Easy**: Close the browser - system stops automatically
- **Manual**: Press Ctrl+C in the terminal window

---

## 🛠️ **Troubleshooting**

| Issue | Solution |
|-------|----------|
| "Python not found" | Install Python 3.8+ with "Add to PATH" checked |
| "npm not found" | Install Node.js 18+ |
| "Access denied" | Right-click install.bat → "Run as Administrator" |
| "Port already in use" | Close other applications using ports 3000/5000 |
| Database connection error | Check MySQL service is running |
| Browser doesn't open | Wait 60 seconds, then manually go to localhost:3000 |
| **External webcam not detected** | See "External Webcam Setup" section below |
| **Camera shows black screen** | Unplug and reconnect USB camera, wait 30 seconds |
| **"No cameras available" error** | Check Windows Privacy Settings (see below) |

---

## 📷 **External Webcam Setup (Windows)**

### Prerequisites for External USB Webcams:
The system is optimized for Windows and supports both built-in and external USB webcams. For best results with external USB cameras:

### 1. **Windows Camera Permissions**
```
Windows Settings → Privacy & Security → Camera
- Enable "Let apps access your camera"
- Enable "Let desktop apps access your camera"
- Verify Python/Application has camera access
```

### 2. **USB Power Settings** (Important!)
External USB cameras may fail if Windows puts them to sleep:
```
Control Panel → Power Options → Change Plan Settings → Advanced
→ USB Settings → USB selective suspend setting → Set to "Disabled"
```

### 3. **Verify Camera in Device Manager**
```
Device Manager → Cameras (or Imaging devices)
- External webcam should appear without warning icon
- If yellow warning icon: Update/reinstall driver
- If not listed: Try different USB port (use USB 2.0 port preferred)
```

### 4. **Camera Testing Before Using System**
Test your external camera works on Windows:
```
1. Open Windows Camera app
2. Select external camera from settings
3. Verify you can see video feed
4. Close Camera app before starting CRPF system
```

### 5. **Camera Detection Order**
The system tries cameras in this order:
1. **External USB webcam** (Index 1) - Preferred for CRPF deployment
2. **Built-in camera** (Index 0) - Backup if external not available

### 6. **Troubleshooting External Webcam Issues**

| Problem | Solution |
|---------|----------|
| "Unable to capture frames" | Wait 5 seconds after plugging in camera, then start survey |
| Camera works in other apps but not CRPF system | Close all other camera apps (Zoom, Teams, Skype) |
| Black/frozen video | Unplug camera, wait 10 seconds, replug into different USB port |
| "Camera in use" error | Close all applications, restart CRPF system |
| Intermittent camera failures | Use USB 2.0 port instead of USB 3.0 |
| Camera disconnects during survey | Check USB cable connection, try shorter cable |

### 7. **Camera Diagnostics API** (For IT Support)
The system includes diagnostic tools:
```
GET http://localhost:5000/api/image/diagnostics/camera-test
```
Returns JSON with all detected cameras and their status.

### 8. **Recommended External Webcams for CRPF**
- Resolution: 720p (1280x720) minimum, 1080p preferred
- Connection: USB 2.0 or 3.0
- Microphone: Built-in (if audio needed)
- Focus: Auto-focus preferred
- Tested brands: Logitech, Microsoft, HP (any DirectShow-compatible)

---

## 📊 **Verification Checklist**

### System is working when you see:
- ✅ Desktop shortcut exists: "CRPF Mental Health System"
- ✅ Browser opens automatically to localhost:3000
- ✅ Login page displays without errors
- ✅ Can create test user account
- ✅ Face detection camera works
- ✅ No error messages in terminal

### Test All Features:
- [ ] User registration/login
- [ ] Image capture and analysis
- [ ] Emotion detection reports
- [ ] Dashboard analytics
- [ ] Data export functionality

---

## 🛡️ **Security Information**

### Data Security:
- ✅ System runs 100% **OFFLINE** after installation
- ✅ No external data transmission
- ✅ All data stored locally in MySQL database
- ✅ Face recognition models embedded in system
- ✅ User data encrypted in database

### Access Control:
- Admin login: Use provided credentials during setup
- User accounts: Created by admin only
- Session timeout: 30 minutes of inactivity
- Data backup: Local database files only

---

## 📞 **Support Information**

### Technical Contacts:
- **System Developer**: Durgesh Bhusnale
- **Installation Support**: Available during deployment
- **Documentation**: All guides included in deployment package

### Emergency Troubleshooting:
- Check system logs in `backend\logs\` folder
- Restart MySQL service if database errors occur
- Re-run install.bat if major issues (will not affect existing data)

---

## 📁 **Final Package Structure**

```
C:\CRPF_System\
├── backend\                 # Flask API and database
├── frontend\               # React web interface
├── deployment\             # Installation scripts and launcher
├── documentation\          # System documentation
└── Desktop Shortcut       # Quick launcher icon
```

---

## 🎯 **Quick Start Summary for CRPF Personnel**

### **ONE-TIME SETUP** (IT Department):
1. Extract files to C:\CRPF_System\
2. Run install.bat as Administrator
3. Wait 15-20 minutes for completion

### **DAILY USE** (CRPF Personnel):
1. Double-click desktop shortcut
2. Wait 1 minute for system startup
3. Login and begin mental health monitoring
4. Close browser when finished

---

> **📝 Important**: This system is designed for **OFFLINE OPERATION** to ensure maximum security and privacy of CRPF personnel data. All processing happens locally on the installed machine.

---

**Installation Date**: _______________  
**Installed By**: ___________________  
**Verified By**: ___________________  
**System Status**: ⬜ OPERATIONAL ⬜ NEEDS ATTENTION