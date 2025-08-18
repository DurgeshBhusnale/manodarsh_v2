# CRPF System - Quick Installation Steps
## For CRPF IT Department

---

### 🚀 **FASTEST INSTALLATION METHOD**

#### Step 1: Extract Files
```
Extract CRPF_Mental_Health_System.zip to C:\CRPF_System\
```

#### Step 2: Run Installer (AS ADMINISTRATOR)
```
Right-click install.bat → "Run as Administrator"
```

#### Step 3: Launch System
```
Double-click desktop shortcut: "CRPF Mental Health System"
```

**⏱️ Total Time: 15-20 minutes**

---

### 📋 **What install.bat Does**

1. ✅ Checks Python/Node.js installation
2. ✅ Installs missing dependencies  
3. ✅ Creates virtual environment
4. ✅ Installs 122 Python packages
5. ✅ Builds optimized frontend
6. ✅ Configures database connection
7. ✅ Creates desktop shortcut
8. ✅ Tests system startup

---

### 🔧 **Manual Steps (If Needed)**

#### If install.bat fails:

**Install Prerequisites:**
```bash
# Download and install:
1. Python 3.8+ (from python.org)
2. Node.js 16+ (from nodejs.org)  
3. MySQL 8.0+ (Community Server)
```

**Run Commands:**
```bash
cd C:\CRPF_System\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

cd ..\frontend
npm install
npm run build
```

---

### ⚡ **System Startup**

#### Desktop Launcher:
- **Double-click** "CRPF Mental Health System"
- **Wait 1 minute** for complete startup
- **Browser opens** automatically at localhost:3000

#### Manual Startup:
```bash
cd C:\CRPF_System
backend\venv\Scripts\activate
python deployment\crpf_launcher.py
```

---

### 🛠️ **Troubleshooting**

| Issue | Solution |
|-------|----------|
| "Python not found" | Install Python 3.8+ with PATH |
| "npm not found" | Install Node.js 16+ |
| "Access denied" | Run as Administrator |
| "Port in use" | Close other applications |
| Database error | Check MySQL service |

---

### ✅ **Verification**

System is working when:
- ✅ Desktop shortcut exists
- ✅ Browser opens to localhost:3000
- ✅ Login page displays
- ✅ Face detection works
- ✅ No error messages

---

### 📞 **Installation Support**

**Contact**: Development Team  
**Email**: Available during deployment  
**Logs**: Check `backend\logs\` for errors

---

> **🔒 Security**: System runs 100% offline after installation. No internet required for operation.
