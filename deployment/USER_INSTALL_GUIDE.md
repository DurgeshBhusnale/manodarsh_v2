# CRPF Mental Health System - User Installation Guide

## 📋 For End Users (CRPF Personnel)

This guide is for CRPF personnel who need to install and use the Mental Health & Wellness System.

---

## 💻 System Requirements

### Minimum Requirements
- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **Processor**: Intel Core i3 or equivalent
- **RAM**: 4 GB
- **Storage**: 2 GB free disk space
- **Display**: 1280x720 resolution
- **Camera**: Built-in or USB webcam (required for surveys)
- **Internet**: Not required (system works 100% offline)

### Recommended Requirements
- **Operating System**: Windows 10/11 (64-bit)
- **Processor**: Intel Core i5 or better
- **RAM**: 8 GB or more
- **Storage**: 5 GB free disk space
- **Display**: 1920x1080 resolution
- **Camera**: HD USB webcam with microphone

---

## 📥 Installation Steps

### Step 1: Download the Installer

1. Obtain `CRPF_System_Setup.exe` from your IT administrator
2. File size: ~900 MB
3. Save to your Downloads folder or Desktop

### Step 2: Run the Installer

1. **Right-click** on `CRPF_System_Setup.exe`
2. Select **"Run as administrator"**
3. Click **"Yes"** when Windows asks for permission

### Step 3: Follow Installation Wizard

#### Welcome Screen
- Click **"Next"** to begin

#### License Agreement (if shown)
- Read the agreement
- Click **"I Agree"** to continue

#### Choose Installation Location
- **Default**: `C:\Program Files\CRPF_System\`
- **Or**: Click "Browse" to choose different location
- Ensure you have 2 GB free space
- Click **"Next"**

#### Select Components
Choose what you want:
- ☑ **Desktop Shortcut** (Recommended) - Creates icon on desktop
- ☑ **Start Menu Entry** (Recommended) - Adds to Start menu
- ☐ **Start with Windows** (Optional) - Auto-starts on computer boot

Click **"Next"**

#### Installation Progress
- Wait 5-10 minutes while system installs
- Progress bar shows:
  - Extracting files...
  - Installing Python runtime...
  - Installing database...
  - Configuring system...

#### Completion
- ☑ **Launch CRPF Mental Health System** (Recommended)
- Click **"Finish"**

---

## 🚀 First Time Use

### Initial Launch

1. **Find the Icon**:
   - Desktop: Double-click "CRPF Mental Health System"
   - OR Start Menu: Search for "CRPF"

2. **System Starts** (30-60 seconds):
   - Console window opens (shows system starting)
   - System tray icon appears (bottom-right corner)
   - Browser opens automatically

3. **Login Page Appears**:
   - You'll see the CRPF login screen
   - System is ready!

### Default Login (Administrators Only)

**For first-time setup by admin:**
- **Force ID**: `CRPF000001`
- **Password**: `admin123`

⚠️ **IMPORTANT**: Change this password immediately after first login!

### Normal Users

Regular CRPF personnel will:
1. Receive Force ID from administrator
2. Receive temporary password
3. Change password on first login

---

## 📱 Using the System

### Daily Routine

1. **Start System**:
   - Double-click desktop icon
   - Wait for browser to open (~30 seconds)

2. **Login**:
   - Enter your Force ID
   - Enter your password
   - Click "Login"

3. **Take Survey** (when scheduled):
   - Click "Start Survey" when notified
   - Answer questions honestly
   - Allow camera access when prompted
   - Complete all questions
   - Submit survey

4. **View Reports** (if authorized):
   - Dashboard shows your mental health trends
   - View past survey results
   - See recommendations

5. **Logout**:
   - Click your name (top-right)
   - Click "Logout"

### System Tray Icon

Look for CRPF icon in system tray (bottom-right, near clock):

**Right-click the icon for options:**
- **Open System** - Opens browser to login page
- **Restart** - Restarts the system (if having issues)
- **Stop System** - Closes the application

---

## 🎥 Camera Setup

### First Survey Camera Access

1. Browser will ask: "Allow camera access?"
2. Click **"Allow"**
3. Select your camera from dropdown (if multiple)
4. Test: You should see yourself on screen

### External USB Webcam (Recommended)

If using external USB webcam:

1. **Plug in webcam** before starting survey
2. Wait 10 seconds for Windows to recognize it
3. Start survey
4. When asked, select the USB camera
5. Should work immediately

### Troubleshooting Camera

**Camera not detected?**
1. Check USB connection (try different port)
2. Go to Settings → Camera Diagnostics
3. Run camera test
4. Follow on-screen instructions

**Camera showing black screen?**
1. Close and reopen browser
2. Restart system (right-click tray icon → Restart)
3. Check camera privacy settings in Windows

---

## 🛑 Stopping the System

### Normal Shutdown

**Option 1: System Tray (Recommended)**
1. Right-click CRPF icon in system tray
2. Click "Stop System"
3. Wait 5 seconds
4. System closes cleanly

**Option 2: Close Console Window**
1. Find console window (black window with text)
2. Press Ctrl+C
3. OR click X to close
4. System stops

### What Happens When You Stop

- All processes terminate
- Database is closed safely
- No data is lost
- You can restart anytime

---

## ⚙️ Settings & Configuration

### Change Password

1. Login to system
2. Click your name (top-right)
3. Click "Profile" or "Settings"
4. Click "Change Password"
5. Enter current password
6. Enter new password (twice)
7. Click "Save"

### Camera Settings

1. Login as admin
2. Go to Settings → Camera Configuration
3. Choose camera device
4. Test camera
5. Save settings

### System Preferences

- Language: English/Hindi (if available)
- Notifications: On/Off
- Session timeout: Default 30 minutes

---

## 🔧 Troubleshooting

### System Won't Start

**Problem**: Double-clicking icon does nothing

**Solutions**:
1. Check if already running (look for tray icon)
2. Try right-clicking icon → "Run as administrator"
3. Restart computer
4. Check Windows Event Viewer for errors

### Browser Doesn't Open

**Problem**: System starts but browser doesn't open

**Solutions**:
1. Manually open browser
2. Go to: `http://localhost:5000`
3. Check firewall isn't blocking port 5000
4. Try different browser (Chrome, Edge, Firefox)

