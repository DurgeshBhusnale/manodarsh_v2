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
        # Handle both script and EXE modes
        if getattr(sys, 'frozen', False):
            # Running as EXE - EXE is in deployment/dist, so go back to main project root
            self.project_root = Path(sys.executable).parent.parent.parent
        else:
            # Running as script
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
        # Method 1: Check PID file
        if self.pid_file.exists():
            try:
                with open(self.pid_file, 'r') as f:
                    pids = json.load(f)
                
                # Check if processes are still running
                running_processes = []
                for name, pid in pids.items():
                    if psutil.pid_exists(pid):
                        running_processes.append(f"{name}:{pid}")
                
                if running_processes:
                    print(f"🔍 Found running processes: {', '.join(running_processes)}")
                    return True
                else:
                    # PIDs not running, remove stale PID file
                    self.pid_file.unlink()
                    print("🧹 Removed stale PID file")
            except Exception as e:
                print(f"⚠️  Error reading PID file: {e}")
        
        # Method 2: Check ports as backup (for orphaned processes)
        ports_to_check = [
            (5000, "Backend"),
            (3000, "Frontend")
        ]
        
        running_services = []
        for port, service_name in ports_to_check:
            if self._is_port_in_use(port):
                running_services.append(f"{service_name} (port {port})")
        
        if running_services:
            print(f"🔍 Found running services: {', '.join(running_services)}")
            print("⚠️  These appear to be orphaned processes (no PID file)")
            return True
        
        return False
    
    def _is_port_in_use(self, port):
        """Check if a port is in use by trying to connect to it"""
        import socket
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)  # 1 second timeout
                result = s.connect_ex(('localhost', port))
                return result == 0
        except Exception:
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
        
        # Debug path resolution for EXE mode
        if getattr(sys, 'frozen', False):
            print(f"🔍 EXE Mode - Project root: {self.project_root}")
            print(f"🔍 Backend path: {backend_path}")
            print(f"🔍 Backend exists: {backend_path.exists()}")
        
        # Check for virtual environment first
        venv_python = backend_path / "venv" / "Scripts" / "python.exe"
        if venv_python.exists():
            python_cmd = str(venv_python)
        else:
            python_cmd = sys.executable
        
        cmd = [python_cmd, "app.py"]
        
        try:
            # Create process group for proper cleanup
            self.backend_process = subprocess.Popen(
                cmd,
                cwd=str(backend_path),  # Convert Path to string - fixes WinError 267
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
        except Exception as e:
            print(f"❌ Error starting backend: {e}")
            if getattr(sys, 'frozen', False):
                print(f"🔍 Current working directory: {os.getcwd()}")
                print(f"🔍 Available directories: {list(self.project_root.iterdir()) if self.project_root.exists() else 'Project root not found'}")
            return False
        
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
        
        # Create process group for proper cleanup
        self.frontend_process = subprocess.Popen(
            cmd,
            cwd=frontend_path,
            shell=True,
            env=env,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP  # Better for termination
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
            
            # Keep the launcher running with clear instructions
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
        
        # Method 1: Stop current process references (if available)
        if self.backend_process:
            try:
                self.backend_process.terminate()
                time.sleep(2)
                if self.backend_process.poll() is None:
                    self.backend_process.kill()
                print("✅ Stopped backend service")
                stopped_any = True
            except Exception as e:
                print(f"⚠️  Error stopping backend: {e}")
        
        if self.frontend_process:
            try:
                parent = psutil.Process(self.frontend_process.pid)
                children = parent.children(recursive=True)
                
                for child in children:
                    try:
                        child.terminate()
                    except:
                        pass
                
                parent.terminate()
                time.sleep(2)
                
                if self.frontend_process.poll() is None:
                    for child in children:
                        try:
                            child.kill()
                        except:
                            pass
                    parent.kill()
                
                print("✅ Stopped frontend service")
                stopped_any = True
            except Exception as e:
                print(f"⚠️  Error stopping frontend: {e}")
        
        # Method 2: Stop processes from PID file
        if self.pid_file.exists():
            try:
                with open(self.pid_file, 'r') as f:
                    pids = json.load(f)
                
                for service, pid in pids.items():
                    try:
                        if psutil.pid_exists(pid):
                            proc = psutil.Process(pid)
                            children = proc.children(recursive=True)
                            
                            for child in children:
                                try:
                                    child.terminate()
                                except:
                                    pass
                            
                            proc.terminate()
                            time.sleep(1)
                            
                            if proc.is_running():
                                proc.kill()
                            
                            print(f"✅ Stopped {service} service (PID: {pid})")
                            stopped_any = True
                    except Exception as e:
                        print(f"⚠️  Could not stop {service} (PID: {pid}): {e}")
                
                self.pid_file.unlink()
            except Exception as e:
                print(f"⚠️  Error processing PID file: {e}")
        
        # Method 3: Kill orphaned processes by port (last resort)
        port_processes = self._get_processes_by_port([5000, 3000])
        for port, pid in port_processes.items():
            try:
                proc = psutil.Process(pid)
                proc.terminate()
                time.sleep(1)
                if proc.is_running():
                    proc.kill()
                service_name = "Backend" if port == 5000 else "Frontend"
                print(f"✅ Stopped orphaned {service_name} service (PID: {pid})")
                stopped_any = True
            except Exception as e:
                print(f"⚠️  Could not stop orphaned process on port {port}: {e}")
        
        if stopped_any:
            print("=" * 60)
            print("✅ CRPF SYSTEM STOPPED SUCCESSFULLY!")
        else:
            print("ℹ️  No running processes found to stop")
        
        print("=" * 60)
    
    def _get_processes_by_port(self, ports):
        """Get process IDs using specific ports using psutil"""
        import psutil
        processes = {}
        
        try:
            for conn in psutil.net_connections():
                if conn.status == psutil.CONN_LISTEN and conn.laddr.port in ports:
                    if conn.pid:  # Make sure PID exists
                        try:
                            # Verify the process still exists
                            proc = psutil.Process(conn.pid)
                            if proc.is_running():
                                processes[conn.laddr.port] = conn.pid
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            pass  # Process no longer exists or access denied
        except Exception as e:
            self.logger.error(f"Error getting processes by port: {e}")
        
        return processes
    
    def cleanup(self):
        """Clean up processes and files"""
        if self.pid_file.exists():
            self.pid_file.unlink()
    
    def keep_alive(self):
        """Keep the launcher running with clear shutdown instructions"""
        try:
            # Check if we're running as EXE
            if getattr(sys, 'frozen', False):
                # EXE mode - show message and auto-close after delay
                print("💡 CRPF SYSTEM CONTROL:")
                print("   ✅ System is running successfully!")
                print("   🌐 Browser opened at: http://localhost:3000")
                print("   🔄 To STOP: Double-click the EXE icon again")
                print("")
                print("   This window will close automatically in 10 seconds...")
                print("   (System continues running in background)")
                
                # Wait 10 seconds then close
                for i in range(10, 0, -1):
                    print(f"   Closing in {i} seconds... (System stays running)", end='\r')
                    time.sleep(1)
                print("\n✅ Launcher closed. System running in background.     ")
                return  # Exit launcher, system keeps running
            else:
                # Script mode - use interactive console
                # Check if we have a console (running from terminal)
                import sys
                if hasattr(sys.stdin, 'isatty') and sys.stdin.isatty():
                    # Console mode - show instructions and wait for input
                    print("💡 SYSTEM CONTROL INSTRUCTIONS:")
                    print("   • System is running in the background")
                    print("   • To STOP the system: Press ENTER or Ctrl+C")
                    print("   • To RESTART: Run this launcher again")
                    print("   • Browser will auto-open at http://localhost:3000")
                    print("")
                    
                    try:
                        # Simple input wait - user can press ENTER to shutdown gracefully
                        input("⏳ CRPF System is running. Press ENTER to SHUTDOWN... ")
                        print("\n🛑 Graceful shutdown initiated...")
                        
                    except KeyboardInterrupt:
                        print("\n🛑 System shutdown requested...")
                else:
                    # Fallback - just wait and let user kill the process
                    import time
                    print("CRPF System running. Use Task Manager to stop if needed.")
                    time.sleep(3600)  # Wait 1 hour before auto-shutdown
        
        except Exception as e:
            print(f"Error in keep_alive: {e}")
            # Fallback - just exit
            import time
            time.sleep(10)
        
        # Only cleanup when exiting in script mode
        if not getattr(sys, 'frozen', False):
            self.stop_system()
    
    def run(self):
        """Main entry point"""
        if self.is_system_running():
            print("CRPF Mental Health System is currently running.")
            
            # For EXE mode, auto-stop after showing message
            if getattr(sys, 'frozen', False):
                print("🔄 Single-click detected - Stopping system automatically...")
                time.sleep(2)  # Show message briefly
                self.stop_system()
                print("\n✅ System stopped. Click EXE again to restart.")
                time.sleep(3)  # Show result briefly
                return
            
            # For script mode, show options
            print("Options:")
            print("  y = Stop system normally")
            print("  f = Force clean all processes")  
            print("  N = Keep system running")
            choice = input("Your choice (y/f/N): ").lower().strip()
            
            if choice in ['y', 'yes']:
                self.stop_system()
            elif choice in ['f', 'force']:
                self.force_clean_all()
            else:
                print("System continues running...")
                # Try to open browser to existing system
                webbrowser.open(self.config['services']['browser']['url'])
        else:
            self.start_system()
    
    def force_clean_all(self):
        """Force clean all Python and Node processes"""
        print("🧹 FORCE CLEANING ALL PROCESSES...")
        print("=" * 60)
        
        import psutil
        killed_processes = []
        
        # Kill all Python processes (might be backend)
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if proc.info['name'].lower() in ['python.exe', 'pythonw.exe']:
                        if any('app.py' in str(cmd) for cmd in (proc.info['cmdline'] or [])):
                            proc.terminate()
                            killed_processes.append(f"Python backend (PID: {proc.info['pid']})")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except Exception as e:
            print(f"Error killing Python processes: {e}")
        
        # Kill Node.js/npm processes (might be frontend)  
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if proc.info['name'].lower() in ['node.exe', 'npm.cmd']:
                        if any('serve' in str(cmd) or 'start' in str(cmd) for cmd in (proc.info['cmdline'] or [])):
                            proc.terminate()
                            killed_processes.append(f"Node frontend (PID: {proc.info['pid']})")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except Exception as e:
            print(f"Error killing Node processes: {e}")
        
        # Wait a moment for graceful termination
        time.sleep(2)
        
        # Force kill any remaining processes on our ports
        port_processes = self._get_processes_by_port([5000, 3000])
        for port, pid in port_processes.items():
            try:
                proc = psutil.Process(pid)
                proc.kill()  # Force kill
                killed_processes.append(f"Port {port} process (PID: {pid})")
            except Exception:
                pass
        
        # Clean up PID file
        if self.pid_file.exists():
            self.pid_file.unlink()
            print("🗑️  Removed PID file")
        
        if killed_processes:
            print("✅ Killed processes:")
            for proc in killed_processes:
                print(f"   • {proc}")
        else:
            print("ℹ️  No processes found to kill")
            
        print("=" * 60)
        print("✅ FORCE CLEAN COMPLETED!")
        print("=" * 60)

if __name__ == "__main__":
    launcher = CRPFSystemLauncher()
    launcher.run()
