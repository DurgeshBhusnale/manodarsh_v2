# CRPF Installation Checklist - FOR DEVELOPER

## Pre-Installation (Do these BEFORE going to CRPF):

### 1. Test Your System
- [ ] Test `python deployment/crpf_launcher.py` on your computer (WITHOUT venv)
- [ ] Ensure it starts backend and frontend correctly  
- [ ] Ensure browser opens automatically
- [ ] Test stopping the system

### 2. Prepare Installation Package
- [ ] Copy entire `Manodarsh` folder to USB drive
- [ ] Include this installation guide
- [ ] Bring installer files for Python, Node.js, MySQL if needed

## On-Site Installation at CRPF (Day of Installation):

### Step 1: Software Prerequisites 
**You need to install these on CRPF computer:**

- [ ] **Python 3.8+** 
  - Download from python.org
  - ⚠️ **IMPORTANT**: Check "Add Python to PATH" during installation
  - Test: Open cmd, type `python --version`

- [ ] **Node.js 16+**
  - Download from nodejs.org  
  - Test: Open cmd, type `node --version` and `npm --version`

- [ ] **MySQL 8.0+**
  - Download MySQL installer
  - Set root password (remember it!)
  - Start MySQL service
  - Test: Open cmd, type `mysql --version`

### Step 2: Copy Project Files
- [ ] Copy entire `Manodarsh` folder to `C:\CRPF-System\`
- [ ] Navigate to `C:\CRPF-System\Manodarsh\`

### Step 3: Database Setup
- [ ] Open MySQL Workbench or command line
- [ ] Create database: `CREATE DATABASE crpf_mental_health;`
- [ ] Create user and set permissions
- [ ] Update `backend\.env` file with database credentials:
  ```
  DB_HOST=localhost
  DB_USER=your_mysql_user
  DB_PASSWORD=your_mysql_password
  DB_NAME=crpf_mental_health
  ```

### Step 4: Run Installation Script
- [ ] Right-click `deployment\install.bat`
- [ ] Select "Run as administrator"
- [ ] Wait for installation to complete
- [ ] Check for any error messages

### Step 5: Test the System
- [ ] Double-click desktop shortcut "CRPF Mental Health System"
- [ ] Wait 15-20 seconds for system to start
- [ ] Browser should open to http://localhost:3000
- [ ] Test login functionality
- [ ] Test admin and soldier accounts
- [ ] Close browser and test stopping system

### Step 6: Create User Accounts
- [ ] Login as admin
- [ ] Create test soldier accounts
- [ ] Create admin accounts for CRPF personnel
- [ ] Test all account types

### Step 7: Final Configuration
- [ ] Set up any CRPF-specific settings
- [ ] Configure automatic startup (if requested)
- [ ] Set up database backup schedule
- [ ] Document any custom configurations

## Handover to CRPF

### Training Session (15 minutes):
1. **Show them the desktop icon**
2. **Demo: Double-click → System starts → Use normally**
3. **Demo: Double-click again → System stops**
4. **Show them login credentials**
5. **Basic troubleshooting (restart computer if issues)**

### Leave Behind:
- [ ] User manual document
- [ ] Admin credentials (written down securely)
- [ ] Your contact information for support
- [ ] Basic troubleshooting guide

## Post-Installation Support

### Common Issues & Solutions:
- **System doesn't start**: Check MySQL service is running
- **Database errors**: Verify credentials in backend\.env
- **Port conflicts**: Restart computer
- **Browser doesn't open**: Manually go to http://localhost:3000

### Emergency Contact:
- Your phone number: ________________
- Your email: ________________  
- Available hours: ________________

---

## Quick Command Reference (for you during installation):

### Test Python Installation:
```cmd
python --version
pip --version
```

### Test Node.js Installation:
```cmd
node --version
npm --version
```

### Test MySQL Installation:
```cmd
mysql --version
mysql -u root -p
```

### Manual Start (for testing):
```cmd
# Terminal 1: Start Backend
cd C:\CRPF-System\Manodarsh\backend
python app.py

# Terminal 2: Start Frontend  
cd C:\CRPF-System\Manodarsh\frontend
npm start
```

### Check if Ports are Free:
```cmd
netstat -an | find "3000"
netstat -an | find "5000"
```
