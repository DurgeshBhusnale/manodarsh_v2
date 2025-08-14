# CRPF Mental Health System - Deployment Package

## Overview
This is a complete deployment package for the CRPF Mental Health & Wellness System. The system is designed to run offline on a single computer at CRPF facilities for maximum security.

## Package Contents
```
CRPF-Mental-Health-System/
├── backend/                 # Flask backend application
├── frontend/               # React frontend application
├── deployment/             # Deployment tools and scripts
│   ├── crpf_launcher.py   # Main system launcher
│   ├── install.bat        # Installation script
│   ├── config.json        # System configuration
│   └── requirements.txt   # Python dependencies
├── database/              # Database setup files
└── docs/                 # Documentation
```

## System Requirements
- **Operating System**: Windows 10/11
- **RAM**: Minimum 8GB
- **Storage**: 50GB available space
- **Software Requirements**:
  - Python 3.8 or higher
  - Node.js 16 or higher
  - MySQL 8.0 or higher

## Installation Instructions

### For CRPF IT Personnel:

1. **Copy Project Folder**
   - Copy the entire CRPF-Mental-Health-System folder to the target computer
   - Recommended location: `C:\CRPF-System\`

2. **Install Dependencies**
   - Right-click `deployment\install.bat`
   - Select "Run as administrator"
   - Follow the installation prompts

3. **Database Setup**
   - Ensure MySQL is running
   - Configure database credentials in `backend\.env`
   - Run initial database setup if needed

4. **Test Installation**
   - Double-click the desktop shortcut "CRPF Mental Health System"
   - System should start automatically
   - Browser should open to the application

## Daily Usage

### For CRPF Personnel:
1. **Starting the System**
   - Double-click "CRPF Mental Health System" icon on desktop
   - Wait for system to start (approximately 15 seconds)
   - Browser will automatically open to the login page

2. **Using the System**
   - Login with your CRPF credentials
   - Use the system normally for assessments and monitoring
   - All data is stored locally and securely

3. **Closing the System**
   - Simply close the browser when done
   - To completely stop the system: Double-click the desktop icon again
   - Choose "Stop System" when prompted

## Features
- **One-Click Operation**: Single icon starts everything automatically
- **Offline Security**: No internet connection required
- **Auto-Start**: Backend and frontend start automatically
- **Browser Integration**: Opens directly in default browser
- **Process Management**: Handles startup, monitoring, and shutdown
- **Error Recovery**: Automatic error detection and reporting

## Security Features
- Completely offline operation
- Local database storage only
- No external network access required
- Session-based authentication
- Automatic session timeout
- Secure data encryption

## Troubleshooting

### Common Issues:

**System doesn't start:**
- Check if MySQL service is running
- Verify Python and Node.js are installed
- Run installation script again

**Database connection errors:**
- Check MySQL service status
- Verify credentials in backend\.env
- Ensure database exists and is accessible

**Browser doesn't open:**
- Wait longer (system may still be starting)
- Manually go to http://localhost:3000
- Check Windows Defender/Firewall settings

**Port conflicts:**
- Ensure ports 3000 and 5000 are not used by other applications
- Restart the computer if necessary

### Getting Help:
- Check the troubleshooting section in user manual
- Contact development team for technical support
- Review system logs in the logs/ directory

## Technical Details

### System Architecture:
- **Frontend**: React.js application (port 3000)
- **Backend**: Flask API server (port 5000) 
- **Database**: MySQL local instance
- **Launcher**: Python-based system manager

### File Structure:
- **Configuration**: deployment/config.json
- **Logs**: logs/ directory
- **Database**: MySQL data directory
- **Uploads**: backend/storage/uploads/
- **Models**: backend/storage/models/

## Maintenance

### Regular Tasks:
- **Database Backup**: Run backup script weekly
- **Log Cleanup**: Clear old logs monthly  
- **System Updates**: Apply updates as provided
- **Security Checks**: Regular security assessments

### Update Procedure:
1. Stop the current system
2. Backup database and configuration
3. Replace application files with new version
4. Run update script
5. Test system functionality

## Support Information
- **Version**: 1.0.0
- **Last Updated**: August 2025
- **Developed For**: Central Reserve Police Force
- **Support Contact**: [Development Team Contact Information]

---

**CONFIDENTIAL - FOR CRPF USE ONLY**
This system contains sensitive mental health information and should be handled according to CRPF security protocols.
