#!/usr/bin/env python3
"""Test backup cleanup functionality"""

import sys
import os
sys.path.append('.')

from services.face_model_manager import FaceModelManager

def test_cleanup():
    """Test the backup cleanup functionality"""
    print("Testing backup cleanup...")
    
    # Create manager instance
    manager = FaceModelManager()
    
    # List current backups
    print("\nBefore cleanup:")
    models_dir = "storage/models"
    for file in os.listdir(models_dir):
        if "backup" in file:
            print(f"  {file}")
    
    # Run cleanup
    print("\nRunning cleanup (keep 1 atomic, 1 migration)...")
    manager._cleanup_atomic_backups(keep_count=1)
    manager._cleanup_migration_backups(keep_count=1)
    
    # List backups after cleanup
    print("\nAfter cleanup:")
    for file in os.listdir(models_dir):
        if "backup" in file:
            print(f"  {file}")
    
    print("\nCleanup test completed!")

if __name__ == "__main__":
    test_cleanup()
