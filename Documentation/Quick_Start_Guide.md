# CRPF Mental Health Monitoring System - Quick Start Guide

## Prerequisites

### System Requirements

- **Operating System**: Windows 10/11, macOS 10.15+, or Linux Ubuntu 18.04+
- **Python**: Version 3.8 or higher
- **Node.js**: Version 14 or higher
- **MySQL**: Version 8.0 or higher
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+

### Hardware Requirements

- **Minimum RAM**: 4GB (8GB recommended)
- **Storage**: 5GB free space
- **Camera**: Optional (for emotion detection features)
- **Network**: Stable internet connection

## Installation Steps

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd manodarsh_v2
```

### Step 2: Database Setup

1. **Install MySQL** and create a database:

```sql
CREATE DATABASE crpf_mental_health;
CREATE USER 'crpf_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON crpf_mental_health.* TO 'crpf_user'@'localhost';
FLUSH PRIVILEGES;
```

2. **Initialize the database schema**:

```bash
cd backend
mysql -u crpf_user -p crpf_mental_health < db/schema.sql
```

### Step 3: Backend Setup

1. **Navigate to backend directory**:

```bash
cd backend
```

2. **Create virtual environment**:

```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

3. **Install dependencies**:

```bash
pip install -r requirements.txt
```

4. **Create environment configuration**:

```bash
# Copy the example and edit with your settings
cp .env.example .env
```

5. **Configure environment variables** in `.env`:

```bash
# Database Configuration
DB_NAME=crpf_mental_health
DB_USER=crpf_user
DB_PASSWORD=secure_password
DB_HOST=localhost
DB_PORT=3306

# Application Settings
SECRET_KEY=your-secret-key-here
DEBUG_MODE=true

# Mental Health Scoring
NLP_WEIGHT=0.7
EMOTION_WEIGHT=0.3

# Risk Thresholds
RISK_LOW_THRESHOLD=0.3
RISK_MEDIUM_THRESHOLD=0.5
RISK_HIGH_THRESHOLD=0.7
RISK_CRITICAL_THRESHOLD=0.85

# Camera Settings (if using emotion detection)
CAMERA_WIDTH=640
CAMERA_HEIGHT=480
DETECTION_INTERVAL=30
```

### Step 4: Frontend Setup

1. **Navigate to frontend directory**:

```bash
cd ../frontend
```

2. **Install dependencies**:

```bash
npm install
```

3. **Create environment configuration**:

```bash
# Copy the example and edit with your settings
cp .env.example .env
```

4. **Configure frontend environment** in `.env`:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api

# Feature Flags
REACT_APP_ENABLE_ADVANCED_SEARCH=true
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_MOBILE_LAYOUT=true
REACT_APP_ENABLE_REAL_TIME_UPDATES=true

# UI Settings
REACT_APP_DEFAULT_PAGE_SIZE=10
REACT_APP_MAX_PAGE_SIZE=100
REACT_APP_SESSION_TIMEOUT=900000

# Performance Settings
REACT_APP_ENABLE_CACHING=true
REACT_APP_CACHE_DURATION=300000
```

## Running the Application

### Step 1: Start the Backend Server

```bash
# From the backend directory with virtual environment activated
cd backend
python app.py
```

The backend server will start on `http://localhost:5000`

### Step 2: Start the Frontend Development Server

```bash
# From the frontend directory
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

### Step 3: Access the Application

Open your web browser and navigate to `http://localhost:3000`

## Initial Configuration

### Step 1: Create Admin Account

1. Navigate to the **Admin Registration** page
2. Fill in admin credentials:
   - **Force ID**: Use format like `ADM000001`
   - **Name**: Your full name
   - **Password**: Strong password
   - **Role**: Select "Admin"

### Step 2: Configure System Settings

1. Log in with admin credentials
2. Navigate to **Admin → System Settings**
3. Configure key settings:
   - **Mental Health Scoring**: Adjust NLP/Emotion weights
   - **Risk Assessment**: Set appropriate thresholds
   - **Security**: Configure session timeout
   - **Performance**: Set pagination preferences

### Step 3: Add Initial Data

1. **Add Units**: Navigate to **Admin → Unit Management**
2. **Register Soldiers**: Use **Admin → Soldier Registration**
3. **Create Surveys**: Set up initial mental health surveys

## First Survey Setup

### Step 1: Create Survey Categories

1. Go to **Admin → Survey Management**
2. Add categories like:
   - "Daily Wellness Check"
   - "Weekly Assessment"
   - "Monthly Detailed Survey"
   - "Stress Level Monitoring"

