# CRPF Mental Health Monitoring System - Deployment Guide

## Production Deployment Checklist

### Pre-Deployment Requirements

#### System Requirements

- **OS**: Ubuntu 20.04 LTS or CentOS 8 (recommended for production)
- **CPU**: Minimum 2 cores, 4 cores recommended
- **RAM**: Minimum 8GB, 16GB recommended
- **Storage**: Minimum 50GB, SSD recommended
- **Network**: Stable internet connection with firewall configuration

#### Software Dependencies

- **Python**: 3.8 or higher
- **Node.js**: 16.x LTS or higher
- **MySQL**: 8.0 or higher
- **Nginx**: 1.18 or higher (web server/reverse proxy)
- **PM2**: Process manager for Node.js applications
- **Supervisor**: Process manager for Python applications

### Step 1: Server Setup and Security

#### Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git build-essential software-properties-common

# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5000  # Backend API (temporary, will be proxied)
```

#### Create Application User

```bash
# Create dedicated user for the application
sudo adduser crpf_monitor
sudo usermod -aG sudo crpf_monitor
sudo su - crpf_monitor
```

#### SSL Certificate Setup

```bash
# Install Certbot for Let's Encrypt SSL
sudo apt install certbot python3-certbot-nginx

# Generate SSL certificate (replace your-domain.com)
sudo certbot --nginx -d your-domain.com
```

### Step 2: Database Setup

#### Install and Configure MySQL

```bash
# Install MySQL Server
sudo apt install mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Create production database and user
sudo mysql -u root -p
```

```sql
-- Create production database
CREATE DATABASE crpf_mental_health_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated database user
CREATE USER 'crpf_prod_user'@'localhost' IDENTIFIED BY 'STRONG_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON crpf_mental_health_prod.* TO 'crpf_prod_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Configure MySQL for Production

```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add these optimizations:

```ini
[mysqld]
# Performance tuning
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
max_connections = 200
query_cache_type = 1
query_cache_size = 128M

# Security
bind-address = 127.0.0.1
local-infile = 0
```

```bash
# Restart MySQL
sudo systemctl restart mysql
```

### Step 3: Backend Deployment

#### Clone and Setup Application

```bash
# Clone repository to production location
cd /opt
sudo git clone <repository-url> crpf_monitor
sudo chown -R crpf_monitor:crpf_monitor /opt/crpf_monitor
cd /opt/crpf_monitor

# Setup Python virtual environment
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### Production Environment Configuration

```bash
# Create production environment file
cp .env.example .env.prod
nano .env.prod
```

Configure production environment:

```bash
# Database Configuration
DB_NAME=crpf_mental_health_prod
DB_USER=crpf_prod_user
DB_PASSWORD=STRONG_SECURE_PASSWORD
DB_HOST=localhost
DB_PORT=3306

# Server Configuration
BACKEND_PORT=5000
FRONTEND_URL=https://your-domain.com
DEBUG_MODE=false

# Security Configuration
SECRET_KEY=GENERATE_STRONG_SECRET_KEY_HERE
SESSION_TIMEOUT=1800
MAX_LOGIN_ATTEMPTS=3
PASSWORD_MIN_LENGTH=8

# Mental Health Scoring Configuration
NLP_WEIGHT=0.7
EMOTION_WEIGHT=0.3

# Risk Level Thresholds
RISK_LOW_THRESHOLD=0.3
RISK_MEDIUM_THRESHOLD=0.5
RISK_HIGH_THRESHOLD=0.7
RISK_CRITICAL_THRESHOLD=0.85

# Camera and Emotion Detection Configuration
CAMERA_WIDTH=640
CAMERA_HEIGHT=480
DETECTION_INTERVAL=30

# Performance Configuration
PAGE_SIZE=20
MAX_PAGE_SIZE=100

# Notification Configuration
EMAIL_ENABLED=true
SMS_ENABLED=false

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE_PATH=/opt/crpf_monitor/logs/app.log
```

#### Initialize Production Database

