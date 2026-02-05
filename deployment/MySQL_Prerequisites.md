# MySQL 8.0 Prerequisites for SATHI

## Overview

SATHI requires MySQL 8.0 to be installed and running on the target PC **before** installing the SATHI application. This document provides step-by-step instructions for installing and configuring MySQL.

---

## Prerequisites Checklist

Before installing SATHI, ensure:

- ✅ MySQL 8.0 is installed
- ✅ MySQL service is running
- ✅ Database `crpf_mental_health` is created
- ✅ User `crpf_user` is created with appropriate permissions
- ✅ MySQL is accessible on `localhost:3306`

---

## Step 1: Download MySQL 8.0

### Windows Installation

1. **Visit MySQL Download Page:**
   - URL: https://dev.mysql.com/downloads/mysql/
   - Select: **MySQL Community Server 8.0.x**
   - Platform: **Microsoft Windows**
   - Architecture: **Windows (x86, 64-bit)**

2. **Download Installer:**
   - Choose: **MySQL Installer MSI** (recommended)
   - File size: ~400-500 MB
   - Click "Download" (No login required - click "No thanks, just start my download")

---

## Step 2: Install MySQL 8.0

### Installation Steps:

1. **Run Installer:**
   - Double-click `mysql-installer-community-8.0.xx.msi`
   - Accept UAC prompt (Run as Administrator)

2. **Choose Setup Type:**
   - Select: **Developer Default** (recommended)
   - OR **Server only** (minimal, ~300 MB)
   - Click "Next"

3. **Check Requirements:**
   - Installer will check for prerequisites
   - Install any missing components
   - Click "Next"

4. **Installation:**
   - Click "Execute" to begin installation
   - Wait for installation to complete (5-10 minutes)
   - Click "Next"

5. **Product Configuration:**
   - Click "Next" to configure MySQL Server

6. **Type and Networking:**
   - Config Type: **Development Computer** (or Dedicated Server)
   - Port: **3306** (default - do not change)
   - ✅ Open Windows Firewall port
   - Click "Next"

7. **Authentication Method:**
   - Select: **Use Strong Password Encryption** (recommended)
   - Click "Next"

8. **Accounts and Roles:**
   - **Root Password:** Enter a strong password (remember this!)
   - ✅ Write down password securely
   - (Optional) Add user accounts - we'll do this later
   - Click "Next"

9. **Windows Service:**
   - ✅ Configure MySQL Server as Windows Service
   - Service Name: **MySQL80** (default)
   - ✅ Start MySQL Server at System Startup
   - Run Windows Service as: **Standard System Account**
   - Click "Next"

10. **Apply Configuration:**
    - Click "Execute" to apply configuration
    - Wait for all steps to complete (green checkmarks)
    - Click "Finish"

11. **Product Configuration Complete:**
    - Click "Next" → "Finish"

---

## Step 3: Verify MySQL Installation

### Check MySQL Service:

1. **Open Services:**
   - Press `Win + R`
   - Type: `services.msc`
   - Press Enter

2. **Find MySQL80 Service:**
   - Scroll to "MySQL80"
   - Status should be: **Running**
   - Startup Type should be: **Automatic**

3. **If Not Running:**
   - Right-click "MySQL80"
   - Click "Start"

### Test Connection (Command Line):

```cmd
# Open Command Prompt
mysql -u root -p

# Enter root password when prompted
# You should see:
# mysql>
```

**Success!** MySQL is installed and running.

---

## Step 4: Create SATHI Database

### Using MySQL Command Line:

1. **Connect to MySQL:**
   ```cmd
   mysql -u root -p
   ```

2. **Enter root password**

3. **Create Database:**
   ```sql
   CREATE DATABASE crpf_mental_health 
   CHARACTER SET utf8mb4 
   COLLATE utf8mb4_unicode_ci;
   ```

4. **Create User:**
   ```sql
   CREATE USER 'crpf_user'@'localhost' 
   IDENTIFIED BY 'SecurePassword123!';
   ```
   
   > **Note:** Replace `SecurePassword123!` with a strong password

5. **Grant Permissions:**
   ```sql
   GRANT ALL PRIVILEGES ON crpf_mental_health.* 
   TO 'crpf_user'@'localhost';
   
   FLUSH PRIVILEGES;
   ```

6. **Verify Database:**
   ```sql
   SHOW DATABASES;
   ```
   
   You should see `crpf_mental_health` in the list.

