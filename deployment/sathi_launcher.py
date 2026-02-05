#!/usr/bin/env python3
"""
SATHI - Mental Health System Launcher
Version 2.0 - Professional Edition

Features:
- System tray icon
- Flask backend management
- Auto-start capabilities
- Health monitoring
- Graceful shutdown
"""

import os
import sys
import time
import subprocess
import json
import webbrowser
import signal
import psutil
from pathlib import Path
from typing import Optional

# Try to import pystray for system tray (may not be available during build)
try:
    from pystray import Icon, Menu, MenuItem
    from PIL import Image, ImageDraw
    TRAY_AVAILABLE = True
except ImportError:
    TRAY_AVAILABLE = False
    print("⚠️  System tray not available (pystray not installed)")

class SATHILauncher:
    """Professional system launcher with tray icon"""
    
    def __init__(self):
        # Detect if running as frozen executable or script
        if getattr(sys, 'frozen', False):
            self.install_dir = Path(sys.executable).parent
        else:
            self.install_dir = Path(__file__).parent.parent
        
        self.is_frozen = getattr(sys, 'frozen', False)
        
        # Component paths
        self.embedded_python = self.install_dir / "python" / "python.exe"
        self.backend_app = self.install_dir / "app" / "backend" / "app.py"
        
        # Runtime directories
        self.logs_dir = self.install_dir / "logs"
        self.logs_dir.mkdir(exist_ok=True)
        
        self.pid_dir = self.install_dir / ".pids"
        self.pid_dir.mkdir(exist_ok=True)
        
        # Process tracking
        self.backend_process: Optional[subprocess.Popen] = None
        
        # Configuration
        self.backend_port = 5000
        self.backend_url = f"http://localhost:{self.backend_port}"
        
        # System tray
        self.tray_icon: Optional[Icon] = None
        self.is_running = False
    
    def check_if_already_running(self) -> bool:
        """Check if system is already running"""
        pid_file = self.pid_dir / "launcher.pid"
        
        if pid_file.exists():
            try:
                pid = int(pid_file.read_text())
                if psutil.pid_exists(pid):
                    print("⚠️  SATHI is already running!")
                    print(f"   PID: {pid}")
                    return True
            except:
                pass
        
        # Write our PID
        pid_file.write_text(str(os.getpid()))
        return False
    
    def is_first_run(self) -> bool:
        """Check if this is the first run (database not initialized)"""
        initialized_marker = self.install_dir / ".initialized"
        return not initialized_marker.exists()
    
    def check_mysql_running(self) -> bool:
        """Check if MySQL is running on localhost:3306"""
        print("\n[1/2] Checking MySQL connection...")
        
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(('localhost', 3306))
            sock.close()
            
            if result == 0:
                print("✅ MySQL is running on localhost:3306")
                return True
            else:
                print("❌ MySQL is not running on localhost:3306")
                print("   Please ensure MySQL 8.0 is installed and running")
                return False
        except Exception as e:
            print(f"❌ Error checking MySQL: {e}")
            return False
    
    def initialize_database_first_run(self) -> bool:
        """Initialize database on first run"""
        if not self.is_first_run():
            return True
        
        print("\n🔧 First run detected - initializing database...")
        
        try:
            init_script = self.install_dir / "app" / "backend" / "db" / "init_database.py"
            if init_script.exists():
                python_exe = self.embedded_python if self.embedded_python.exists() else "python"
                result = subprocess.run(
                    [str(python_exe), str(init_script)],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    # Mark as initialized
                    (self.install_dir / ".initialized").touch()
                    print("✅ Database initialized successfully")
                    return True
                else:
                    print(f"⚠️  Database initialization failed: {result.stderr}")
                    return False
                    
        except Exception as e:
            print(f"⚠️  Could not initialize database: {e}")
            return False
    
    def start_backend(self) -> bool:
        """Start Flask backend"""
        print("\n[2/2] Starting Flask backend...")
        
        if not self.backend_app.exists():
            print(f"❌ Backend not found at: {self.backend_app}")
            return False
        
        # Check if already running
        backend_pid_file = self.pid_dir / "backend.pid"
        if backend_pid_file.exists():
            try:
                pid = int(backend_pid_file.read_text())
                if psutil.pid_exists(pid):
                    print("✅ Backend already running")
                    return True
            except:
                pass
        
        try:
            # Use embedded Python if available
            python_exe = self.embedded_python if self.embedded_python.exists() else "python"
            
            # Start backend
            backend_log = self.logs_dir / "backend.log"
            backend_env = os.environ.copy()
            backend_env['PYTHONPATH'] = str(self.backend_app.parent)
            
            with open(backend_log, 'w') as log_file:
                self.backend_process = subprocess.Popen(
                    [str(python_exe), str(self.backend_app)],
                    stdout=log_file,
                    stderr=subprocess.STDOUT,
                    env=backend_env,
                    cwd=str(self.backend_app.parent)
                )
            
            # Save PID
            backend_pid_file.write_text(str(self.backend_process.pid))
            
            # Wait for backend to be ready
            print("   Waiting for backend to start...", end='', flush=True)
            for i in range(60):
                time.sleep(0.5)
                print(".", end='', flush=True)
                
                # Check if process is still running
                if self.backend_process.poll() is not None:
                    print("\n❌ Backend failed to start!")
                    print(f"   Check logs: {backend_log}")
                    return False
                
                # Try to connect
                if self._test_backend_health():
                    print("\n✅ Backend started successfully")
                    return True
            
            print("\n⚠️  Backend took too long to start")
            print(f"   Check logs: {backend_log}")
            return False
            
        except Exception as e:
            print(f"❌ Failed to start backend: {e}")
            return False
    
    def _test_backend_health(self) -> bool:
        """Test if backend is responding"""
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(('localhost', self.backend_port))
            sock.close()
            return result == 0
        except:
            return False
    
    def open_browser(self):
        """Open system in browser"""
        print("\n[3/3] Opening browser...")
        
        try:
            webbrowser.open(self.backend_url)
            print(f"✅ Browser opened: {self.backend_url}")
        except Exception as e:
            print(f"⚠️  Could not open browser: {e}")
            print(f"   Please open manually: {self.backend_url}")
    
    def create_tray_icon_image(self):
        """Create tray icon image"""
        # Create a simple icon (red square with white C)
        image = Image.new('RGB', (64, 64), color=(200, 50, 50))
        draw = ImageDraw.Draw(image)
        draw.text((20, 15), "C", fill=(255, 255, 255))
        return image
    
    def setup_system_tray(self):
        """Setup system tray icon"""
        if not TRAY_AVAILABLE:
            return
        
        print("\n🎨 Setting up system tray...")
        
        try:
            icon_image = self.create_tray_icon_image()
            
            menu = Menu(
                MenuItem('Open System', self.tray_open_system),
                MenuItem('Restart', self.tray_restart),
                Menu.SEPARATOR,
                MenuItem('Stop System', self.tray_stop_system),
            )
            
            self.tray_icon = Icon(
                "SATHI",
                icon_image,
                "SATHI - Mental Health System",
                menu
            )
            
            print("✅ System tray icon created")
            
        except Exception as e:
            print(f"⚠️  Could not create system tray: {e}")
    
    def tray_open_system(self, icon, item):
        """Tray menu: Open system"""
        webbrowser.open(self.backend_url)
    
    def tray_restart(self, icon, item):
        """Tray menu: Restart system"""
        print("\n🔄 Restarting system...")
        self.stop_all_services()
        time.sleep(2)
        self.start_all_services()
    
    def tray_stop_system(self, icon, item):
        """Tray menu: Stop system"""
        print("\n⏹️  Stopping system...")
        self.stop_all_services()
        if self.tray_icon:
            self.tray_icon.stop()
        sys.exit(0)
    
    def start_all_services(self) -> bool:
        """Start all services"""
        print("\n" + "="*60)
        print("🚀 SATHI - MENTAL HEALTH SYSTEM - STARTING")
        print("="*60)
        
        # Check MySQL connection
        if not self.check_mysql_running():
            print("❌ MySQL is not running. Please start MySQL 8.0 and try again.")
            return False
        
        # Initialize database on first run
        if not self.initialize_database_first_run():
            print("⚠️  Database initialization had issues, continuing...")
        
        # Start backend
        if not self.start_backend():
            print("❌ Failed to start backend")
            self.stop_all_services()
            return False
        
        # Open browser
        self.open_browser()
        
        print("\n" + "="*60)
        print("✅ SATHI SYSTEM IS RUNNING")
        print("="*60)
        print(f"\n📍 Access at: {self.backend_url}")
        print("📊 System tray icon: Right-click for options")
        print("🛑 To stop: Right-click tray icon → Stop System")
        print("\n")
        
        self.is_running = True
        return True
    
    def stop_all_services(self):
        """Stop all services gracefully"""
        print("\n🛑 Stopping all services...")
        
        # Stop backend
        backend_pid_file = self.pid_dir / "backend.pid"
        if backend_pid_file.exists():
            try:
                pid = int(backend_pid_file.read_text())
                if psutil.pid_exists(pid):
                    process = psutil.Process(pid)
                    process.terminate()
                    process.wait(timeout=5)
                    print("✅ Backend stopped")
            except:
                pass
            backend_pid_file.unlink(missing_ok=True)
        
        # Clean launcher PID
        (self.pid_dir / "launcher.pid").unlink(missing_ok=True)
        
        print("✅ All services stopped")
    
    def run(self):
        """Main run loop"""
        # Check if already running
        if self.check_if_already_running():
            print("\n💡 Tip: Check system tray icon or use Task Manager to stop running instance")
            input("\nPress Enter to exit...")
            return
        
        # Start services
        if not self.start_all_services():
            print("\n❌ System failed to start")
            input("\nPress Enter to exit...")
            return
        
        # Setup system tray
        if TRAY_AVAILABLE:
            self.setup_system_tray()
            
            # Run tray icon (blocking)
            try:
                self.tray_icon.run()
            except KeyboardInterrupt:
                pass
        else:
            # No tray, just wait for Ctrl+C
            print("Press Ctrl+C to stop...")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                pass
        
        # Cleanup on exit
        self.stop_all_services()

def main():
    """Main entry point"""
    launcher = SATHILauncher()
    
    # Handle command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == '--stop':
            launcher.stop_all_services()
            return
        elif sys.argv[1] == '--silent':
            # Silent mode for auto-start
            pass
    
    try:
        launcher.run()
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()
