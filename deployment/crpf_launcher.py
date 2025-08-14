"""
CRPF Mental Health System Launcher
Single-click solution for CRPF personnel
"""

import subprocess
import threading
import webbrowser
import time
import os
import sys
import json
import requests
import psutil
from pathlib import Path

class CRPFSystemLauncher:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.backend_process = None
        self.frontend_process = None
        self.config_file = self.project_root / "deployment" / "config.json"
        self.pid_file = self.project_root / "deployment" / "system.pid"
        
        # Load configuration
        self.config = self.load_config()
        
    def load_config(self):
        """Load system configuration"""
        default_config = {
            "system": {
                "name": "CRPF Mental Health & Wellness System",
                "version": "1.0.0"
            },
            "services": {
                "backend": {
                    "port": 5000,
                    "startup_delay": 3
                },
                "frontend": {
                    "port": 3000,
                    "startup_delay": 35
                },
                "browser": {
                    "auto_open": True,
                    "url": "http://localhost:3000"
                }
            }
        }
        
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r') as f:
                    return json.load(f)
        except:
            pass
        
        return default_config
    
    def is_system_running(self):
        """Check if system is already running"""
        if not self.pid_file.exists():
            return False
        
        try:
            with open(self.pid_file, 'r') as f:
                pids = json.load(f)
            
            # Check if processes are still running
            for pid in pids.values():
                if psutil.pid_exists(pid):
                    return True
            
            # If no processes running, remove pid file
            self.pid_file.unlink()
            return False
        except:
            return False
    
    def save_pids(self):
        """Save process IDs to file"""
        pids = {}
        if self.backend_process:
            pids['backend'] = self.backend_process.pid
        if self.frontend_process:
            pids['frontend'] = self.frontend_process.pid
        
        with open(self.pid_file, 'w') as f:
            json.dump(pids, f)
    
    def start_backend(self):
        """Start Flask backend"""
        print("🚀 Starting CRPF Backend Server...")
        
        backend_path = self.project_root / "backend"
        
        # Check for virtual environment first
        venv_python = backend_path / "venv" / "Scripts" / "python.exe"
        if venv_python.exists():
            python_cmd = str(venv_python)
        else:
            python_cmd = sys.executable
        
        cmd = [python_cmd, "app.py"]
        
        self.backend_process = subprocess.Popen(
            cmd,
            cwd=backend_path,
            creationflags=subprocess.CREATE_NO_WINDOW  # Hide console window
        )
        
        # Wait for backend to start
        time.sleep(self.config['services']['backend']['startup_delay'])
        
        # Verify backend is running
        for attempt in range(10):  # Increased attempts
            try:
                response = requests.get(f"http://localhost:{self.config['services']['backend']['port']}", timeout=3)
                if response.status_code in [200, 404]:  # 404 is also OK, means server is running
                    print("✅ Backend server is running")
                    return True
            except:
                time.sleep(2)  # Wait longer between attempts
        
        print("❌ Failed to start backend server")
        return False
    
    def start_frontend(self):
        """Start React frontend"""
        print("🌐 Starting CRPF Frontend...")
        
        frontend_path = self.project_root / "frontend"
        
        # Always prefer production build for faster startup
        build_path = frontend_path / "build"
        if build_path.exists():
            print("✅ Using optimized production build (faster startup)")
            # Use built version with npx serve
            cmd = ["npx", "serve", "-s", "build", "-l", str(self.config['services']['frontend']['port'])]
            startup_delay = 5  # Production build starts much faster
        else:
            print("⚠️  No production build found, using development mode (slower)")
            # Use development version
            cmd = ["npm", "start"]
            startup_delay = self.config['services']['frontend']['startup_delay']
        
        env = os.environ.copy()
        env['BROWSER'] = 'none'  # Prevent automatic browser opening
        
        self.frontend_process = subprocess.Popen(
            cmd,
            cwd=frontend_path,
            shell=True,
            env=env,
            creationflags=subprocess.CREATE_NO_WINDOW  # Hide console window
        )
        
        # Wait for frontend to start with progress indication
        print(f"⏳ Waiting {startup_delay} seconds for frontend to start...")
        
        for i in range(startup_delay):
            time.sleep(1)
            if i % 5 == 0 and i > 0:
                print(f"⏳ Still starting... ({i + 1}/{startup_delay} seconds)")
        
        # Check if frontend is responding
        max_attempts = 15 if startup_delay <= 5 else 10  # More attempts for production build
        for attempt in range(max_attempts):
            try:
                import urllib.request
                response = urllib.request.urlopen(f"http://localhost:{self.config['services']['frontend']['port']}", timeout=3)
                if response.status == 200:
                    print("✅ Frontend server is running and accessible")
                    return True
            except Exception as e:
                if attempt < max_attempts - 1:  # Don't show error on last attempt
                    print(f"⏳ Checking frontend... attempt {attempt + 1}/{max_attempts}")
                time.sleep(2)
        
        # If production build, wait a bit more as serve might take time
        if startup_delay <= 5:
            print("⏳ Production build may need extra time, waiting...")
            time.sleep(5)
            try:
                import urllib.request
                response = urllib.request.urlopen(f"http://localhost:{self.config['services']['frontend']['port']}", timeout=3)
                if response.status == 200:
                    print("✅ Frontend server is now running and accessible")
                    return True
            except:
                pass
        
        print("⚠️  Frontend process started - please check manually at http://localhost:3000")
        return True
    
    def open_browser(self):
        """Open system in default browser"""
        if self.config['services']['browser']['auto_open']:
            print("🌍 Opening CRPF Mental Health System...")
            time.sleep(2)  # Small delay before opening browser
            webbrowser.open(self.config['services']['browser']['url'])
    
    def start_system(self):
        """Start the complete CRPF system"""
        print("=" * 60)
        print("🏛️  CRPF MENTAL HEALTH & WELLNESS SYSTEM")
        print("    Central Reserve Police Force")
        print("=" * 60)
        print("⚡ Initializing system startup...")
        
        try:
            # Start backend
            if not self.start_backend():
                raise Exception("Backend failed to start")
            
            # Start frontend
            if not self.start_frontend():
                raise Exception("Frontend failed to start")
            
            # Save process IDs
            self.save_pids()
            
            # Open browser
            self.open_browser()
            
            print("=" * 60)
            print("✅ CRPF SYSTEM SUCCESSFULLY STARTED!")
            print("🌐 Website URL: http://localhost:3000")
            print("👨‍💼 Ready for CRPF personnel access")
            print("=" * 60)
            print("ℹ️  To close system: Run this program again")
            print("⚠️  Do not close this console window")
            print("=" * 60)
            
            # Keep the launcher running
            self.keep_alive()
            
        except Exception as e:
            print(f"❌ Error starting system: {e}")
            self.cleanup()
            input("Press Enter to exit...")
    
    def stop_system(self):
        """Stop the CRPF system"""
        print("=" * 60)
        print("⏹️  STOPPING CRPF MENTAL HEALTH SYSTEM")
        print("=" * 60)
        
        stopped_any = False
        
        # Stop processes from PID file
        if self.pid_file.exists():
            try:
                with open(self.pid_file, 'r') as f:
                    pids = json.load(f)
                
                for service, pid in pids.items():
                    try:
                        if psutil.pid_exists(pid):
                            proc = psutil.Process(pid)
                            proc.terminate()
                            print(f"✅ Stopped {service} service (PID: {pid})")
                            stopped_any = True
                    except:
                        pass
                
                self.pid_file.unlink()
            except:
                pass
        
        # Also try to stop current processes
        if self.backend_process:
            try:
                self.backend_process.terminate()
                stopped_any = True
            except:
                pass
        
        if self.frontend_process:
            try:
                self.frontend_process.terminate()
                stopped_any = True
            except:
                pass
        
        if stopped_any:
            print("✅ CRPF System stopped successfully")
        else:
            print("ℹ️  No running system found")
        
        print("=" * 60)
        input("Press Enter to exit...")
    
    def cleanup(self):
        """Clean up processes and files"""
        if self.pid_file.exists():
            self.pid_file.unlink()
    
    def keep_alive(self):
        """Keep the launcher running to monitor system"""
        try:
            while True:
                # Check if processes are still running
                if self.backend_process and self.backend_process.poll() is not None:
                    print("⚠️  Backend process stopped unexpectedly")
                    break
                
                if self.frontend_process and self.frontend_process.poll() is not None:
                    print("⚠️  Frontend process stopped unexpectedly")
                    break
                
                time.sleep(5)  # Check every 5 seconds
                
        except KeyboardInterrupt:
            print("\n🛑 System shutdown requested...")
            self.cleanup()
    
    def run(self):
        """Main entry point"""
        if self.is_system_running():
            print("CRPF Mental Health System is currently running.")
            choice = input("Do you want to STOP the system? (y/N): ").lower().strip()
            
            if choice in ['y', 'yes']:
                self.stop_system()
            else:
                print("System continues running...")
                # Try to open browser to existing system
                webbrowser.open(self.config['services']['browser']['url'])
        else:
            self.start_system()

if __name__ == "__main__":
    launcher = CRPFSystemLauncher()
    launcher.run()
