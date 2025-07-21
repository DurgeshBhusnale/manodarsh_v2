#!/usr/bin/env python3
"""
Quick test to isolate camera service failure
"""

import sys
import os
import traceback

# Add the backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_cctv_service():
    print("=== CCTV Service Isolation Test ===")
    
    try:
        print("1. Importing CCTVMonitoringService...")
        from services.cctv_monitoring_service import CCTVMonitoringService
        print("✅ Import successful")
        
        print("2. Creating service instance...")
        service = CCTVMonitoringService()
        print("✅ Instance created")
        
        print("3. Testing camera detection...")
        cap = service._find_available_camera()
        if cap:
            print("✅ Camera detected successfully")
            ret, frame = cap.read()
            if ret:
                print("✅ Camera can read frames")
                print(f"   Frame shape: {frame.shape}")
            else:
                print("❌ Camera cannot read frames")
            cap.release()
        else:
            print("❌ No camera detected")
            
        print("4. Testing EmotionDetectionService initialization...")
        from services.emotion_detection_service import EmotionDetectionService
        emotion_service = EmotionDetectionService()
        print("✅ EmotionDetectionService initialized")
        
        print("5. Testing start_survey_monitoring...")
        result = service.start_survey_monitoring("100000002")
        print(f"✅ start_survey_monitoring result: {result}")
        
        print("6. Cleaning up...")
        service.cleanup_camera()
        print("✅ Cleanup completed")
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        print("\nFull traceback:")
        traceback.print_exc()

if __name__ == "__main__":
    test_cctv_service()
