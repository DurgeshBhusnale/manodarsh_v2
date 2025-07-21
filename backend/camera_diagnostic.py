#!/usr/bin/env python3
"""
Deep Camera Diagnostic Tool for CRPF Mental Health System
Analyzes camera access patterns and Windows Media Foundation conflicts
"""

import cv2
import time
import threading
import logging
from datetime import datetime

class CameraDiagnostic:
    def __init__(self):
        self.setup_logging()
        
    def setup_logging(self):
        logging.basicConfig(
            filename=f"camera_diagnostic_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log",
            level=logging.DEBUG,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        
    def test_all_backends(self):
        """Test all available OpenCV backends"""
        backends = [
            (cv2.CAP_DSHOW, "DirectShow"),
            (cv2.CAP_MSMF, "Microsoft Media Foundation"),
            (cv2.CAP_V4L2, "Video4Linux2"),
            (cv2.CAP_GSTREAMER, "GStreamer"),
        ]
        
        print("=== CAMERA BACKEND ANALYSIS ===")
        working_backends = []
        
        for backend_id, backend_name in backends:
            print(f"\nTesting {backend_name}...")
            logging.info(f"Testing backend: {backend_name}")
            
            try:
                cap = cv2.VideoCapture(0, backend_id)
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret and frame is not None:
                        print(f"✅ {backend_name}: SUCCESS - Can read frames")
                        working_backends.append((backend_id, backend_name))
                        
                        # Test continuous reading
                        success_count = 0
                        for i in range(10):
                            ret, frame = cap.read()
                            if ret:
                                success_count += 1
                            time.sleep(0.1)
                        
                        print(f"   Continuous read: {success_count}/10 frames")
                        logging.info(f"{backend_name}: {success_count}/10 continuous frames")
                    else:
                        print(f"❌ {backend_name}: FAIL - Cannot read frames")
                        logging.warning(f"{backend_name}: Cannot read frames")
                else:
                    print(f"❌ {backend_name}: FAIL - Cannot open camera")
                    logging.warning(f"{backend_name}: Cannot open camera")
                cap.release()
            except Exception as e:
                print(f"❌ {backend_name}: ERROR - {str(e)}")
                logging.error(f"{backend_name}: {str(e)}")
        
        return working_backends
    
    def test_concurrent_access(self):
        """Test if multiple camera accesses cause conflicts"""
        print("\n=== CONCURRENT ACCESS TEST ===")
        
        def camera_thread(thread_id, duration=5):
            cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            if cap.isOpened():
                start_time = time.time()
                frame_count = 0
                while time.time() - start_time < duration:
                    ret, frame = cap.read()
                    if ret:
                        frame_count += 1
                    time.sleep(0.1)
                print(f"Thread {thread_id}: {frame_count} frames in {duration}s")
                cap.release()
            else:
                print(f"Thread {thread_id}: Failed to open camera")
        
        # Test single access
        print("Single camera access...")
        camera_thread(1, 3)
        
        time.sleep(2)
        
        # Test concurrent access
        print("Concurrent camera access...")
        thread1 = threading.Thread(target=camera_thread, args=(1, 3))
        thread2 = threading.Thread(target=camera_thread, args=(2, 3))
        
        thread1.start()
        time.sleep(0.5)  # Slight delay
        thread2.start()
        
        thread1.join()
        thread2.join()
    
    def test_camera_properties(self):
        """Test various camera properties and settings"""
        print("\n=== CAMERA PROPERTIES TEST ===")
        
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        if not cap.isOpened():
            print("Cannot open camera for properties test")
            return
        
        properties = [
            (cv2.CAP_PROP_FRAME_WIDTH, "Frame Width"),
            (cv2.CAP_PROP_FRAME_HEIGHT, "Frame Height"),
            (cv2.CAP_PROP_FPS, "FPS"),
            (cv2.CAP_PROP_BUFFERSIZE, "Buffer Size"),
            (cv2.CAP_PROP_AUTOFOCUS, "Auto Focus"),
            (cv2.CAP_PROP_FOCUS, "Focus"),
        ]
        
        print("Current camera properties:")
        for prop_id, prop_name in properties:
            try:
                value = cap.get(prop_id)
                print(f"  {prop_name}: {value}")
                logging.info(f"Camera property {prop_name}: {value}")
            except Exception as e:
                print(f"  {prop_name}: ERROR - {str(e)}")
        
        # Test setting optimized properties
        print("\nTesting optimized settings...")
        optimized_settings = [
            (cv2.CAP_PROP_BUFFERSIZE, 1),
            (cv2.CAP_PROP_FPS, 15),
            (cv2.CAP_PROP_FRAME_WIDTH, 640),
            (cv2.CAP_PROP_FRAME_HEIGHT, 480),
        ]
        
        for prop_id, value in optimized_settings:
            result = cap.set(prop_id, value)
            actual_value = cap.get(prop_id)
            prop_name = next(name for pid, name in properties if pid == prop_id)
            print(f"  Set {prop_name} to {value}: {'SUCCESS' if result else 'FAILED'} (actual: {actual_value})")
        
        cap.release()
    
    def run_full_diagnostic(self):
        """Run complete camera diagnostic"""
        print("🔍 CRPF Camera Diagnostic Tool")
        print("=" * 50)
        
        working_backends = self.test_all_backends()
        self.test_camera_properties()
        self.test_concurrent_access()
        
        print("\n=== DIAGNOSTIC SUMMARY ===")
        if working_backends:
            print("✅ Working backends found:")
            for backend_id, backend_name in working_backends:
                print(f"   - {backend_name}")
        else:
            print("❌ No working camera backends found")
        
        print(f"\nLog file: camera_diagnostic_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")

if __name__ == "__main__":
    diagnostic = CameraDiagnostic()
    diagnostic.run_full_diagnostic()
