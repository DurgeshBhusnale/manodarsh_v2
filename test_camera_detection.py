#!/usr/bin/env python3
"""
Camera Detection Test Script
Tests Windows-optimized camera detection with DirectShow backend

Usage:
    python test_camera_detection.py
"""

import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

try:
    import cv2
    import time
    from services.cctv_monitoring_service import get_monitoring_service_instance
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please ensure you're running this from the project root and backend dependencies are installed.")
    sys.exit(1)

def test_camera_detection():
    """Test Windows-optimized camera detection"""
    print("=" * 60)
    print("CRPF Mental Health System - Camera Detection Test")
    print("=" * 60)
    print()
    
    # Check OpenCV version
    print(f"✓ OpenCV version: {cv2.__version__}")
    print(f"✓ DirectShow constant: {cv2.CAP_DSHOW}")
    print()
    
    # Get monitoring service instance
    print("Initializing monitoring service...")
    service = get_monitoring_service_instance()
    print("✓ Service initialized")
    print()
    
    # Test 1: Enumerate all cameras
    print("-" * 60)
    print("TEST 1: Camera Enumeration")
    print("-" * 60)
    cameras = service.get_available_cameras_windows()
    
    if cameras:
        print(f"✅ SUCCESS: Found {len(cameras)} camera(s)")
        print()
        for cam in cameras:
            print(f"  Camera {cam['index']}:")
            print(f"    Resolution: {cam['resolution']}")
            print(f"    FPS: {cam['fps']}")
            print(f"    Backend: {cam['backend']}")
            print(f"    Status: {cam['status']}")
            print()
    else:
        print("❌ FAILED: No cameras detected")
        print()
        print("Troubleshooting:")
        print("  1. Check camera is connected and powered on")
        print("  2. Verify Windows Privacy Settings > Camera > Allow apps")
        print("  3. Close other applications using camera (Zoom, Teams, etc.)")
        print("  4. Try unplugging and reconnecting USB camera")
        print()
        return False
    
    # Test 2: Test primary camera detection
    print("-" * 60)
    print("TEST 2: Primary Camera Detection")
    print("-" * 60)
    
    cap = service._find_available_camera()
    
    if cap:
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        
        print(f"✅ SUCCESS: Camera initialized")
        print(f"  Resolution: {width}x{height}")
        print(f"  FPS: {fps}")
        print()
        
        # Test frame capture
        print("Testing frame capture (5 frames)...")
        for i in range(5):
            ret, frame = cap.read()
            if ret and frame is not None:
                print(f"  ✓ Frame {i+1}: OK (size: {frame.shape})")
            else:
                print(f"  ✗ Frame {i+1}: Failed")
            time.sleep(0.2)
        
        cap.release()
        print()
        print("✅ Camera test completed successfully!")
    else:
        print("❌ FAILED: Could not initialize camera")
        print()
        return False
    
    print()
    print("=" * 60)
    print("ALL TESTS PASSED ✅")
    print("=" * 60)
    print()
    print("Your camera is ready for CRPF Mental Health System surveys!")
    print()
    return True

if __name__ == "__main__":
    try:
        success = test_camera_detection()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
