#!/usr/bin/env python3
"""
CRPF Mental Health System - Database Initialization
Runs on first installation to set up database schema and default users
Version: 1.0
"""

import os
import sys
import time
from pathlib import Path

# Try to import MySQL connector
try:
    import mysql.connector
    from mysql.connector import Error
except ImportError:
    print("❌ mysql-connector-python not installed")
    print("   Install with: pip install mysql-connector-python")
    sys.exit(1)

# Try to import bcrypt for password hashing
try:
    import bcrypt
except ImportError:
    print("❌ bcrypt not installed")
    print("   Install with: pip install bcrypt")
    sys.exit(1)

class DatabaseInitializer:
    """Initialize CRPF database on first run"""
    
    def __init__(self):
        # Detect installation directory
        if getattr(sys, 'frozen', False):
            self.install_dir = Path(sys.executable).parent
        else:
            self.install_dir = Path(__file__).parent.parent
        
        # Paths
        self.schema_file = self.install_dir / "app" / "backend" / "db" / "schema.sql"
        
        # Database config (read from env or use defaults)
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', 3306)),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', ''),
        }
        
        self.db_name = os.getenv('DB_NAME', 'crpf_mental_health')
    
    def wait_for_mysql(self, max_attempts=30):
        """Wait for MySQL to be ready"""
        print("Waiting for MySQL to be ready...", end='', flush=True)
        
        for i in range(max_attempts):
            try:
                conn = mysql.connector.connect(**self.db_config)
                conn.close()
                print(" ✅")
                return True
            except Error:
                time.sleep(1)
                print(".", end='', flush=True)
        
        print(" ❌")
        return False
    
    def database_exists(self, cursor) -> bool:
        """Check if database already exists"""
        try:
            cursor.execute(f"SHOW DATABASES LIKE '{self.db_name}'")
            return cursor.fetchone() is not None
        except Error:
            return False
    
    def create_database(self, cursor):
        """Create the database"""
        print(f"Creating database '{self.db_name}'...")
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.db_name}")
        cursor.execute(f"USE {self.db_name}")
        print("✅ Database created")
    
    def run_schema(self, cursor):
        """Execute schema.sql to create tables"""
        print("Creating database tables...")
        
        if not self.schema_file.exists():
            print(f"❌ Schema file not found: {self.schema_file}")
            return False
        
        try:
            with open(self.schema_file, 'r', encoding='utf-8') as f:
                schema_sql = f.read()
            
            # Split by semicolons and execute each statement
            statements = [s.strip() for s in schema_sql.split(';') if s.strip()]
            
            for statement in statements:
                if statement:
                    try:
                        cursor.execute(statement)
                    except Error as e:
                        # Ignore "table already exists" errors
                        if "already exists" not in str(e):
                            print(f"⚠️  Warning executing statement: {e}")
            
            print("✅ Database schema created (16 tables)")
            return True
            
        except Exception as e:
            print(f"❌ Failed to run schema: {e}")
            return False
    
    def create_default_admin(self, cursor):
        """Create default admin user"""
        print("Creating default admin user...")
        
        force_id = 'CRPF000001'
        password = 'admin123'
        
        try:
            # Check if admin already exists
            cursor.execute("SELECT force_id FROM users WHERE force_id = %s", (force_id,))
            if cursor.fetchone():
                print(f"⚠️  Admin user {force_id} already exists, skipping")
                return True
            
            # Hash password with bcrypt
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Insert admin user
            cursor.execute(
                "INSERT INTO users (force_id, password_hash, user_type) VALUES (%s, %s, 'admin')",
                (force_id, password_hash)
            )
            
            print(f"✅ Default admin created")
            print(f"   Force ID: {force_id}")
            print(f"   Password: {password}")
            print(f"   ⚠️  CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!")
            return True
            
        except Error as e:
            print(f"❌ Failed to create admin: {e}")
            return False
    
    def initialize(self) -> bool:
        """Main initialization process"""
        print("\n" + "="*60)
        print("CRPF SYSTEM - DATABASE INITIALIZATION")
        print("="*60 + "\n")
        
        # Wait for MySQL
        if not self.wait_for_mysql():
            print("❌ MySQL is not responding")
            print("   Make sure MySQL is running")
            return False
        
        conn = None
        cursor = None
        
        try:
            # Connect to MySQL server
            print(f"Connecting to MySQL at {self.db_config['host']}:{self.db_config['port']}...")
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            print("✅ Connected to MySQL")
            
            # Check if database exists
            if self.database_exists(cursor):
                print(f"⚠️  Database '{self.db_name}' already exists")
                response = input("   Reinitialize? (This will DROP and recreate all tables) [y/N]: ")
                if response.lower() != 'y':
                    print("   Skipping initialization")
                    return True
                
                # Drop and recreate
                print(f"Dropping database '{self.db_name}'...")
                cursor.execute(f"DROP DATABASE {self.db_name}")
            
            # Create database
            self.create_database(cursor)
            
            # Run schema
            if not self.run_schema(cursor):
                return False
            
            # Create default admin
            if not self.create_default_admin(cursor):
                return False
            
            # Commit changes
            conn.commit()
            
            print("\n" + "="*60)
            print("✅ DATABASE INITIALIZATION COMPLETE")
            print("="*60)
            print("\n📋 Summary:")
            print(f"   • Database: {self.db_name}")
            print(f"   • Tables: 16 (users, questionnaires, sessions, etc.)")
            print(f"   • Default Admin: CRPF000001 / admin123")
            print("\n🚀 System is ready to use!")
            print("\n")
            
            return True
            
        except Error as e:
            print(f"\n❌ Database error: {e}")
            return False
            
        except Exception as e:
            print(f"\n❌ Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            return False
            
        finally:
            if cursor:
                cursor.close()
            if conn and conn.is_connected():
                conn.close()

def main():
    """Main entry point"""
    initializer = DatabaseInitializer()
    
    try:
        success = initializer.initialize()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Initialization cancelled by user")
        sys.exit(1)

if __name__ == "__main__":
    main()
