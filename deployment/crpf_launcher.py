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

# GUI imports for loading screen
try:
    import tkinter as tk
    from tkinter import ttk
    GUI_AVAILABLE = True
except ImportError:
    GUI_AVAILABLE = False


class LoadingWindow:
    """GUI Loading Screen for windowless deployment"""

    def __init__(self):
        self.root = None
        self.progress_var = None
        self.status_label = None
        self.progress_bar = None
        self.is_running = False

    def create_window(self):
        """Create the loading window"""
        if not GUI_AVAILABLE:
            return False

        try:
            self.root = tk.Tk()
            self.root.title("SATHI - Starting System")

            # Window configuration
            window_width = 450
            window_height = 280

            # Center on screen
            screen_width = self.root.winfo_screenwidth()
            screen_height = self.root.winfo_screenheight()
            x = (screen_width - window_width) // 2
            y = (screen_height - window_height) // 2
            self.root.geometry(f"{window_width}x{window_height}+{x}+{y}")

            # Remove window decorations for clean look
            self.root.overrideredirect(True)

            # Keep window on top
            self.root.attributes('-topmost', True)

            # Main frame with border
            main_frame = tk.Frame(self.root, bg='#1a365d', padx=3, pady=3)
            main_frame.pack(fill='both', expand=True)

            inner_frame = tk.Frame(main_frame, bg='#f7fafc')
            inner_frame.pack(fill='both', expand=True)

            # Header with logo/title
            header_frame = tk.Frame(inner_frame, bg='#2c5282', height=80)
            header_frame.pack(fill='x')
            header_frame.pack_propagate(False)

            title_label = tk.Label(
                header_frame,
                text="🏛️ SATHI",
                font=('Segoe UI', 24, 'bold'),
                fg='white',
                bg='#2c5282'
            )
            title_label.pack(pady=(15, 0))

            subtitle_label = tk.Label(
                header_frame,
                text="Health & Wellness Monitoring System",
                font=('Segoe UI', 10),
                fg='#bee3f8',
                bg='#2c5282'
            )
            subtitle_label.pack()

            # Content area
            content_frame = tk.Frame(inner_frame, bg='#f7fafc')
            content_frame.pack(fill='both', expand=True, padx=30, pady=20)

            # Status message
            self.status_label = tk.Label(
                content_frame,
                text="Initializing system...",
                font=('Segoe UI', 11),
                fg='#2d3748',
                bg='#f7fafc'
            )
            self.status_label.pack(pady=(10, 15))

            # Progress bar
            style = ttk.Style()
            style.theme_use('clam')
            style.configure(
                "Custom.Horizontal.TProgressbar",
                troughcolor='#e2e8f0',
                background='#3182ce',
                lightcolor='#3182ce',
                darkcolor='#2c5282',
                bordercolor='#cbd5e0',
                thickness=20
            )

            self.progress_var = tk.DoubleVar(value=0)
            self.progress_bar = ttk.Progressbar(
                content_frame,
                variable=self.progress_var,
                maximum=100,
                length=350,
                mode='determinate',
                style="Custom.Horizontal.TProgressbar"
            )
            self.progress_bar.pack(pady=10)

            # Percentage label
            self.percent_label = tk.Label(
                content_frame,
                text="0%",
                font=('Segoe UI', 9),
                fg='#718096',
                bg='#f7fafc'
            )
            self.percent_label.pack()

            # Footer
            footer_label = tk.Label(
                inner_frame,
                text="Please wait while the system starts...",
                font=('Segoe UI', 9),
                fg='#a0aec0',
                bg='#f7fafc'
            )
            footer_label.pack(pady=(0, 15))

            self.is_running = True
            return True

        except Exception as e:
            print(f"Error creating loading window: {e}")
            return False

    def update_status(self, message, progress):
        """Update status message and progress bar"""
        if not self.is_running or not self.root:
            return

        try:
            self.status_label.config(text=message)
            self.progress_var.set(progress)
            self.percent_label.config(text=f"{int(progress)}%")
            self.root.update()
        except:
            pass

    def run_with_callback(self, startup_callback):
        """Run the window with a callback for startup operations"""
        if not self.root:
            # If GUI not available, just run callback directly
            startup_callback(self)
            return

        # Run startup in separate thread
        def run_startup():
            try:
                startup_callback(self)
            finally:
                # Close window when done
                self.close()

        startup_thread = threading.Thread(target=run_startup, daemon=True)
        startup_thread.start()

        # Run the GUI main loop
        try:
            self.root.mainloop()
        except:
            pass

    def close(self):
        """Close the loading window"""
        self.is_running = False
        if self.root:
            try:
                self.root.after(100, self.root.destroy)
            except:
                pass


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
                "name": "Health & Wellness System",
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
    
    def start_backend(self, loading_window=None):
        """Start Flask backend"""
        # Only print if NOT in EXE mode (for debugging during development)
        if not getattr(sys, 'frozen', False):
            print("🚀 Starting SATHI Backend Server...")

        backend_path = self.project_root / "backend"

        # Debug path resolution ONLY in script mode (not EXE)
        if getattr(sys, 'frozen', False) and False:  # Disabled debug prints in EXE
            print(f"🔍 EXE Mode - Project root: {self.project_root}")
            print(f"🔍 Backend path: {backend_path}")
            print(f"🔍 Backend exists: {backend_path.exists()}")

        # Check for virtual environment first
        venv_python = backend_path / "venv" / "Scripts" / "python.exe"
        if venv_python.exists():
            python_cmd = str(venv_python)
        else:
            # Use global Python (assumes 'python' is in PATH)
            python_cmd = "python"

        cmd = [python_cmd, "app.py"]

        try:
            # Create process group for proper cleanup
            # In EXE mode, suppress all output to hide terminal
            if getattr(sys, 'frozen', False):
                # Windowless mode - redirect all output to null
                self.backend_process = subprocess.Popen(
                    cmd,
                    cwd=str(backend_path),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
                )
            else:
                # Development mode - show output
                self.backend_process = subprocess.Popen(
                    cmd,
                    cwd=str(backend_path),
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                )
        except Exception as e:
            if not getattr(sys, 'frozen', False):
                print(f"❌ Error starting backend: {e}")
            return False

        # Wait for backend to start with progress updates
        startup_delay = self.config['services']['backend']['startup_delay']
        for i in range(startup_delay):
            if loading_window:
                progress = 10 + (i / startup_delay) * 20  # 10% to 30%
                loading_window.update_status(f"Starting backend server... ({i+1}s)", progress)
            time.sleep(1)

        # Verify backend is running
        for attempt in range(10):  # Increased attempts
            if loading_window:
                progress = 30 + (attempt / 10) * 15  # 30% to 45%
                loading_window.update_status(f"Verifying backend... (attempt {attempt+1}/10)", progress)
            try:
                response = requests.get(f"http://localhost:{self.config['services']['backend']['port']}", timeout=3)
                if response.status_code in [200, 404]:  # 404 is also OK, means server is running
                    if not getattr(sys, 'frozen', False):
                        print("✅ Backend server is running")
                    return True
            except:
                time.sleep(2)  # Wait longer between attempts

        if not getattr(sys, 'frozen', False):
            print("❌ Failed to start backend server")
        return False
    
    def start_frontend(self, loading_window=None):
        """Start React frontend"""
        frontend_path = self.project_root / "frontend"

        # Always prefer production build for faster startup
        build_path = frontend_path / "build"
        if build_path.exists():
            if not getattr(sys, 'frozen', False):
                print("✅ Using optimized production build (faster startup)")
            # Use built version with npx serve
            cmd = ["npx", "serve", "-s", "build", "-l", str(self.config['services']['frontend']['port'])]
            startup_delay = 5  # Production build starts much faster
        else:
            if not getattr(sys, 'frozen', False):
                print("⚠️  No production build found, using development mode (slower)")
            # Use development version
            cmd = ["npm", "start"]
            startup_delay = self.config['services']['frontend']['startup_delay']

        env = os.environ.copy()
        env['BROWSER'] = 'none'  # Prevent automatic browser opening

        # Create process group for proper cleanup
        # In EXE mode, suppress all output
        if getattr(sys, 'frozen', False):
            self.frontend_process = subprocess.Popen(
                cmd,
                cwd=str(frontend_path),
                shell=True,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
            )
        else:
            self.frontend_process = subprocess.Popen(
                cmd,
                cwd=str(frontend_path),
                shell=True,
                env=env,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )

        # Wait for frontend to start with progress updates
        if not getattr(sys, 'frozen', False):
            print(f"⏳ Waiting {startup_delay} seconds for frontend to start...")

        for i in range(startup_delay):
            if loading_window:
                progress = 50 + (i / startup_delay) * 20  # 50% to 70%
                loading_window.update_status(f"Starting frontend server... ({i+1}s)", progress)
            time.sleep(1)
            if not getattr(sys, 'frozen', False) and i % 5 == 0 and i > 0:
                print(f"⏳ Still starting... ({i + 1}/{startup_delay} seconds)")

        # Check if frontend is responding
        max_attempts = 15 if startup_delay <= 5 else 10  # More attempts for production build
        for attempt in range(max_attempts):
            if loading_window:
                progress = 70 + (attempt / max_attempts) * 15  # 70% to 85%
                loading_window.update_status(f"Verifying frontend... (attempt {attempt+1}/{max_attempts})", progress)
            try:
                import urllib.request
                response = urllib.request.urlopen(f"http://localhost:{self.config['services']['frontend']['port']}", timeout=3)
                if response.status == 200:
                    if not getattr(sys, 'frozen', False):
                        print("✅ Frontend server is running and accessible")
                    return True
            except Exception as e:
                if attempt < max_attempts - 1:  # Don't show error on last attempt
                    if not getattr(sys, 'frozen', False):
                        print(f"⏳ Checking frontend... attempt {attempt + 1}/{max_attempts}")
                time.sleep(2)

        # If production build, wait a bit more as serve might take time
        if startup_delay <= 5:
            if loading_window:
                loading_window.update_status("Finalizing frontend startup...", 88)
            if not getattr(sys, 'frozen', False):
                print("⏳ Production build may need extra time, waiting...")
            time.sleep(5)
            try:
                import urllib.request
                response = urllib.request.urlopen(f"http://localhost:{self.config['services']['frontend']['port']}", timeout=3)
                if response.status == 200:
                    if not getattr(sys, 'frozen', False):
                        print("✅ Frontend server is now running and accessible")
                    return True
            except:
                pass

        if not getattr(sys, 'frozen', False):
            print("⚠️  Frontend process started - please check manually at http://localhost:3000")
        return True
    
    def open_browser(self, loading_window=None):
        """Open system in default browser only after verifying server is ready"""
        if not self.config['services']['browser']['auto_open']:
            return

        url = self.config['services']['browser']['url']
        port = self.config['services']['frontend']['port']

        if not getattr(sys, 'frozen', False):
            print("🌍 Verifying server before opening browser...")

        # Wait for frontend to be actually ready (up to 30 seconds)
        import urllib.request
        for attempt in range(15):
            if loading_window:
                progress = 90 + (attempt / 15) * 8  # 90% to 98%
                loading_window.update_status(f"Verifying server... ({attempt + 1}/15)", progress)
            try:
                response = urllib.request.urlopen(f"http://localhost:{port}", timeout=3)
                if response.status == 200:
                    if loading_window:
                        loading_window.update_status("Server ready! Opening browser...", 99)
                    if not getattr(sys, 'frozen', False):
                        print("✅ Server ready, opening browser...")
                    time.sleep(1)  # Brief delay for stability
                    webbrowser.open(url)
                    return
            except:
                time.sleep(2)

        # Server might still be starting, open browser anyway
        if loading_window:
            loading_window.update_status("Opening browser...", 99)
        if not getattr(sys, 'frozen', False):
            print("⚠️  Opening browser (server may still be loading)...")
        webbrowser.open(url)
    
    def start_system(self, loading_window=None):
        """Start the complete CRPF system"""

        def update_loading(message, progress):
            """Helper to update loading window if available"""
            if loading_window:
                loading_window.update_status(message, progress)
            if not getattr(sys, 'frozen', False):
                print(f"[{int(progress)}%] {message}")

        if not getattr(sys, 'frozen', False):
            print("=" * 60)
            print("🏛️  CRPF MENTAL HEALTH & WELLNESS SYSTEM")
            print("    Central Reserve Police Force")
            print("=" * 60)
            print("⚡ Initializing system startup...")

        try:
            update_loading("Starting backend server...", 10)

            # Start backend
            if not self.start_backend(loading_window):
                raise Exception("Backend failed to start")

            update_loading("Starting frontend server...", 50)

            # Start frontend
            if not self.start_frontend(loading_window):
                raise Exception("Frontend failed to start")

            update_loading("Saving system state...", 88)

            # Save process IDs
            self.save_pids()

            update_loading("Verifying server and opening browser...", 90)

            # Open browser (this now verifies server first)
            self.open_browser(loading_window)

            update_loading("System ready!", 100)
            time.sleep(1)  # Brief pause to show 100%

            if not getattr(sys, 'frozen', False):
                print("=" * 60)
                print("✅ CRPF SYSTEM SUCCESSFULLY STARTED!")
                print("🌐 Website URL: http://localhost:3000")
                print("👨‍💼 Ready for CRPF personnel access")
                print("=" * 60)

            # Keep the launcher running with clear instructions (only in script mode)
            if not getattr(sys, 'frozen', False):
                self.keep_alive()

        except Exception as e:
            if loading_window:
                loading_window.update_status(f"Error: {e}", 0)
                time.sleep(3)
            if not getattr(sys, 'frozen', False):
                print(f"❌ Error starting system: {e}")
            self.cleanup()
            if not getattr(sys, 'frozen', False):
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
        import sys  # Import sys at the beginning
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
        # Check if system is already running
        if self.is_system_running():
            # For EXE mode, show GUI message and auto-stop
            if getattr(sys, 'frozen', False) and GUI_AVAILABLE:
                self._show_stop_dialog()
                return
            elif getattr(sys, 'frozen', False):
                # No GUI, just stop silently
                self.stop_system()
                return

            # For script mode, show options
            print("CRPF Mental Health System is currently running.")
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
            # Start the system
            if getattr(sys, 'frozen', False) and GUI_AVAILABLE:
                # EXE mode with GUI - show loading window
                self._start_with_loading_window()
            else:
                # Script mode or no GUI - use console
                self.start_system()

    def _show_stop_dialog(self):
        """Show a dialog indicating system is stopping (EXE mode)"""
        try:
            root = tk.Tk()
            root.title("SATHI - System Running")

            window_width = 400
            window_height = 200
            screen_width = root.winfo_screenwidth()
            screen_height = root.winfo_screenheight()
            x = (screen_width - window_width) // 2
            y = (screen_height - window_height) // 2
            root.geometry(f"{window_width}x{window_height}+{x}+{y}")
            root.overrideredirect(True)
            root.attributes('-topmost', True)

            main_frame = tk.Frame(root, bg='#1a365d', padx=3, pady=3)
            main_frame.pack(fill='both', expand=True)

            inner_frame = tk.Frame(main_frame, bg='#f7fafc')
            inner_frame.pack(fill='both', expand=True)

            header = tk.Label(
                inner_frame,
                text="🏛️ SATHI System",
                font=('Segoe UI', 16, 'bold'),
                fg='#2c5282',
                bg='#f7fafc'
            )
            header.pack(pady=(20, 10))

            status_label = tk.Label(
                inner_frame,
                text="System is already running.\nStopping services...",
                font=('Segoe UI', 11),
                fg='#2d3748',
                bg='#f7fafc'
            )
            status_label.pack(pady=10)

            # Stop system in background
            def stop_and_close():
                self.stop_system()
                status_label.config(text="System stopped.\nClick EXE again to restart.")
                root.after(2000, root.destroy)

            root.after(500, stop_and_close)
            root.mainloop()

        except Exception as e:
            # Fallback to silent stop
            self.stop_system()

    def _start_with_loading_window(self):
        """Start the system with a GUI loading window (EXE mode)"""
        loading_window = LoadingWindow()

        if not loading_window.create_window():
            # Fallback to non-GUI startup
            self.start_system()
            return

        def startup_callback(lw):
            """Callback that runs the startup sequence"""
            self.start_system(loading_window=lw)

        loading_window.run_with_callback(startup_callback)
    
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
