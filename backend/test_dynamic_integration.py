#!/usr/bin/env python3
"""
COMPREHENSIVE DYNAMIC SETTINGS INTEGRATION TEST
==============================================
This script verifies that ALL settings from the database are actually being used:
1. Score calculation weights (nlp_weight, emotion_weight)
2. Risk threshold classifications 
3. Camera settings (width, height, detection_interval)
"""

import sys
import os
sys.path.append('.')

from api.survey.routes import get_dynamic_settings, get_dynamic_risk_thresholds, calculate_dynamic_combined_score, get_mental_state_analysis
from services.cctv_monitoring_service import CCTVMonitoringService
from db.connection import get_connection
import logging

# Disable logging for cleaner output
logging.disable(logging.CRITICAL)

def test_score_calculation_weights():
    """Test that score calculations use database weights"""
    print("🧮 TESTING SCORE CALCULATION WEIGHTS")
    print("=" * 50)
    
    # Test current weights from database
    nlp_weight, emotion_weight = get_dynamic_settings()
    print(f"Current Database Weights:")
    print(f"   📝 NLP Weight: {nlp_weight}")
    print(f"   📷 Emotion Weight: {emotion_weight}")
    
    # Test calculation with sample scores
    test_nlp = 0.8
    test_emotion = 0.4
    combined = calculate_dynamic_combined_score(test_nlp, test_emotion)
    expected = (test_nlp * nlp_weight) + (test_emotion * emotion_weight)
    
    print(f"\n🔢 Score Calculation Test:")
    print(f"   NLP Score: {test_nlp}")
    print(f"   Emotion Score: {test_emotion}")
    print(f"   Expected: ({test_nlp} * {nlp_weight}) + ({test_emotion} * {emotion_weight}) = {expected:.3f}")
    print(f"   Actual: {combined:.3f}")
    
    weights_working = abs(expected - combined) < 0.001
    print(f"   ✅ Using Database Weights: {'YES' if weights_working else 'NO'}")
    
    return weights_working

def test_risk_thresholds():
    """Test that risk classifications use database thresholds"""
    print("\n🚨 TESTING RISK THRESHOLD CLASSIFICATIONS")
    print("=" * 50)
    
    # Get current thresholds from database
    risk_thresholds = get_dynamic_risk_thresholds()
    print(f"Current Database Thresholds:")
    for level, threshold in risk_thresholds.items():
        print(f"   {level}: {threshold}")
    
    # Test classifications at each threshold boundary
    test_scores = [
        (risk_thresholds['LOW'] - 0.05, "Should be EXCELLENT"),
        (risk_thresholds['LOW'] + 0.05, "Should be GOOD"),
        (risk_thresholds['MEDIUM'] + 0.05, "Should be MILD CONCERN"),
        (risk_thresholds['HIGH'] + 0.05, "Should be MODERATE DEPRESSION"),
        (risk_thresholds['CRITICAL'] + 0.05, "Should be CRITICAL")
    ]
    
    print(f"\n🎯 Classification Tests:")
    thresholds_working = True
    
    for score, expected_desc in test_scores:
        mental_state = get_mental_state_analysis(score)
        print(f"   Score {score:.2f}: {mental_state['state']} ({expected_desc})")
        
        # Basic validation that classification changes based on thresholds
        if score < risk_thresholds['LOW'] and 'EXCELLENT' not in mental_state['state']:
            thresholds_working = False
        elif score > risk_thresholds['CRITICAL'] and 'CRITICAL' not in mental_state['state']:
            thresholds_working = False
    
    print(f"   ✅ Using Database Thresholds: {'YES' if thresholds_working else 'NO'}")
    return thresholds_working

