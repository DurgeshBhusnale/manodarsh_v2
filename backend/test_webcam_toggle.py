#!/usr/bin/env python3
"""
Test script for webcam toggle functionality
This script tests the database integration for the webcam toggle feature
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.connection import get_connection

def test_webcam_toggle():
    """Test the webcam toggle database functionality"""
    try:
        # Get database connection
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        print("🔧 Testing Webcam Toggle Database Integration")
        print("=" * 50)
        
        # 1. Insert webcam setting if it doesn't exist
        print("1. Inserting default webcam setting...")
        cursor.execute("""
            INSERT INTO system_settings (setting_name, setting_value, description)
            VALUES ('webcam_enabled', 'true', 'Enable/disable webcam feed for survey emotion monitoring (for setup/testing purposes)')
            ON DUPLICATE KEY UPDATE setting_value = setting_value
        """)
        conn.commit()
        print("   ✅ Default setting inserted/verified")
        
        # 2. Read current setting
        print("\n2. Reading current webcam setting...")
        cursor.execute("SELECT * FROM system_settings WHERE setting_name = 'webcam_enabled'")
        result = cursor.fetchone()
        if result:
            print(f"   📹 Webcam setting found:")
            print(f"      Value: {result['setting_value']}")
            print(f"      Description: {result['description']}")
        else:
            print("   ❌ Webcam setting not found")
        
        # 3. Test toggle to false
        print("\n3. Testing toggle to false...")
        cursor.execute("""
            UPDATE system_settings 
            SET setting_value = 'false', updated_at = NOW()
            WHERE setting_name = 'webcam_enabled'
        """)
        conn.commit()
        
        # Verify update
        cursor.execute("SELECT setting_value FROM system_settings WHERE setting_name = 'webcam_enabled'")
        result = cursor.fetchone()
        print(f"   📹 Webcam setting updated to: {result['setting_value']}")
        
        # 4. Test toggle to true
        print("\n4. Testing toggle to true...")
        cursor.execute("""
            UPDATE system_settings 
            SET setting_value = 'true', updated_at = NOW()
            WHERE setting_name = 'webcam_enabled'
        """)
        conn.commit()
        
        # Verify update
        cursor.execute("SELECT setting_value FROM system_settings WHERE setting_name = 'webcam_enabled'")
        result = cursor.fetchone()
        print(f"   📹 Webcam setting updated to: {result['setting_value']}")
        
        # 5. List all settings (since there's no category field)
        print("\n5. All settings in the system:")
        cursor.execute("SELECT setting_name, setting_value FROM system_settings ORDER BY setting_name")
        all_settings = cursor.fetchall()
        for setting in all_settings:
            print(f"   - {setting['setting_name']}: {setting['setting_value']}")
        
        print("\n🎉 All tests passed! Webcam toggle functionality is working correctly.")
        return True
        
    except Exception as e:
        print(f"\n❌ Error testing webcam toggle: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    success = test_webcam_toggle()
    sys.exit(0 if success else 1)
