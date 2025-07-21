#!/usr/bin/env python3
"""
Camera Reset Utility
This script helps reset camera connections when they get stuck
"""

import cv2
import time
import sys

def force_camera_reset():
    """Force release all camera connections and reset"""
    print("Attempting to reset camera connections...")
    
    # Try to release cameras on all common indices
    for idx in range(10):  # Check indices 0-9
        try:
            cap = cv2.VideoCapture(idx)
            if cap.isOpened():
                print(f"Found camera at index {idx}, releasing...")
                cap.release()
            time.sleep(0.1)
        except Exception as e:
            print(f"Error checking camera {idx}: {e}")
    
    # Destroy all OpenCV windows
    cv2.destroyAllWindows()
    time.sleep(2)
    
    print("Camera reset complete. Trying to find available camera...")
    
    # Test camera availability
    for idx in [1, 0, 2, 3, 4]:  # Common camera indices
        try:
            print(f"Testing camera at index {idx}...")
            cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
            
            if cap.isOpened():
                # Set properties
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                time.sleep(0.5)
                
                ret, frame = cap.read()
                if ret and frame is not None:
                    print(f"✅ Camera at index {idx} is working!")
                    cap.release()
                    return True
                else:
                    print(f"❌ Camera at index {idx} opens but cannot read frames")
                    cap.release()
            else:
                print(f"❌ Camera at index {idx} not available")
                
        except Exception as e:
            print(f"❌ Error testing camera {idx}: {e}")
    
    print("No working cameras found")
    return False

if __name__ == "__main__":
    success = force_camera_reset()
    sys.exit(0 if success else 1)
