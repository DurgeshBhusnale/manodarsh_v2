# CRPF Mental Health & Wellness System
## Installation Guide for CRPF Personnel

---

### 📋 **System Requirements**

| Component | Requirement |
|-----------|-------------|
| **Operating System** | Windows 10/11 (64-bit) |
| **RAM** | Minimum 8GB (Recommended 16GB) |
| **Storage** | 5GB free space |
| **Internet** | Required only during initial setup |
| **Database** | MySQL 8.0+ (included in installation) |

---

### 🚀 **Quick Installation (Recommended)**

#### Step 1: Download Installation Package
- Receive the `CRPF_Mental_Health_System.zip` file
- Extract to: `C:\CRPF_System\`

#### Step 2: Run Automatic Installation
```
1. Navigate to extracted folder
2. Right-click "install.bat" → "Run as Administrator"
3. Wait for installation to complete (15-20 minutes)
4. System will create desktop shortcut automatically
```

#### Step 3: Launch System
- **Double-click** "CRPF Mental Health System" icon on desktop
- System will auto-start backend, frontend, and open browser
- Access URL: `http://localhost:3000`

---

### 🛠️ **Manual Installation (IT Department)**

#### Prerequisites Installation

**1. Install Python 3.8+**
```bash
# Download from: https://www.python.org/downloads/
# ✅ Check "Add Python to PATH" during installation
# ✅ Check "Install pip"
```

**2. Install Node.js 16+**
```bash
# Download from: https://nodejs.org/
# Select "Automatically install necessary tools"
```

**3. Install MySQL 8.0**
```bash
# Download MySQL Community Server
# Set root password: crpf@2024
# Note down host: localhost, port: 3306
```

#### System Installation

**1. Extract System Files**
```bash
# Extract CRPF_Mental_Health_System.zip to C:\CRPF_System\
```

**2. Install Backend Dependencies**
```bash
cd C:\CRPF_System\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**3. Install Frontend Dependencies**
```bash
cd C:\CRPF_System\frontend
npm install
npm run build
```

**4. Configure Database**
```bash
# Import database schema
mysql -u root -p < backend\db\schema.sql

# Update database credentials in backend\.env
# This is sample credentials.
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=crpf@2024
DB_NAME=manodarsh
```

---

### 🎯 **System Startup**

#### Option 1: Desktop Launcher (Recommended)
- **Double-click** desktop shortcut
- System handles everything automatically

#### Option 2: Manual Startup
```bash
# Terminal 1: Start Backend
cd C:\CRPF_System\backend
venv\Scripts\activate
python app.py

# Terminal 2: Start Frontend (if needed)
cd C:\CRPF_System\frontend
npm start

# Open browser: http://localhost:3000
```

---

### 🔧 **Configuration**

#### Database Settings
```env
# File: backend\.env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=crpf@2024
DB_NAME=manodarsh
```

#### System Settings
```json
# File: deployment\config.json
{
  "backend_port": 5000,
  "frontend_port": 3000,
  "startup_delay": 35,
  "browser_delay": 10,
  "auto_open_browser": true
}
```

---

### 🔍 **Troubleshooting**

#### Common Issues & Solutions

**Issue: "Module not found" error**
```bash
Solution: Activate virtual environment
cd C:\CRPF_System\backend
venv\Scripts\activate
```

**Issue: Database connection failed**
```bash
Solution: 
1. Verify MySQL is running
2. Check credentials in backend\.env
3. Import database schema if missing
```

**Issue: Port already in use**
```bash
Solution:
1. Close other applications using ports 3000/5000
2. Or modify ports in deployment\config.json
```

**Issue: Browser doesn't open automatically**
```bash
Solution: 
1. Wait 45 seconds after launch
2. Manually open: http://localhost:3000
```

---

### 📊 **System Verification**

#### Health Check Steps
```bash
1. ✅ Backend running on http://localhost:5000
2. ✅ Frontend accessible on http://localhost:3000
3. ✅ Database connection established
4. ✅ Face recognition models loaded
5. ✅ Emotion detection active
```

#### Test Features
- [ ] User registration/login
- [ ] Image capture and analysis
- [ ] Emotion detection reports
- [ ] Dashboard analytics
- [ ] Data export functionality

---

### 🛡️ **Security Notes**

#### Important Security Considerations
- System runs **offline** after installation
- No external data transmission
- All data stored locally in MySQL
- Face recognition models embedded
- User data encrypted in database

#### Access Control
- Admin login: Use provided credentials
- User accounts: Created by admin
- Session timeout: 30 minutes
- Data backup: Local database only

---

### 📞 **Support Information**

#### Technical Support
- **System Developer**: Durgesh Bhusnale
- **Deployment Team**: Available during installation
- **Documentation**: See `Documentation/` folder

#### Emergency Contacts
- Installation issues: Contact IT Department
- System errors: Check logs in `backend/logs/`
- Database issues: Verify MySQL service status

---

### 📋 **Installation Checklist**

#### Pre-Installation
- [ ] Windows 10/11 (64-bit) confirmed
- [ ] 8GB+ RAM available
- [ ] 5GB+ storage space
- [ ] Administrator access obtained
- [ ] Internet connection active

#### During Installation
- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed  
- [ ] MySQL 8.0+ installed
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] Database configured
- [ ] Desktop shortcut created

#### Post-Installation
- [ ] System launches successfully
- [ ] Browser opens automatically
- [ ] Login page accessible
- [ ] Test user account created
- [ ] Face detection working
- [ ] Reports generating correctly

---

### 🎯 **Quick Start for CRPF Personnel**

#### Daily Usage
1. **Double-click** desktop icon
2. **Wait 1 minute** for system startup
3. **Login** with provided credentials
4. **Begin** mental health monitoring

#### System Shutdown
- **Close browser** when finished
- **System auto-stops** after browser closure
- Or click **"Stop System"** in launcher

---

> **📝 Note**: This system is designed for **offline operation** to ensure maximum security and privacy of CRPF personnel data. All processing happens locally on the installed machine.

---

**Installation Date**: _______________  
**Installed By**: ___________________  
**Verified By**: ___________________  
**System Status**: ✅ **OPERATIONAL**
