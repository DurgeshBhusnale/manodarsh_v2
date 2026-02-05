# 🚀 SATHI - Complete Deployment Package

## Professional Windows Installer for Mental Health & Wellness System

---

## 📦 What's This?

This is the complete deployment package for creating a professional Windows installer for SATHI (Mental Health & Wellness Monitoring System).

**Version**: 1.0  
**Platform**: Windows 10/11 (64-bit)  
**Type**: Professional installer with prerequisites  
**Size**: ~750 MB installer

**Prerequisites**: MySQL 8.0 must be installed on target PC

---

## 🎯 Installation Process

### Two-Step Installation:

**Step 1: Install MySQL 8.0** (One-time setup)
- See: `MySQL_Prerequisites.md` for detailed instructions
- Install MySQL 8.0 on target PC
- Create database and user
- **Time**: 15-20 minutes

**Step 2: Install SATHI** (One-time setup)
- Run `SATHI_Installer.exe`
- Follow installation wizard
- Desktop shortcut created automatically
- **Time**: 5-10 minutes

**Daily Use:**
- Double-click "SATHI" desktop shortcut
- System starts automatically
- Browser opens to login page

---

## 📚 Documentation Index

| Document | For | Purpose |
|----------|-----|---------|
| **MySQL_Prerequisites.md** | Installation Team | MySQL 8.0 setup guide |
| **README_DEPLOYMENT.md** | Developers | Build instructions, technical details |
| **USER_INSTALL_GUIDE.md** | End Users | Installation and usage guide |
| **KNOWN_ISSUES.md** | Everyone | Troubleshooting and solutions |

---

## ⚡ Quick Start for Developers

### Prerequisites (Build Machine Only)

Install these on your **build machine** (not needed on user PCs):

- Windows 10/11
- Python 3.10+
- Node.js 18+
- Git
- PyInstaller: `pip install pyinstaller`
- (Optional) Inno Setup 6.x for creating installer

### One-Command Build

```cmd
cd deployment
build_installer.bat
```

This creates:
- `package\` - Complete portable system
- `package\SATHI.exe` - Main launcher
- `output\SATHI_Installer.exe` - Professional installer (if Inno Setup installed)

**Time**: 15-20 minutes (downloads Python packages)

---

## 📦 What's Included in Package

### Core Components

```
SATHI/
├── python/              # Embedded Python 3.10 + 120 packages
├── app/
│   ├── backend/         # Flask API + AI/ML services
│   └── frontend/build/  # React production bundle
├── config/              # System configuration
├── logs/                # Application logs (created at runtime)
├── .pids/               # Process IDs (created at runtime)
└── SATHI.exe           # Main launcher (system tray)
```

### What's NOT Included

- ❌ MySQL/MariaDB (must be pre-installed)
- ❌ Node.js runtime (React is pre-built)

### Features

- ✅ **Minimal Dependencies**: Only MySQL required
- ✅ **100% Offline**: No internet required after installation
- ✅ **System Tray**: Professional launcher with tray icon
- ✅ **Auto-Connect**: Connects to pre-installed MySQL
- ✅ **First-Run Setup**: Database initialized automatically
- ✅ **Camera Support**: DirectShow backend for USB webcams
- ✅ **AI/ML Ready**: TensorFlow, OpenCV, dlib included
- ✅ **Clean Uninstall**: Complete removal option

---

## 🔨 Build Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `build_package.py` | Creates portable package | Building from scratch |
| `build_installer.bat` | Complete build automation | One-command build |
| `create_executable.bat` | Build SATHI.exe only | Testing launcher |
| `sathi_launcher.py` | System launcher source | Part of package |
| `init_database.py` | Database initialization | First-run setup |
| `installer.iss` | Inno Setup script | Creating .exe installer |
| `clean.bat` | Clean build artifacts | Starting fresh |

---

## 🚀 Deployment Guide

### For Developers: Building the Installer

#### Step 1: Build Package

```cmd
cd deployment
python build_package.py
```

**What it does:**
1. Downloads Python 3.10 embedded (50 MB)
2. Installs 120 Python packages (TensorFlow, OpenCV, etc.) - **10-15 minutes**
3. Copies backend application
4. Copies AI models
5. Creates configuration files
6. Creates package structure

**Output**: `package/` folder (~700 MB)

#### Step 2: Build Frontend

```cmd
cd ..\frontend
npm run build
cd ..\deployment
```

**Output**: Production-optimized React bundle

#### Step 3: Create Launcher Executable

```cmd
pyinstaller SATHI.spec --clean
copy dist\SATHI.exe package\SATHI.exe
```

**Output**: `package/SATHI.exe` (~20 MB)

#### Step 4: Create Installer (Optional)

Requires Inno Setup 6.x installed:

```cmd
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

**Output**: `output/SATHI_Installer.exe` (~750 MB)

---

### For IT Staff: Deploying to Target PC

#### Prerequisites Check

Before installation, verify on target PC:

- ✅ Windows 10/11 (64-bit)
- ✅ MySQL 8.0 installed and running
- ✅ Database `crpf_mental_health` created
- ✅ User `crpf_user` created with permissions
- ✅ MySQL accessible on localhost:3306

See `MySQL_Prerequisites.md` for setup instructions.

#### Installation Steps

1. **Run Installer:**
   ```cmd
   SATHI_Installer.exe
   ```