### Can't Login

**Problem**: "Invalid credentials" error

**Solutions**:
1. Check Force ID is correct (case-sensitive)
2. Check password (no extra spaces)
3. Contact administrator for password reset
4. For admin: Use default CRPF000001 / admin123

### Camera Not Working

**Problem**: Camera shows error or black screen

**Solutions**:
1. **Check USB connection** (if external camera)
2. **Check camera privacy**:
   - Windows Settings → Privacy → Camera
   - Allow apps to access camera
3. **Close other apps** using camera (Zoom, Teams, Skype)
4. **Restart browser**
5. **Run camera diagnostic**:
   - Settings → Camera Diagnostics

### System Running Slow

**Problem**: System is slow or freezing

**Solutions**:
1. Close other applications
2. Restart system (right-click tray → Restart)
3. Check disk space (need 1 GB free)
4. Check RAM usage (Task Manager)
5. Restart computer

### Database Errors

**Problem**: "Database connection failed" message

**Solutions**:
1. Restart system
2. Check if MySQL is running (Task Manager → Details → mysqld.exe)
3. Check logs: `C:\Program Files\CRPF_System\logs\`
4. Contact IT support if persists

---

## 🗑️ Uninstalling

### How to Uninstall

1. **Windows Settings**:
   - Open Windows Settings (Win + I)
   - Click "Apps"
   - Search for "CRPF Mental Health System"
   - Click on it
   - Click "Uninstall"
   - Click "Yes" to confirm

2. **Follow Uninstaller**:
   - Stop running application? → Yes
   - Delete all data? → Choose:
     - **Yes** = Complete removal (can't recover data)
     - **No** = Keep database (can reinstall later)

3. **Manual Cleanup** (if needed):
   - Delete: `C:\Program Files\CRPF_System\`
   - Remove desktop shortcut
   - Remove Start menu entry

---

## 📂 File Locations

### Installation Directory
`C:\Program Files\CRPF_System\`

### Important Folders
- **Logs**: `C:\Program Files\CRPF_System\logs\`
- **Database**: `C:\Program Files\CRPF_System\mysql\data\`
- **Configuration**: `C:\Program Files\CRPF_System\config\`

### Desktop Shortcut
`C:\Users\[YourName]\Desktop\CRPF Mental Health System.lnk`

---

## 🆘 Getting Help

### Self-Help Resources

1. **Check Logs**:
   - Go to: `C:\Program Files\CRPF_System\logs\`
   - Open: `backend.log`, `mysql.log`, `launcher.log`
   - Look for error messages

2. **System Tray Icon**:
   - Shows if system is running
   - Right-click for options
   - Restart if having issues

3. **Windows Event Viewer**:
   - Press Win+X → Event Viewer
   - Look under Application logs

### Contact Support

**IT Support Email**: support@crpf.gov.in

**When contacting support, provide:**
- Your Force ID
- Error message (screenshot if possible)
- What you were doing when error occurred
- Log files from `logs\` folder

### Emergency Contact

For urgent system issues affecting multiple users:
- Contact: Your unit's IT administrator
- Escalate: CRPF IT Helpdesk

---

## 📊 System Status Indicators

### System Tray Icon Colors/States

- **Green dot**: System running normally
- **Yellow dot**: Warning (check logs)
- **Red dot**: Error (needs attention)
- **No icon**: System not running

### Browser Page Indicators

- **Login page**: System working, ready to use
- **Loading...**: System starting, wait a moment
- **Error 500**: Backend issue, restart system
- **Connection refused**: System not started

---

## 🔐 Security & Privacy

### Data Storage

- All data stored **locally** on your computer
- No data sent to internet
- No cloud storage
- 100% offline operation

### Access Control

- Each user has unique Force ID
- Password-protected
- Admin can reset passwords
- Session timeout after 30 minutes idle

### Camera Privacy

- Camera only activates during surveys
- Video is not recorded or stored
- Only emotion analysis is performed
- Red indicator shows when camera is active

---

## ✅ Best Practices

### Daily Use

1. **Start system when you begin work**
2. **Complete surveys promptly when notified**
3. **Be honest in responses** (helps you get better support)
4. **Logout when done** (don't just close browser)
5. **Stop system when leaving** (right-click tray → Stop)

### Camera Use

1. **Use external USB webcam** (better quality)
2. **Good lighting** (face clearly visible)
3. **Look at camera** during emotion capture
4. **Neutral expression** first, then natural

### System Health

1. **Restart weekly** (keeps system fresh)
2. **Check for updates** (when notified)
3. **Report issues immediately** (don't wait)
4. **Keep Windows updated**

---

## 📞 Quick Reference

### Quick Actions

| Action | How To |
|--------|--------|
| Start System | Double-click desktop icon |
| Login | Force ID + Password |
| Start Survey | Click "Start Survey" button |
| Logout | Click name → Logout |
| Stop System | Right-click tray icon → Stop |
| Restart System | Right-click tray icon → Restart |
| Get Help | Settings → Help → View Logs |

### Common URLs

| Page | URL |
|------|-----|
| Login | http://localhost:5000 |
| Dashboard | http://localhost:5000/dashboard |
| Settings | http://localhost:5000/settings |

### Default Credentials

| User Type | Force ID | Password |
|-----------|----------|----------|
| Admin (first time) | CRPF000001 | admin123 |
| Regular User | [Your Force ID] | [From Admin] |

---

**Remember**: This system is here to help you. Be honest in your responses, use it regularly, and reach out for support if needed. Your mental health matters! 🙏

---

*CRPF Mental Health & Wellness System - Version 1.0*
*For Windows 10/11 - 64-bit*
*© 2024 CRPF Development Team*