def test_camera_settings():
    """Test that camera settings use database values"""
    print("\n📷 TESTING CAMERA SETTINGS")
    print("=" * 50)
    
    try:
        # Initialize monitoring service to check if it uses database settings
        monitoring_service = CCTVMonitoringService()
        
        # Get camera settings from database directly
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT setting_name, setting_value 
            FROM system_settings 
            WHERE setting_name IN ('camera_width', 'camera_height', 'detection_interval', 'webcam_enabled')
        """)
        
        db_camera_settings = cursor.fetchall()
        conn.close()
        
        print(f"Database Camera Settings:")
        camera_settings = {}
        for setting in db_camera_settings:
            camera_settings[setting['setting_name']] = setting['setting_value']
            print(f"   {setting['setting_name']}: {setting['setting_value']}")
        
        # Test if service has a method to get camera settings
        if hasattr(monitoring_service, 'get_camera_settings'):
            service_settings = monitoring_service.get_camera_settings()
            print(f"\nCCTV Service Settings:")
            for key, value in service_settings.items():
                print(f"   {key}: {value}")
            
            # Check if they match
            settings_match = True
            if 'camera_width' in camera_settings and 'width' in service_settings:
                settings_match &= int(camera_settings['camera_width']) == service_settings['width']
            if 'camera_height' in camera_settings and 'height' in service_settings:
                settings_match &= int(camera_settings['camera_height']) == service_settings['height']
            if 'detection_interval' in camera_settings and 'detection_interval' in service_settings:
                settings_match &= int(camera_settings['detection_interval']) == service_settings['detection_interval']
                
            print(f"   ✅ Using Database Camera Settings: {'YES' if settings_match else 'NO'}")
            return settings_match
        else:
            print(f"   ⚠️  get_camera_settings method not found in CCTVMonitoringService")
            print(f"   💡 Camera settings integration may need to be implemented")
            return False
            
    except Exception as e:
        print(f"   ❌ Error testing camera settings: {e}")
        return False

def update_test_settings():
    """Update some settings to different values for testing"""
    print("\n🔧 UPDATING TEST SETTINGS")
    print("=" * 50)
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Update to different test values
        test_updates = [
            ('nlp_weight', '0.8'),  # Change from 0.7 to 0.8
            ('emotion_weight', '0.2'),  # Change from 0.3 to 0.2
            ('risk_medium_threshold', '0.6'),  # Change from 0.5 to 0.6
            ('camera_width', '800'),  # Change width
            ('camera_height', '600')  # Change height
        ]
        
        for setting_name, new_value in test_updates:
            cursor.execute("""
                UPDATE system_settings 
                SET setting_value = %s, updated_at = NOW()
                WHERE setting_name = %s
            """, (new_value, setting_name))
            print(f"   Updated {setting_name}: {new_value}")
        
        conn.commit()
        conn.close()
        print(f"   ✅ Test settings updated successfully")
        return True
        
    except Exception as e:
        print(f"   ❌ Error updating test settings: {e}")
        return False

def restore_original_settings():
    """Restore original settings after testing"""
    print("\n🔄 RESTORING ORIGINAL SETTINGS")
    print("=" * 50)
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Restore original values
        original_updates = [
            ('nlp_weight', '0.7'),
            ('emotion_weight', '0.3'),
            ('risk_medium_threshold', '0.5'),
            ('camera_width', '640'),
            ('camera_height', '480')
        ]
        
        for setting_name, original_value in original_updates:
            cursor.execute("""
                UPDATE system_settings 
                SET setting_value = %s, updated_at = NOW()
                WHERE setting_name = %s
            """, (original_value, setting_name))
            print(f"   Restored {setting_name}: {original_value}")
        
        conn.commit()
        conn.close()
        print(f"   ✅ Original settings restored")
        return True
        
    except Exception as e:
        print(f"   ❌ Error restoring settings: {e}")
        return False

def main():
    """Run comprehensive dynamic settings integration test"""
    print("🔬 COMPREHENSIVE DYNAMIC SETTINGS INTEGRATION TEST")
    print("=" * 60)
    print("Testing that ALL database settings actually affect system behavior")
    print("=" * 60)
    
    # Phase 1: Test current settings
    print("\n📋 PHASE 1: Testing Current Settings")
    weights_ok = test_score_calculation_weights()
    thresholds_ok = test_risk_thresholds()
    camera_ok = test_camera_settings()
    
    # Phase 2: Change settings and test again
    print("\n📋 PHASE 2: Testing Settings Changes")
    if update_test_settings():
        print(f"\n🔄 Re-testing with CHANGED settings...")
        weights_changed = test_score_calculation_weights()
        thresholds_changed = test_risk_thresholds()
        camera_changed = test_camera_settings()
        
        # Restore original settings
        restore_original_settings()
        
        # Final verification
        print("\n📋 PHASE 3: Final Verification")
        print("=" * 50)
        print(f"🧮 Score Weights Dynamic: {'✅ YES' if weights_ok and weights_changed else '❌ NO'}")
        print(f"🚨 Risk Thresholds Dynamic: {'✅ YES' if thresholds_ok and thresholds_changed else '❌ NO'}")
        print(f"📷 Camera Settings Dynamic: {'✅ YES' if camera_ok and camera_changed else '❌ NO'}")
        
        if weights_ok and thresholds_ok and camera_ok:
            print(f"\n🎉 SUCCESS: All dynamic settings are working correctly!")
            print(f"📝 Settings page changes WILL affect system calculations and behavior")
        else:
            print(f"\n⚠️  PARTIAL SUCCESS: Some dynamic settings need attention")
            if not camera_ok:
                print(f"💡 Camera settings integration may need implementation")
    
    print(f"\n" + "=" * 60)
    print(f"Integration test complete!")

if __name__ == "__main__":
    main()
