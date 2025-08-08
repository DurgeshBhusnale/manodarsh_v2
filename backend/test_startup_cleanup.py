#!/usr/bin/env python3
"""Test startup cleanup functionality"""

import sys
import os
sys.path.append('.')

def test_startup_cleanup():
    """Test that startup cleanup works"""
    print("Testing startup cleanup...")
    
    # Show current backups
    print("\nBefore initializing FaceModelManager:")
    models_dir = "storage/models"
    for file in sorted(os.listdir(models_dir)):
        if "backup" in file:
            print(f"  {file}")
    
    # Initialize manager (this should trigger cleanup)
    from services.face_model_manager import FaceModelManager
    print("\nInitializing FaceModelManager (should trigger cleanup)...")
    manager = FaceModelManager()
    
    # Show backups after initialization
    print("\nAfter initialization:")
    for file in sorted(os.listdir(models_dir)):
        if "backup" in file:
            print(f"  {file}")
    
    print("\nStartup cleanup test completed!")

if __name__ == "__main__":
    test_startup_cleanup()
