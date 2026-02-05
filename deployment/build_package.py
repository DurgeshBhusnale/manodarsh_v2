#!/usr/bin/env python3
"""
CRPF Mental Health System - Portable Package Builder
Creates self-contained Windows deployment package
Version: 1.0
"""

import os
import sys
import shutil
import subprocess
import urllib.request
import zipfile
import json
from pathlib import Path
from typing import Dict, List

# Color output for terminal
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_step(step: str, total: str, message: str):
    """Print formatted step message"""
    print(f"\n{Colors.BLUE}{Colors.BOLD}[{step}/{total}]{Colors.END} {message}")

def print_success(message: str):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_error(message: str):
    """Print error message"""
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def print_warning(message: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")

class PackageBuilder:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent
        self.package_dir = self.script_dir / "package"
        
        # URLs for downloads
        self.python_url = "https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip"
        
    def clean_previous_build(self):
        """Remove previous build artifacts"""
        print_step("1", "9", "Cleaning previous build...")
        
        if self.package_dir.exists():
            shutil.rmtree(self.package_dir)
            print_success("Removed old package directory")
        
        self.package_dir.mkdir(parents=True, exist_ok=True)
        print_success("Created fresh package directory")
    
    def download_file(self, url: str, dest: Path) -> bool:
        """Download file with progress"""
        try:
            print(f"   Downloading: {url}")
            print(f"   To: {dest}")
            
            # Create directory if needed
            dest.parent.mkdir(parents=True, exist_ok=True)
            
            # Download with progress
            def report_progress(block_num, block_size, total_size):
                downloaded = block_num * block_size
                percent = min(100, (downloaded / total_size) * 100)
                bar_length = 40
                filled = int(bar_length * percent / 100)
                bar = '█' * filled + '░' * (bar_length - filled)
                print(f"\r   [{bar}] {percent:.1f}%", end='', flush=True)
            
            urllib.request.urlretrieve(url, dest, reporthook=report_progress)
            print()  # New line after progress
            return True
            
        except Exception as e:
            print_error(f"Download failed: {e}")
            return False
    
    def extract_zip(self, zip_path: Path, extract_to: Path) -> bool:
        """Extract ZIP file"""
        try:
            print(f"   Extracting: {zip_path.name}")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_to)
            print_success(f"Extracted to {extract_to}")
            return True
        except Exception as e:
            print_error(f"Extraction failed: {e}")
            return False
    
    def setup_embedded_python(self):
        """Download and configure embedded Python"""
        print_step("2", "9", "Setting up embedded Python 3.10...")
        
        python_dir = self.package_dir / "python"
        python_zip = self.script_dir / "downloads" / "python-embed.zip"
        
        # Check if already exists
        if (python_dir / "python.exe").exists():
            print_warning("Python already exists, skipping download")
            return True
        
        # Download
        python_zip.parent.mkdir(exist_ok=True)
        if not python_zip.exists():
            if not self.download_file(self.python_url, python_zip):
                return False
        
        # Extract
        python_dir.mkdir(parents=True, exist_ok=True)
        if not self.extract_zip(python_zip, python_dir):
            return False
        
        # Enable pip and site-packages
        pth_file = python_dir / "python310._pth"
        if pth_file.exists():
            content = pth_file.read_text()
            content = content.replace("#import site", "import site")
            content += "\nLib\\site-packages\n"
            pth_file.write_text(content)
            print_success("Configured Python to use site-packages")
        
        # Download get-pip.py
        get_pip = python_dir / "get-pip.py"
        if not get_pip.exists():
            print("   Installing pip...")
            pip_url = "https://bootstrap.pypa.io/get-pip.py"
            if self.download_file(pip_url, get_pip):
                # Install pip
                subprocess.run([str(python_dir / "python.exe"), str(get_pip)], 
                             cwd=str(python_dir), check=True)
                print_success("Pip installed")
        
        print_success("Embedded Python setup complete")
        return True
    
    def install_python_packages(self):
        """Install all Python dependencies to embedded Python"""
        print_step("3", "9", "Installing Python packages (this may take 10-15 minutes)...")
        
        python_exe = self.package_dir / "python" / "python.exe"
        requirements = self.project_root / "backend" / "requirements.txt"
        
        if not python_exe.exists():
            print_error("Embedded Python not found!")
            return False
        
        if not requirements.exists():
            print_error("requirements.txt not found!")
            return False
        
        try:
            print("   Installing packages from requirements.txt...")
            print("   (This includes TensorFlow, OpenCV, dlib - will take time)")
            
            # Install packages
            result = subprocess.run(
                [str(python_exe), "-m", "pip", "install", "-r", str(requirements), 
                 "--no-warn-script-location"],
                capture_output=True,
                text=True,
                cwd=str(self.package_dir / "python")
            )
            
            if result.returncode != 0:
                print_error("Package installation failed!")
                print(result.stderr)
                return False
            
            # Install additional packages for launcher
            print("   Installing launcher dependencies...")
            launcher_packages = ["pystray", "Pillow", "psutil", "requests"]
            subprocess.run(
                [str(python_exe), "-m", "pip", "install"] + launcher_packages,
                check=True,
                capture_output=True
            )
            
            print_success("All Python packages installed successfully")
            return True
            
        except Exception as e:
            print_error(f"Installation failed: {e}")
            return False
    
    def build_frontend(self):
        """Build React frontend production bundle"""
        print_step("4", "9", "Building React frontend...")
        
        frontend_dir = self.project_root / "frontend"
        build_dir = frontend_dir / "build"
        
        # Check if build already exists
        if build_dir.exists() and (build_dir / "index.html").exists():
            print_warning("Frontend build exists, skipping npm build")
            print("   (Delete frontend/build/ to rebuild)")
        else:
            try:
                print("   Running: npm run build")
                print("   (This may take 2-3 minutes)")
                
                result = subprocess.run(
                    ["npm", "run", "build"],
                    cwd=str(frontend_dir),
                    capture_output=True,
                    text=True
                )
                
                if result.returncode != 0:
                    print_error("Frontend build failed!")
                    print(result.stderr)
                    return False
                
                print_success("Frontend build completed")
                
            except Exception as e:
                print_error(f"Build failed: {e}")
                return False
        
        # Copy build to package
        package_frontend = self.package_dir / "app" / "frontend" / "build"
        if package_frontend.exists():
            shutil.rmtree(package_frontend)
        
        shutil.copytree(build_dir, package_frontend)
        print_success(f"Frontend copied to package ({self._get_size(package_frontend)})")
        
        return True
    
    def copy_backend(self):
        """Copy backend application to package"""
        print_step("5", "9", "Copying backend application...")
        
        backend_src = self.project_root / "backend"
        backend_dest = self.package_dir / "app" / "backend"
        
        if backend_dest.exists():
            shutil.rmtree(backend_dest)
        
        # Copy entire backend directory
        shutil.copytree(
            backend_src,
            backend_dest,
            ignore=shutil.ignore_patterns(
                '__pycache__', '*.pyc', '.pytest_cache', 
                'test_venv', 'tests', '*.log'
            )
        )
        
        print_success(f"Backend copied ({self._get_size(backend_dest)})")
        return True
    
    def create_config_files(self):
        """Generate configuration files"""
        print_step("6", "9", "Creating configuration files...")
        
        config_dir = self.package_dir / "config"
        config_dir.mkdir(parents=True, exist_ok=True)
        
        # Create .env file for backend
        env_file = self.package_dir / "app" / "backend" / ".env"
        env_content = """# CRPF System - Auto-generated Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=crpf_mental_health
DB_USER=root
DB_PASSWORD=
SECRET_KEY=crpf-secret-key-change-in-production
FLASK_ENV=production
"""
        env_file.write_text(env_content)
        print_success("Created .env configuration")
        
        # Create system config
        system_config = config_dir / "system.json"
        config_data = {
            "version": "1.0",
            "installation_date": "",
            "python_version": "3.10.11",
            "database": {
                "type": "mysql",
                "port": 3306,
                "auto_start": True
            },
            "backend": {
                "port": 5000,
                "host": "localhost"
            },
            "frontend": {
                "served_by": "flask"
            }
        }
        
        with open(system_config, 'w') as f:
            json.dump(config_data, f, indent=2)
        
        print_success("Created system configuration")
        return True
    
    def create_launcher_script(self):
        """Copy launcher script to package"""
        print_step("7", "9", "Preparing launcher...")
        
        # Copy existing launcher
        launcher_src = self.script_dir / "crpf_launcher.py"
        launcher_dest = self.package_dir / "crpf_launcher.py"
        
        if launcher_src.exists():
            shutil.copy(launcher_src, launcher_dest)
            print_success("Launcher script copied")
        else:
            print_warning("Original launcher not found, will need to create")
        
        return True
    
    def create_readme(self):
        """Create README for package"""
        print_step("8", "9", "Creating documentation...")
        
        readme = self.package_dir / "README.txt"
        readme_content = """
================================================================================
    CRPF MENTAL HEALTH & WELLNESS SYSTEM - Portable Package
    Version 1.0
================================================================================

This is a self-contained deployment package for Windows.

CONTENTS:
  python/          - Embedded Python 3.10 with all dependencies
  app/backend/     - Flask backend application
  app/frontend/    - React frontend (production build)
  config/          - System configuration
  logs/            - Application logs (created on first run)

PREREQUISITES:
  - MySQL 8.0 must be installed and running on localhost:3306
  - Database 'crpf_mental_health' must be created

INSTALLATION:
  1. Copy entire folder to C:\\Program Files\\SATHI\\
  2. Run SATHI.exe
  3. System will initialize database on first run
  4. Browser opens automatically

DEFAULT LOGIN:
  Force ID: CRPF000001
  Password: admin123

NOTES:
  - No Python, Node.js, or MySQL installation required
  - System runs completely offline
  - All data stored locally
  - First launch may take 30-60 seconds (database initialization)

SUPPORT:
  For issues, check logs/ folder
  Contact: support@crpf.gov.in

================================================================================
"""
        readme.write_text(readme_content)
        print_success("README created")
        return True
    
    def create_manifest(self):
        """Create package manifest"""
        print_step("9", "9", "Finalizing package...")
        
        manifest = {
            "package": "SATHI - Mental Health System",
            "version": "1.0",
            "build_date": "",
            "components": {
                "python": "3.10.11 embedded",
                "database": "MySQL 8.0 (pre-installed)",
                "backend": "Flask + AI/ML services",
                "frontend": "React (production build)"
            },
            "total_size_mb": self._get_package_size()
        }
        
        manifest_file = self.package_dir / "manifest.json"
        with open(manifest_file, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print_success("Package manifest created")
        
        # Print summary
        print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
        print(f"{Colors.GREEN}{Colors.BOLD}✅ PACKAGE BUILD COMPLETE!{Colors.END}")
        print(f"{Colors.BOLD}{'='*60}{Colors.END}")
        print(f"\nPackage location: {self.package_dir}")
        print(f"Total size: {manifest['total_size_mb']} MB")
        print(f"\nNext steps:")
        print(f"  1. Build SATHI.exe launcher with PyInstaller")
        print(f"  2. Create SATHI_Installer.exe with Inno Setup")
        print(f"\nPrerequisites for deployment:")
        print(f"  - MySQL 8.0 must be installed on target PC")
        print(f"  - Database 'crpf_mental_health' must be created")
        
        return True
    
    def _get_size(self, path: Path) -> str:
        """Get directory size in human readable format"""
        if not path.exists():
            return "0 MB"
        
        total = sum(f.stat().st_size for f in path.rglob('*') if f.is_file())
        mb = total / (1024 * 1024)
        return f"{mb:.1f} MB"
    
    def _get_package_size(self) -> float:
        """Get total package size in MB"""
        total = sum(f.stat().st_size for f in self.package_dir.rglob('*') if f.is_file())
        return round(total / (1024 * 1024), 1)
    
    def build(self):
        """Build complete package"""
        print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
        print(f"{Colors.BOLD}CRPF System - Portable Package Builder{Colors.END}")
        print(f"{Colors.BOLD}{'='*60}{Colors.END}")
        
        steps = [
            self.clean_previous_build,
            self.setup_embedded_python,
            self.install_python_packages,
            self.build_frontend,
            self.copy_backend,
            self.create_config_files,
            self.create_launcher_script,
            self.create_readme,
            self.create_manifest
        ]
        
        for step_func in steps:
            if not step_func():
                print_error(f"\nBuild failed at step: {step_func.__name__}")
                return False
        
        return True

def main():
    builder = PackageBuilder()
    
    try:
        success = builder.build()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print_error("\n\nBuild cancelled by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"\n\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
