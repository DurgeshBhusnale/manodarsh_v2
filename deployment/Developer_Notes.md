# Developer Notes - CRPF Deployment
## Internal Reference for Durgesh Bhusnale

---

## 📋 **Pre-Deployment Checklist**

### Before Going to CRPF:
- [ ] Test `python deployment/crpf_launcher.py` on your computer
- [ ] Ensure backend starts without errors
- [ ] Ensure frontend serves from build folder (not dev mode)
- [ ] Ensure browser opens automatically to localhost:3000
- [ ] Test system shutdown (Ctrl+C stops cleanly)
- [ ] Verify CRPF_Mental_Health_System.exe works
- [ ] Check that all documentation is in deployment folder

### System Configuration:
- [ ] Backend uses production settings (not debug mode)
- [ ] Frontend build folder exists and is up-to-date
- [ ] Database credentials are set for local MySQL
- [ ] requirements.txt includes all dependencies (122 packages)
- [ ] No development dependencies in production build

---

## 🔧 **Key Technical Details**

### Executable Creation:
- Created using PyInstaller via `create_executable.bat`
- Contains crpf_launcher.py bundled with Python runtime
- Size: ~50-100MB (standalone, no Python installation needed)
- Located in deployment folder after build

### Dependencies Fixed:
- `safetensors==0.4.5` (not 0.5.3 - compatibility issue resolved)
- `bcrypt==3.2.2` (not 4.0.1 - avoids Rust compiler requirement)
- All 122 packages tested in fresh virtual environment

### System Architecture:
- Backend: Flask on localhost:5000
- Frontend: React build served on localhost:3000
- Database: Local MySQL (offline operation)
- Launcher: Handles startup sequence and browser opening

---

## 🚀 **Deployment Process**

### What You'll Do at CRPF:
1. **Extract** the entire Manodarsh folder to their preferred location
2. **Run** install.bat as Administrator (one-time setup)
3. **Test** the system by running the .exe or desktop shortcut
4. **Verify** all features work (face detection, emotion analysis, etc.)
5. **Train** their IT personnel on basic operation

### Expected Installation Time:
- Automatic installation: 15-20 minutes
- Manual installation (if needed): 30-45 minutes
- System testing: 10-15 minutes
- Total deployment time: 30-60 minutes

---

## 🛠️ **Common Issues & Solutions**

### Installation Issues:
- **Python PATH missing**: Re-install Python with "Add to PATH" checked
- **Node.js missing**: Download from nodejs.org
- **MySQL connection**: Verify service is running, check port 3306
- **Permission errors**: Run install.bat as Administrator

### Runtime Issues:
- **Port conflicts**: Check nothing else uses ports 3000/5000
- **Browser doesn't open**: Wait full 60 seconds, open manually
- **Face detection not working**: Check camera permissions
- **Database errors**: Restart MySQL service

---

## 📊 **System Performance**

### Expected Startup Times:
- Backend initialization: 10-15 seconds
- Frontend serving: 5-10 seconds
- Browser opening: 30-60 seconds after launch
- Total ready time: 1-2 minutes from .exe click

### Resource Usage:
- RAM: ~1-2GB during operation
- Disk: ~3-5GB total installation
- CPU: Low usage except during face processing
- Network: None (100% offline operation)

---

## 🔍 **Post-Deployment Verification**

### System Health Checks:
- [ ] Backend responds at http://localhost:5000/health
- [ ] Frontend loads at http://localhost:3000
- [ ] Database connection established
- [ ] Face detection models loaded successfully
- [ ] User registration/login works
- [ ] Image capture functional
- [ ] Reports generate correctly

### Long-term Support:
- System designed for minimal maintenance
- Database backups can be done via MySQL tools
- Log files in backend/logs/ for troubleshooting
- No internet required after installation
- Updates would require new deployment package

---

## 📁 **File Structure Notes**

### Critical Files:
- `crpf_launcher.py` - Main system orchestrator
- `install.bat` - One-time setup script
- `config.json` - System configuration
- `requirements.txt` - Python dependencies
- `CRPF_Mental_Health_System.exe` - Standalone launcher

### Folder Hierarchy:
```
Manodarsh/
├── backend/           # Flask app + venv + models
├── frontend/         # React app + build/
├── deployment/       # Scripts + docs + .exe
├── documentation/    # Additional docs
└── [other folders]   # Storage, etc.
```

---

## 🎯 **Success Criteria**

### Deployment Complete When:
- ✅ System starts via .exe or desktop shortcut
- ✅ Browser opens automatically to login page
- ✅ Face detection camera initializes
- ✅ Sample user can be created and login works
- ✅ Basic emotion detection test passes
- ✅ System shuts down cleanly
- ✅ CRPF IT personnel comfortable with operation

---

> **Developer Note**: Keep this file for your reference. It contains technical details not needed by CRPF personnel but useful for troubleshooting and future updates.

---

**Deployment Date**: _______________  
**Developer**: Durgesh Bhusnale  
**Status**: ⬜ READY ⬜ IN PROGRESS ⬜ COMPLETED