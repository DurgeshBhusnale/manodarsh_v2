
# Deployment Guide

This document summarizes the recommended deployment strategies for the CRPF Mental Health Monitoring System, including scripts and commands for each approach.

---

## Standard Web Deployment

### Backend (Flask)

1. **Install Python dependencies:**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # or
   source venv/bin/activate  # Linux/Mac
   pip install -r backend/requirements.txt
   ```
2. **Set up the database:**
   - Run schema and initial scripts in `backend/db/`.
3. **Start the backend server:**
   ```bash
   python backend/app.py
   ```

### Frontend (React)

1. **Install Node.js dependencies:**
   ```bash
   cd frontend
   npm install
   ```
2. **Build the frontend for production:**
   ```bash
   npm run build
   ```
3. **Serve the build (static server or nginx/apache):**
   ```bash
   npx serve -s build
   ```

### Environment Configuration

- Set environment variables as needed (API URLs, DB credentials).
- Update `frontend/.env` and `backend/.env` if present.

### Production Deployment

- Use a process manager (e.g., `pm2` for Node, `gunicorn` for Python).
- Set up reverse proxy (nginx/apache) to route frontend and backend.
- Secure the server (firewall, HTTPS, etc.).
- Monitor logs and set up backups.

---

## Windows Executable Deployment

### Backend (Flask) as EXE

1. **Install PyInstaller:**
   ```bash
   pip install pyinstaller
   ```
2. **Build the executable:**
   ```bash
   pyinstaller --onefile --add-data "backend/db;db" --add-data "backend/model;model" backend/app.py
   ```
   - Adjust `--add-data` for any folders/files your app needs.
   - The `.exe` will be in the `dist` folder.

### Frontend (React) as EXE

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```
2. **Wrap with Electron:**
   - Install Electron:
     ```bash
     npm install electron --save-dev
     ```
   - Create a minimal `main.js` to serve your build folder.
   - Use electron-builder to package as `.exe`:
     ```bash
     npm install electron-builder --save-dev
     npx electron-builder --win
     ```
   - The `.exe` will be in the `dist` folder.

---

## Single EXE (Fullstack Desktop App)

Combine backend and frontend into one executable using Electron:

1. **Build Flask backend as EXE:**
   ```bash
   pip install pyinstaller
   pyinstaller --onefile backend/app.py
   ```
2. **Build React frontend:**
   ```bash
   cd frontend
   npm run build
   ```
3. **Create Electron project:**
   ```bash
   npm init -y
   npm install electron electron-builder --save-dev
   ```
4. **Electron main.js example:**
   ```js
   const { app, BrowserWindow } = require('electron');
   const { execFile } = require('child_process');
   let backend;

   function createWindow() {
     backend = execFile('app.exe'); // Start Flask backend
     const win = new BrowserWindow({
       width: 1200,
       height: 800,
       webPreferences: { nodeIntegration: false }
     });
     win.loadFile('frontend/build/index.html');
     win.on('closed', () => {
       if (backend) backend.kill();
     });
   }

   app.on('ready', createWindow);
   app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') app.quit();
   });
   ```
5. **Configure electron-builder in package.json:**
   ```json
   "main": "main.js",
   "build": {
     "appId": "your.app.id",
     "win": { "target": "nsis" }
   }
   ```
6. **Build the installer:**
   ```bash
   npx electron-builder --win
   ```
   - This will generate a single installer `.exe` that launches both backend and frontend together.

---

**Result:**
You get one `.exe` that starts the backend server and opens the React frontend in a desktop window.
