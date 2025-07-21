#!/usr/bin/env python3
"""
Camera Test Script for CRPF Mental Health Monitoring System
This script tests camera functionality and face recognition model.
"""

import cv2
import logging
import sys
import os
from services.emotion_detection_service import EmotionDetectionService
from services.cctv_monitoring_service import CCTVMonitoringService

def test_camera_access():
    """Test camera access on different indices"""
    print("=== Testing Camera Access ===")
    
    camera_indices = [0, 1, 2, 3, 4]
    working_cameras = []
    
    for idx in camera_indices:
        print(f"Testing camera index {idx}...")
        cap = cv2.VideoCapture(idx)
        
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                print(f"✅ Camera {idx}: Working (Resolution: {frame.shape[1]}x{frame.shape[0]})")
                working_cameras.append(idx)
            else:
                print(f"❌ Camera {idx}: Opened but cannot read frames")
            cap.release()
        else:
            print(f"❌ Camera {idx}: Not available")
    
    print(f"\nFound {len(working_cameras)} working camera(s): {working_cameras}")
    return working_cameras

def test_emotion_detection_service():
    """Test emotion detection service loading"""
    print("\n=== Testing Emotion Detection Service ===")
    
    try:
        emotion_service = EmotionDetectionService()
        print("✅ Emotion Detection Service loaded successfully")
        
        # Check face recognition model
        print(f"📊 Trained soldiers in face recognition model: {len(emotion_service.known_force_ids)}")
        print(f"🆔 Force IDs: {emotion_service.known_force_ids}")
        
        return emotion_service
    except Exception as e:
        print(f"❌ Failed to load Emotion Detection Service: {e}")
        return None

def test_cctv_monitoring_service():
    """Test CCTV monitoring service"""
    print("\n=== Testing CCTV Monitoring Service ===")
    
    try:
        monitoring_service = CCTVMonitoringService()
        print("✅ CCTV Monitoring Service initialized successfully")
        
        # Test camera finding method
        print("🔍 Testing camera detection...")
        camera = monitoring_service._find_available_camera()
        
        if camera:
            print("✅ Camera detection successful")
            camera.release()
        else:
            print("❌ Camera detection failed")
            
        return monitoring_service
    except Exception as e:
        print(f"❌ Failed to initialize CCTV Monitoring Service: {e}")
        return None

def test_live_detection(force_id="100000002"):
    """Test live face detection and emotion recognition"""
    print(f"\n=== Testing Live Detection for Force ID: {force_id} ===")
    
    try:
        monitoring_service = CCTVMonitoringService()
        
        # Test camera access
        cap = monitoring_service._find_available_camera()
        if not cap:
            print("❌ No camera available for live testing")
            return
        
        print("📹 Camera initialized. Press 'q' to quit, 's' to save a test frame")
        print("🎯 Look at the camera for face detection test...")
        
        frame_count = 0
        detection_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("❌ Failed to read frame")
                break
            
            frame_count += 1
            
            # Test detection every 10 frames
            if frame_count % 10 == 0:
                result = monitoring_service.emotion_service.detect_face_and_emotion(frame)
                
                if result:
                    detected_force_id, emotion, score, face_coords = result
                    detection_count += 1
                    print(f"🎯 Detection #{detection_count}: Force ID: {detected_force_id}, Emotion: {emotion}, Score: {score:.2f}")
                    
                    # Draw detection on frame
                    x, y, w, h = face_coords
                    cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                    cv2.putText(frame, f"ID: {detected_force_id}", (x, y-10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                    cv2.putText(frame, f"Emotion: {emotion}", (x, y+h+25), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                else:
                    if frame_count % 50 == 0:  # Print every 50 frames to avoid spam
                        print("👤 No face detected or not recognized")
            
            # Display frame
            cv2.imshow('Face Detection Test', frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s'):
                filename = f"test_frame_{frame_count}.jpg"
                cv2.imwrite(filename, frame)
                print(f"💾 Saved frame as {filename}")
        
        cap.release()
        cv2.destroyAllWindows()
        
        print(f"\n📊 Test completed:")
        print(f"   - Total frames processed: {frame_count}")
        print(f"   - Successful detections: {detection_count}")
        
    except Exception as e:
        print(f"❌ Live detection test failed: {e}")

def main():
    """Main test function"""
    print("CRPF Mental Health Monitoring - Camera & Emotion Detection Test")
    print("=" * 60)
    
    # Test 1: Camera Access
    working_cameras = test_camera_access()
    
    # Test 2: Emotion Detection Service
    emotion_service = test_emotion_detection_service()
    
    # Test 3: CCTV Monitoring Service
    monitoring_service = test_cctv_monitoring_service()
    
    # Test 4: Live Detection (optional)
    if working_cameras and emotion_service:
        print("\n" + "=" * 60)
        response = input("Do you want to test live face detection? (y/n): ").lower().strip()
        if response == 'y':
            force_id = input("Enter Force ID to test (default: 100000002): ").strip()
            if not force_id:
                force_id = "100000002"
            test_live_detection(force_id)
    
    print("\n" + "=" * 60)
    print("Test completed!")

if __name__ == "__main__":
    main()