### Step 2: Configure Survey Questions

Add questions for mental health assessment:

```
1. "How are you feeling today overall?"
2. "Rate your stress level from 1-10"
3. "Any specific concerns or worries?"
4. "How well did you sleep last night?"
5. "Any physical symptoms of stress?"
```

### Step 3: Set Scoring Parameters

1. Navigate to **System Settings → Mental Health Scoring**
2. Adjust scoring weights:
   - **NLP Analysis Weight**: 70% (default)
   - **Emotion Detection Weight**: 30% (default)
3. Configure risk thresholds based on your requirements

## Testing the System

### Step 1: Register Test Soldier

1. Create a test soldier profile
2. Use Force ID format: `TEST00001`
3. Complete all required fields

### Step 2: Submit Test Survey

1. Log in as the test soldier
2. Navigate to **Surveys**
3. Fill out a sample survey
4. Submit and review the results

### Step 3: Review Admin Dashboard

1. Log in as admin
2. Check **Dashboard** for updated statistics
3. Verify that the survey appears in recent activity
4. Confirm risk assessment calculations

## Feature Verification

### Advanced Search

1. Navigate to **Admin → Advanced Search**
2. Test various filters:
   - Risk level filtering
   - Date range selection
   - Score range filtering
3. Save a custom search preset
4. Export results to verify functionality

### Notification System

1. Create a high-risk scenario (low survey scores)
2. Check **Notifications** panel
3. Verify alert generation and priority levels
4. Test notification marking as read/unread

### Mobile Responsiveness

1. Access the application on mobile device
2. Test navigation and functionality
3. Verify responsive layout adaptation
4. Check touch-friendly interface elements

## Common Setup Issues and Solutions

### Database Connection Issues

**Problem**: "Database connection failed"
**Solution**:

1. Verify MySQL is running
2. Check database credentials in `.env`
3. Ensure database and user exist
4. Test connection manually:

```bash
mysql -u crpf_user -p -h localhost crpf_mental_health
```

### Port Conflicts

**Problem**: "Port already in use"
**Solution**:

1. **Backend**: Change port in `app.py`
2. **Frontend**: Use different port:

```bash
PORT=3001 npm start
```

### Environment Variable Issues

**Problem**: Settings not loading correctly
**Solution**:

1. Verify `.env` file exists in correct directory
2. Check variable names match exactly
3. Restart both servers after changes
4. Verify no spaces around `=` in `.env` files

### Permission Issues

**Problem**: File access denied
**Solution**:

1. **Windows**: Run as administrator
2. **macOS/Linux**: Check file permissions:

```bash
chmod 755 backend/
chmod 644 backend/.env
```

## Performance Optimization

### Database Optimization

1. **Index Creation**: Key columns are already indexed
2. **Connection Pooling**: Configured in settings
3. **Query Optimization**: Use pagination for large datasets

### Frontend Optimization

1. **Caching**: Enable in environment variables
2. **Lazy Loading**: Components load as needed
3. **Bundle Size**: Optimize with production build:

```bash
npm run build
```

### Security Configuration

1. **Change default passwords** immediately
2. **Use HTTPS** in production
3. **Configure firewall** rules
4. **Regular security updates**

## Production Deployment

### Backend Production Setup

1. **Use production WSGI server**:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

2. **Configure reverse proxy** (nginx recommended)
3. **Set up SSL certificates**
4. **Configure production database**

### Frontend Production Build

```bash
cd frontend
npm run build
# Serve the build folder with a web server
```

## Monitoring and Maintenance

### Regular Tasks

1. **Database Backup**: Daily automated backups
2. **Log Rotation**: Weekly log cleanup
3. **Security Updates**: Monthly system updates
4. **Performance Monitoring**: Continuous monitoring

### Health Check Endpoints

- **Backend Health**: `http://localhost:5000/api/health`
- **Database Status**: Check admin dashboard
- **System Metrics**: Available in admin panel

## Support and Resources

### Log Files

- **Backend Logs**: `backend/logs/app.log`
- **Database Logs**: MySQL error logs
- **Frontend Logs**: Browser developer console

### Debug Mode

Enable detailed logging:

```bash
# Backend
DEBUG_MODE=true

# Frontend
REACT_APP_DEBUG_MODE=true
```

### Backup Strategy

1. **Database**: Daily automated backups
2. **Configuration**: Version control for settings
3. **Files**: Regular backup of upload directories
4. **Code**: Git repository with proper branching

This quick start guide should help you get the CRPF Mental Health Monitoring System up and running efficiently. For detailed technical documentation, refer to the Enhanced Features Guide.