```bash
# Load database schema
mysql -u crpf_prod_user -p crpf_mental_health_prod < db/schema.sql

# Run any migration scripts
python db/init_db.py
```

#### Setup Process Manager (Supervisor)

```bash
# Install Supervisor
sudo apt install supervisor

# Create Supervisor configuration
sudo nano /etc/supervisor/conf.d/crpf_backend.conf
```

```ini
[program:crpf_backend]
command=/opt/crpf_monitor/backend/venv/bin/python app.py
directory=/opt/crpf_monitor/backend
user=crpf_monitor
autostart=true
autorestart=true
stderr_logfile=/var/log/crpf_backend.err.log
stdout_logfile=/var/log/crpf_backend.out.log
environment=PYTHONPATH="/opt/crpf_monitor/backend"
```

```bash
# Update Supervisor and start service
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start crpf_backend
```

### Step 4: Frontend Deployment

#### Build Production Frontend

```bash
cd /opt/crpf_monitor/frontend

# Install Node.js dependencies
npm ci --production

# Create production environment
cp .env.example .env.production
nano .env.production
```

Configure frontend production environment:

```bash
# API Configuration
REACT_APP_API_URL=https://your-domain.com/api

# Feature Flags
REACT_APP_ENABLE_ADVANCED_SEARCH=true
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_MOBILE_LAYOUT=true
REACT_APP_ENABLE_REAL_TIME_UPDATES=true

# UI Settings
REACT_APP_DEFAULT_PAGE_SIZE=20
REACT_APP_MAX_PAGE_SIZE=100
REACT_APP_SESSION_TIMEOUT=1800000

# Performance Settings
REACT_APP_ENABLE_CACHING=true
REACT_APP_CACHE_DURATION=300000

# Security Settings
REACT_APP_ENABLE_CSP=true
REACT_APP_SECURE_COOKIES=true
```

```bash
# Build production bundle
npm run build

# Copy build to web server directory
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/
```

### Step 5: Web Server Configuration (Nginx)

#### Install and Configure Nginx

```bash
# Install Nginx
sudo apt install nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/crpf_monitor
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' wss:";

    # Root directory for frontend
    root /var/www/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Frontend routes (React Router)
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support (if needed for real-time features)
    location /ws/ {
        proxy_pass http://127.0.0.1:5000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security - deny access to sensitive files
    location ~ /\. {
        deny all;
    }

    location ~ \.(sql|conf|log)$ {
        deny all;
    }
}
```

```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/crpf_monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Monitoring and Logging Setup

#### Log Rotation Configuration

```bash
# Create log rotation config
sudo nano /etc/logrotate.d/crpf_monitor
```

```
/opt/crpf_monitor/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        supervisorctl restart crpf_backend
    endscript
}
```

#### System Monitoring Setup

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs fail2ban

# Configure fail2ban for security
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Step 7: Backup Strategy

#### Database Backup Script

```bash
# Create backup directory
sudo mkdir -p /opt/backups/database
sudo chown crpf_monitor:crpf_monitor /opt/backups

# Create backup script
nano /opt/crpf_monitor/scripts/backup_database.sh
```

```bash
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/backups/database"
DB_NAME="crpf_mental_health_prod"
DB_USER="crpf_prod_user"
DB_PASS="STRONG_SECURE_PASSWORD"

# Create backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/backup_$TIMESTAMP.sql

# Compress backup
gzip $BACKUP_DIR/backup_$TIMESTAMP.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Database backup completed: backup_$TIMESTAMP.sql.gz"
```

```bash
# Make executable
chmod +x /opt/crpf_monitor/scripts/backup_database.sh

# Add to crontab for daily backups
crontab -e
```

Add this line:

```
0 2 * * * /opt/crpf_monitor/scripts/backup_database.sh >> /var/log/backup.log 2>&1
```

#### Application Files Backup

```bash
# Create application backup script
nano /opt/crpf_monitor/scripts/backup_application.sh
```

```bash
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/backups/application"
APP_DIR="/opt/crpf_monitor"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files (exclude node_modules and venv)
tar -czf $BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='*.pyc' \
    --exclude='__pycache__' \
    --exclude='build' \
    -C /opt crpf_monitor