7. **Exit:**
   ```sql
   EXIT;
   ```

### Using MySQL Workbench (GUI):

1. **Open MySQL Workbench** (installed with MySQL)

2. **Connect to MySQL:**
   - Click on "Local instance MySQL80"
   - Enter root password

3. **Create Database:**
   - Click "Create a new schema" (database icon)
   - Schema Name: `crpf_mental_health`
   - Charset: `utf8mb4`
   - Collation: `utf8mb4_unicode_ci`
   - Click "Apply" → "Apply" → "Finish"

4. **Create User:**
   - Go to: Server → Users and Privileges
   - Click "Add Account"
   - Login Name: `crpf_user`
   - Authentication: `Standard`
   - Password: Enter strong password
   - Confirm password
   - Click "Apply"

5. **Grant Permissions:**
   - Select user `crpf_user`
   - Go to "Schema Privileges" tab
   - Click "Add Entry"
   - Selected schema: `crpf_mental_health`
   - Click "OK"
   - Select all privileges
   - Click "Apply"

---

## Step 5: Update SATHI Configuration

After installing SATHI, you'll need to configure the database connection.

### Configuration File Location:

```
C:\Program Files\SATHI\app\backend\.env
```

### Required Settings:

```ini
DB_NAME=crpf_mental_health
DB_USER=crpf_user
DB_PASSWORD=YourPasswordHere
DB_HOST=localhost
DB_PORT=3306
```

> **Important:** Replace `YourPasswordHere` with the actual password you set for `crpf_user`

---

## Troubleshooting

### MySQL Service Won't Start

**Solution 1: Check Port Conflict**
```cmd
netstat -ano | findstr :3306
```
If port 3306 is in use by another application, either:
- Stop that application, OR
- Change MySQL port in `my.ini` and update SATHI config

**Solution 2: Check Error Log**
```
C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err
```

**Solution 3: Restart Service**
```cmd
net stop MySQL80
net start MySQL80
```

### Can't Connect to MySQL

**Check:**
1. Service is running: `services.msc` → MySQL80 → Status: Running
2. Port is correct: 3306 (default)
3. Username/password are correct
4. Firewall is not blocking

**Test Connection:**
```cmd
mysql -u crpf_user -p -h localhost
```

### Permission Denied

**Grant permissions again:**
```sql
mysql -u root -p
GRANT ALL PRIVILEGES ON crpf_mental_health.* TO 'crpf_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## Security Recommendations

### Production Environment:

1. **Strong Passwords:**
   - Use complex passwords (12+ characters)
   - Mix of uppercase, lowercase, numbers, symbols

2. **Firewall:**
   - MySQL should only be accessible from localhost
   - Port 3306 should NOT be exposed to network

3. **Regular Backups:**
   ```cmd
   mysqldump -u root -p crpf_mental_health > backup.sql
   ```

4. **Update MySQL:**
   - Keep MySQL updated to latest 8.0.x version
   - Check for security patches

---

## Quick Reference Commands

### Start/Stop MySQL Service:

```cmd
# Start
net start MySQL80

# Stop
net stop MySQL80

# Restart
net stop MySQL80 && net start MySQL80
```

### Check MySQL Status:

```cmd
# Service status
sc query MySQL80

# Connection test
mysql -u crpf_user -p -e "SELECT 1;"
```

### Backup Database:

```cmd
mysqldump -u crpf_user -p crpf_mental_health > backup_$(date +%Y%m%d).sql
```

### Restore Database:

```cmd
mysql -u crpf_user -p crpf_mental_health < backup.sql
```

---

## Next Steps

Once MySQL is installed and configured:

1. ✅ MySQL 8.0 running on localhost:3306
2. ✅ Database `crpf_mental_health` created
3. ✅ User `crpf_user` created with permissions
4. ➡️ **Install SATHI:** Run `SATHI_Installer.exe`

---

## Support

### MySQL Resources:

- **Official Documentation:** https://dev.mysql.com/doc/refman/8.0/en/
- **Community Forums:** https://forums.mysql.com/
- **Download Page:** https://dev.mysql.com/downloads/mysql/

### SATHI Support:

- See `KNOWN_ISSUES.md` for common problems
- See `USER_INSTALL_GUIDE.md` for installation help

---

**Version:** 1.0  
**Last Updated:** 2024  
**For:** SATHI - Mental Health System
