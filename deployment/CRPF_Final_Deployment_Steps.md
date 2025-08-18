# CRPF Deployment - Final Checklist
## Simple Steps for CRPF Installation

---

### 📦 **Step 1: System Preparation**
```
1. Unzip "manodarsh" folder to: C:\CRPF_System\
2. Install Python 3.8+ (check "Add to PATH")
3. Install Node.js 16+ 
4. Install MySQL 8.0+ Community Server
   - Root password: crpf@2024
   - Host: localhost, Port: 3306
```

### 🔧 **Step 2: Project Installation**
```
5. Open Command Prompt as Administrator
6. Run: C:\CRPF_System\deployment\install.bat
7. Wait 15-20 minutes for installation
```

### 🗄️ **Step 3: Database Setup**
```
8. Open MySQL Command Line (or MySQL Workbench)
9. Create database:
   CREATE DATABASE manodarsh;
   
10. Copy environment file:
    copy C:\CRPF_System\backend\.env.example C:\CRPF_System\backend\.env
    
11. Edit C:\CRPF_System\backend\.env:
    DB_NAME=manodarsh
    DB_USER=root
    DB_PASSWORD=crpf@2024
    DB_HOST=localhost
    DB_PORT=3306
    
12. Import database schema:
    mysql -u root -p manodarsh < C:\CRPF_System\backend\db\schema.sql
```

### 🚀 **Step 4: System Launch**
```
13. Double-click: C:\CRPF_System\CRPF_Mental_Health_System.exe
14. Wait 1 minute for startup
15. Browser opens automatically - System ready!
```

---

### ✅ **Success Indicators**
- Desktop shortcut created
- Browser opens to localhost:3000
- Login page appears
- No error messages in console

### 🔍 **Troubleshooting**
| Problem | Solution |
|---------|----------|
| "Python not found" | Install Python 3.8+ with PATH |
| "npm not found" | Install Node.js 16+ |
| Database connection error | Check MySQL service & credentials |
| Port 3000/5000 in use | Close other applications |
| Browser doesn't open | Wait longer or open localhost:3000 manually |

---

**Total Installation Time**: 30-45 minutes  
**Daily Startup Time**: 1 minute  
**System Status**: Ready for CRPF Personnel Use ✅