# Remove backups older than 14 days
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +14 -delete

echo "Application backup completed: app_backup_$TIMESTAMP.tar.gz"
```

### Step 8: Health Checks and Monitoring

#### Health Check Endpoint

Add to backend `app.py`:

```python
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check database connection
        db = get_connection()
        cursor = db.cursor()
        cursor.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return jsonify({
        "status": "healthy" if db_status == "healthy" else "unhealthy",
        "timestamp": datetime.now().isoformat(),
        "database": db_status,
        "version": "1.0.0"
    })
```

#### Monitoring Script

```bash
# Create monitoring script
nano /opt/crpf_monitor/scripts/health_monitor.sh
```

```bash
#!/bin/bash
URL="https://your-domain.com/health"
LOG_FILE="/var/log/health_monitor.log"

# Check health endpoint
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -eq 200 ]; then
    echo "$(date): Health check passed" >> $LOG_FILE
else
    echo "$(date): Health check failed - HTTP $RESPONSE" >> $LOG_FILE
    # Send alert email (configure mail system)
    echo "CRPF Monitor health check failed" | mail -s "Alert: Service Down" admin@your-domain.com
fi
```

### Step 9: Performance Optimization

#### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX idx_surveys_force_id ON surveys(force_id);
CREATE INDEX idx_surveys_created_at ON surveys(created_at);
CREATE INDEX idx_responses_survey_id ON responses(survey_id);
CREATE INDEX idx_soldiers_unit ON soldiers(unit);
CREATE INDEX idx_notifications_force_id ON notifications(force_id);
CREATE INDEX idx_notifications_read_status ON notifications(is_read);

-- Analyze tables for optimization
ANALYZE TABLE soldiers, surveys, responses, questions, questionnaires, notifications;
```

#### Application Cache Configuration

```bash
# Install Redis for caching (optional)
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
```

Update backend to use caching:

```python
# Add to requirements.txt
redis==4.3.4

# Add to settings
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CACHE_TIMEOUT = int(os.getenv('CACHE_TIMEOUT', 300))
```

### Step 10: Security Hardening

#### System Security

```bash
# Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no

# Configure automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

#### Application Security

- Change all default passwords
- Enable HTTPS everywhere
- Implement rate limiting
- Regular security audits
- Keep dependencies updated

### Step 11: Deployment Automation

#### Deployment Script

```bash
# Create deployment script
nano /opt/crpf_monitor/scripts/deploy.sh
```

```bash
#!/bin/bash
set -e

echo "Starting deployment..."

# Backup current version
./backup_application.sh

# Pull latest code
cd /opt/crpf_monitor
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Update frontend
cd ../frontend
npm ci --production
npm run build
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

# Restart services
sudo supervisorctl restart crpf_backend
sudo systemctl reload nginx

# Run health check
sleep 10
curl -f https://your-domain.com/health

echo "Deployment completed successfully!"
```

### Step 12: Final Verification

#### Post-Deployment Checklist

- [ ] Database connection working
- [ ] All API endpoints responding
- [ ] Frontend loading correctly
- [ ] SSL certificate valid
- [ ] Backup systems functioning
- [ ] Monitoring systems active
- [ ] Performance acceptable
- [ ] Security measures in place

#### Load Testing

```bash
# Install Apache Bench for load testing
sudo apt install apache2-utils

# Test API endpoints
ab -n 1000 -c 10 https://your-domain.com/api/health

# Test frontend
ab -n 1000 -c 10 https://your-domain.com/
```

### Maintenance Schedule

#### Daily Tasks

- Monitor system health
- Check log files
- Verify backup completion

#### Weekly Tasks

- Review performance metrics
- Update security patches
- Database maintenance

#### Monthly Tasks

- Full system backup
- Security audit
- Performance optimization review
- Dependency updates

This deployment guide ensures a secure, scalable, and maintainable production environment for the CRPF Mental Health Monitoring System.
