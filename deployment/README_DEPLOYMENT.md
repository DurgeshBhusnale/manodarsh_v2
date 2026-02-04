# CRPF Mental Health System - Deployment Tools

## 🎯 Professional Windows Deployment Package

This directory contains all tools to create a professional Windows installer for the CRPF Mental Health System.

---

## 📦 What's Included

### Build Scripts
- **`build_package.py`** - Main package builder (downloads Python, installs dependencies)
- **`build_installer.bat`** - Windows batch script to automate entire build
- **`crpf_launcher_v2.py`** - Enhanced system launcher with system tray
- **`init_database.py`** - First-run database initialization

### Support Files
- **`ROLLBACK.sh`** - Emergency rollback script (restore working code)
- **`assets/`** - Icons and branding images (to be added)
- **`templates/`** - Configuration templates
- **`package/`** - Build output (portable package)
- **`output/`** - Final installer output

---

## 🚀 Quick Start - Build Installer

### Prerequisites
1. **Windows 10/11** (build machine)
2. **Python 3.10+** installed
3. **Node.js 18+** installed
4. **Git** installed

### One-Command Build
```cmd
cd deployment
build_installer.bat
```

This will:
1. Clean previous builds
2. Download embedded Python (300 MB)
3. Install 120 Python packages (10-15 minutes)
4. Build React frontend
5. Create launcher executable
6. Package everything

### Manual Build (Step by Step)

#### Step 1: Build Portable Package
```cmd
python build_package.py
```

Creates `package/` folder with:
- Embedded Python 3.10
- All Python dependencies (TensorFlow, OpenCV, etc.)
- MariaDB structure (manual download required)
- Backend application
- Configuration files

#### Step 2: Build Frontend
```cmd
cd ..\frontend
npm run build
cd ..\deployment
```

#### Step 3: Copy Frontend to Package
```cmd
xcopy /E /I /Y ..\frontend\build package\app\frontend\build
```

#### Step 4: Create Launcher Executable
```cmd
pip install pyinstaller
pyinstaller --onefile --noconsole --icon=assets\sathi_logo.ico --name=CRPF_System crpf_launcher_v2.py
copy dist\CRPF_System.exe package\CRPF_System.exe
```

---

## 🧪 Testing the Package

### Manual Test (Without Installer)
```cmd
cd package
CRPF_System.exe
```

**Expected Behavior:**
1. MySQL starts (if available)
2. Backend starts (~30 seconds)
3. Browser opens to http://localhost:5000
4. Login page appears
5. System tray icon shows

**Default Login:**
- Force ID: `CRPF000001`
- Password: `admin123`

### Test Checklist
- [ ] System starts without errors
- [ ] Browser opens automatically
- [ ] Login works
- [ ] Camera detection works
- [ ] Survey creation works
- [ ] System tray icon shows
- [ ] Stop from tray icon works
- [ ] All processes terminate cleanly

---

## 📋 Package Structure

```
package/                          # Portable package (~1.2 GB)
├── python/                       # Embedded Python 3.10
│   ├── python.exe
│   └── Lib/site-packages/       # All 120 packages
├── mysql/                        # MariaDB embedded (manual)
│   ├── bin/
│   ├── data/
│   └── my.ini
├── app/
│   ├── backend/                 # Flask application
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   ├── db/
│   │   └── .env
│   └── frontend/build/          # React production build
├── config/
│   └── system.json
├── logs/                        # Created on first run
├── .pids/                       # Process IDs
├── CRPF_System.exe             # Main launcher
├── README.txt
└── manifest.json
```

---

## ⚙️ Configuration

### Backend (.env)
Located at: `package/app/backend/.env`

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=crpf_mental_health
DB_USER=root
DB_PASSWORD=
SECRET_KEY=change-in-production
FLASK_ENV=production
```

### MySQL (my.ini)
Located at: `package/mysql/my.ini`

```ini
[mysqld]
port=3306
datadir=data
basedir=.
skip-grant-tables
default-storage-engine=InnoDB
```

---

## 🔧 Troubleshooting

### Build Issues

**Q: "Python not found"**
```cmd
python --version
```
If error, install Python 3.10+ from python.org

**Q: "npm not found"**
```cmd
node --version
npm --version
```
If error, install Node.js 18+ from nodejs.org

**Q: "PyInstaller failed"**
```cmd
pip install pyinstaller
```

**Q: "Frontend build failed"**
```cmd
cd ..\frontend
npm install
npm run build
```

### Runtime Issues

**Q: "MySQL won't start"**
- Download MariaDB manually
- Extract to `package/mysql/`
- Ensure mysqld.exe exists in `mysql/bin/`

**Q: "Backend won't start"**
- Check `logs/backend.log`
- Verify Python packages installed: `python/python.exe -m pip list`

**Q: "Frontend not loading"**
- Verify `app/frontend/build/index.html` exists
- Check browser console for errors

---

## 📦 MariaDB Manual Download

Since MariaDB is 150 MB, it's not auto-downloaded.

### Steps:
1. Download: https://downloads.mariadb.com/MariaDB/mariadb-10.6.16/winx64-packages/mariadb-10.6.16-winx64.zip
2. Extract ZIP
3. Copy contents to `package/mysql/`
4. Verify `package/mysql/bin/mysqld.exe` exists

---

## 🚀 Next Steps (Advanced)

### Create Inno Setup Installer
```cmd
REM Install Inno Setup 6.x first
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

Output: `output/CRPF_System_Setup.exe` (professional installer)

### Create Portable ZIP
```cmd
cd package
7z a -tzip ..\output\CRPF_System_Portable.zip *
```

---

## 🔐 Security Notes

- **Change default admin password** immediately after first login
- **Update SECRET_KEY** in .env for production
- **Enable MySQL authentication** (remove skip-grant-tables)
- **Use HTTPS** for production deployment (add SSL certificate)

---

## 📞 Support

### Build Issues
- Check Python version: `python --version` (need 3.10+)
- Check Node.js: `node --version` (need 18+)
- Check logs in `logs/` folder

### Runtime Issues
- Check `logs/launcher.log`
- Check `logs/backend.log`
- Check `logs/mysql.log`

### Contact
- Email: support@crpf.gov.in
- GitHub: [Repository URL]

---

## 📝 Version History

### Version 1.0 (2026-02-04)
- Initial professional deployment package
- Embedded Python 3.10.11
- MariaDB 10.6.16 support
- System tray launcher
- First-run database initialization
- Flask serves React frontend

---

## ✅ Deployment Checklist

Before deploying to CRPF:

- [ ] All tests pass
- [ ] Frontend builds successfully
- [ ] Backend starts without errors
- [ ] Camera detection works (USB webcam)
- [ ] Database initializes correctly
- [ ] Default admin login works
- [ ] System tray icon works
- [ ] Graceful shutdown works
- [ ] No console errors
- [ ] Documentation complete

---

*Built with ❤️ for CRPF Personnel Mental Health & Wellness*