2. **Follow Wizard:**
   - Accept license
   - Choose installation location (default: `C:\Program Files\SATHI\`)
   - Select options:
     - ✅ Create desktop shortcut (recommended)
     - ✅ Create Start Menu folder
     - ⬜ Auto-start with Windows (optional)

3. **Wait for Installation:**
   - Installer copies files (~5 minutes)
   - Database initialized automatically
   - Desktop shortcut "SATHI" created

4. **First Launch:**
   - Double-click "SATHI" desktop shortcut
   - System tray icon appears
   - Browser opens automatically
   - Login page loads

5. **Default Login:**
   - Username: `CRPF000001`
   - Password: `admin123`
   - Change password after first login!

---

## ✅ Verification Checklist

After installation, verify:

- [ ] Desktop shortcut "SATHI" exists
- [ ] SATHI.exe launches without errors
- [ ] System tray icon appears
- [ ] Browser opens to http://localhost:5000
- [ ] Login page loads
- [ ] Default login works (CRPF000001 / admin123)
- [ ] Camera access works (if webcam present)
- [ ] Survey flow works

---

## 🔧 Configuration

### Database Connection

File: `C:\Program Files\SATHI\app\backend\.env`

```ini
DB_NAME=crpf_mental_health
DB_USER=crpf_user
DB_PASSWORD=YourPasswordHere
DB_HOST=localhost
DB_PORT=3306
```

Update `DB_PASSWORD` with your actual MySQL password.

### Backend Settings

Edit `.env` file for:
- Session timeout
- Port numbers
- Debug mode
- Risk thresholds
- Camera settings

See `.env.example` for all options.

---

## 🐛 Troubleshooting

### Common Issues

#### MySQL Connection Failed

**Symptoms:**
- SATHI won't start
- Error: "MySQL is not running on localhost:3306"

**Solutions:**
1. Check MySQL service is running:
   ```cmd
   services.msc
   ```
   Find "MySQL80" → Status should be "Running"

2. Test MySQL connection:
   ```cmd
   mysql -u crpf_user -p
   ```

3. Verify database exists:
   ```sql
   SHOW DATABASES;
   ```

See `MySQL_Prerequisites.md` for detailed MySQL troubleshooting.

#### Backend Won't Start

**Symptoms:**
- System tray icon appears but browser doesn't open
- Error in logs

**Solutions:**
1. Check logs:
   ```
   C:\Program Files\SATHI\logs\backend.log
   ```

2. Verify Python packages:
   ```cmd
   cd "C:\Program Files\SATHI\python"
   python.exe -m pip list
   ```

3. Check port 5000 is free:
   ```cmd
   netstat -ano | findstr :5000
   ```

See `KNOWN_ISSUES.md` for more troubleshooting.

---

## 📊 Technical Details

### System Requirements

**Minimum:**
- Windows 10 (64-bit)
- 4 GB RAM
- 2 GB free disk space
- MySQL 8.0
- Webcam (for emotion detection)

**Recommended:**
- Windows 11 (64-bit)
- 8 GB RAM
- 5 GB free disk space
- MySQL 8.0
- HD Webcam

### Components & Versions

**Included:**
- Python: 3.10.11 embedded
- TensorFlow: 2.x
- OpenCV: 4.x
- Flask: Latest
- React: Production build

**Required (Not Included):**
- MySQL: 8.0.x (pre-installed)

### Package Size Breakdown

| Component | Size |
|-----------|------|
| Python embedded | ~50 MB |
| Python packages | ~600 MB |
| Backend code | ~50 MB |
| Frontend build | ~20 MB |
| SATHI.exe | ~20 MB |
| **Total** | **~750 MB** |

---

## 🔒 Security Notes

### Production Deployment

Before deploying to production:

1. **Change Default Password:**
   - Default admin password MUST be changed
   - Use strong passwords (12+ characters)

2. **Database Security:**
   - Use strong MySQL passwords
   - Restrict MySQL to localhost only
   - Regular backups

3. **Network Security:**
   - Firewall rules for port 5000 (localhost only)
   - MySQL port 3306 (localhost only)

4. **(Optional) Code Signing:**
   ```cmd
   signtool sign /f cert.pfx /p password SATHI.exe
   signtool sign /f cert.pfx /p password SATHI_Installer.exe
   ```

---

## 📝 Deployment Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Preparation** | 1 hour | Download MySQL, prepare target PC |
| **MySQL Setup** | 30 mins | Install MySQL, create database |
| **SATHI Install** | 10 mins | Run installer, verify |
| **Testing** | 30 mins | Test all features, camera, surveys |
| **Training** | 1 hour | Train users |
| **Total** | **~3 hours per PC** | |

---

## 📞 Support

**Documentation:**
- Installation: See `USER_INSTALL_GUIDE.md`
- MySQL Setup: See `MySQL_Prerequisites.md`
- Troubleshooting: See `KNOWN_ISSUES.md`
- Development: See `README_DEPLOYMENT.md`

**Build Issues:**
- Check Python version: `python --version` (3.10+)
- Check Node version: `node --version` (18+)
- Check package integrity
- Review build logs

---

## 📄 License

**License**: Proprietary  
**Copyright**: © 2024 CRPF Development Team  
**Project**: SATHI - Mental Health & Wellness System  
**For**: Central Reserve Police Force (CRPF)

---

**Built with ❤️ for CRPF Personnel Mental Health & Wellness**
