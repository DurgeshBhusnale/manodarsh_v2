from flask import Blueprint, jsonify, request, send_file
import logging
import os
import re
import shutil
from services.image_collection import ImageCollectionService
from services.enhanced_face_recognition_service import EnhancedFaceRecognitionService
from services.enhanced_emotion_detection_service import EnhancedEmotionDetectionService
from services.cctv_monitoring_service import CCTVMonitoringService
from services.face_model_manager import FaceModelManager
from db.connection import get_connection
from datetime import datetime

image_bp = Blueprint('image', __name__)
image_collection_service = ImageCollectionService()
face_recognition_service = EnhancedFaceRecognitionService()
monitoring_service = CCTVMonitoringService()

@image_bp.route('/collect', methods=['POST'])
def collect_images():
    """Handle image collection for a soldier"""
    data = request.get_json()
    if not data or 'force_id' not in data:
        return jsonify({'error': 'Missing required field: force_id'}), 400
    force_id = data['force_id']
    # Validate force_id format
    if not force_id.isdigit() or len(force_id) != 9:
        return jsonify({'error': 'Invalid force ID format. Must be 9 digits.'}), 400
    try:
        folder_path = image_collection_service.collect_images(force_id)
        return jsonify({'message': 'Image collection successful', 'folder_path': folder_path}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Alias endpoint for frontend compatibility
@image_bp.route('/capture', methods=['POST'])
def capture_images():
    """Alias for /collect to support frontend endpoint"""
    return collect_images()

@image_bp.route('/train', methods=['POST'])
def train_model():
    """Train the face recognition model on new soldiers"""
    data = request.get_json(silent=True) or {}
    force_id = data.get('force_id')
    
    try:
        # Use the enhanced training method with additional safety
        logging.info(f"Training request received for force_id: {force_id}")
        
        if force_id:
            result = face_recognition_service.train_model_enhanced([force_id])
        else:
            result = face_recognition_service.train_model_enhanced()
            
        logging.info(f"Training completed with result: {result.get('status', 'unknown')}")
        return jsonify(result)
        
    except MemoryError as e:
        error_msg = "Training failed due to insufficient memory"
        logging.error(f"{error_msg}: {e}")
        return jsonify({'error': error_msg, 'status': 'error'}), 500
        
    except Exception as e:
        error_msg = f"Training Error: Failed to train model. Please try again."
        logging.error(f"Training exception: {e}", exc_info=True)
        return jsonify({'error': error_msg, 'status': 'error'}), 500

@image_bp.route('/train/batch', methods=['POST'])
def train_batch():
    """
    Production batch training endpoint with full atomic safety
    Optimized for training multiple soldiers at once
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        force_ids = data.get('force_ids', [])
        if not force_ids:
            return jsonify({'error': 'No force IDs provided'}), 400
        
        if not isinstance(force_ids, list):
            return jsonify({'error': 'force_ids must be an array'}), 400
        
        # Validate force_ids format
        invalid_ids = []
        for force_id in force_ids:
            if not isinstance(force_id, str) or not force_id.strip():
                invalid_ids.append(force_id)
            elif not re.match(r'^\d{9}$', force_id.strip()):
                invalid_ids.append(force_id)
        
        if invalid_ids:
            return jsonify({
                'error': f'Invalid force IDs format: {invalid_ids}. Must be 9-digit strings.'
            }), 400
        
        # Use batch training method
        result = face_recognition_service.train_soldiers_batch([fid.strip() for fid in force_ids])
        
        # Return appropriate status code based on result
        if result.get('status') == 'success':
            return jsonify(result), 200
        elif result.get('status') == 'warning':
            return jsonify(result), 206  # Partial content
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logging.error(f"Batch training API error: {e}")
        return jsonify({'error': str(e)}), 500

@image_bp.route('/start-monitoring', methods=['POST'])
def start_monitoring():
    """DISABLED: Start CCTV emotion monitoring for a day"""
    return jsonify({
        'error': 'Daily CCTV monitoring is temporarily disabled. Only survey emotion monitoring is active.'
    }), 503

@image_bp.route('/end-monitoring', methods=['POST'])
def end_monitoring():
    """DISABLED: End CCTV emotion monitoring for a day"""
    return jsonify({
        'error': 'Daily CCTV monitoring is temporarily disabled. Only survey emotion monitoring is active.'
    }), 503

@image_bp.route('/process-frame', methods=['POST'])
def process_frame():
    """DISABLED: Process a single frame from CCTV feed"""
    return jsonify({
        'error': 'Daily CCTV monitoring is temporarily disabled. Only survey emotion monitoring is active.'
    }), 503

@image_bp.route('/start-survey-monitoring', methods=['POST'])
def start_survey_monitoring():
    """Start emotion detection during survey for a specific soldier"""
    data = request.get_json()
    if not data or 'force_id' not in data:
        return jsonify({
            'error': 'Missing required field: force_id'
        }), 400
        
    force_id = data['force_id']
    
    try:
        # OPTIMIZATION: Quick return if monitoring is already active for this soldier
        if hasattr(monitoring_service, 'survey_monitoring') and monitoring_service.survey_monitoring:
            if hasattr(monitoring_service, 'survey_force_id') and monitoring_service.survey_force_id == force_id:
                return jsonify({
                    'message': 'Survey emotion monitoring already active',
                    'webcam_enabled': True,
                    'force_id': force_id,
                    'already_active': True
                }), 200
        
        # Check if webcam is enabled before starting monitoring
        from db.connection import get_connection
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT setting_value FROM system_settings WHERE setting_name = 'webcam_enabled'")
        result = cursor.fetchone()
        conn.close()
        
        webcam_enabled = True  # Default to enabled
        if result:
            webcam_enabled = result['setting_value'].lower() == 'true'
        
        if not webcam_enabled:
            return jsonify({
                'message': 'Survey emotion monitoring is disabled by administrator',
                'webcam_enabled': False,
                'force_id': force_id
            }), 200
        
        # Start monitoring for this specific soldier
        if monitoring_service.start_survey_monitoring(force_id):
            return jsonify({
                'message': 'Survey emotion monitoring started successfully',
                'webcam_enabled': True,
                'force_id': force_id
            }), 200
        else:
            return jsonify({
                'error': 'Failed to start survey monitoring: Could not initialize camera'
            }), 500
    except Exception as e:
        logging.error(f"Error in start_survey_monitoring: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500

@image_bp.route('/end-survey-monitoring', methods=['POST'])
def end_survey_monitoring():
    """End emotion detection during survey and store results"""
    data = request.get_json()
    if not data or 'force_id' not in data:
        return jsonify({
            'error': 'Missing required field: force_id'
        }), 400
        
    force_id = data['force_id']
    session_id = data.get('session_id')
    
    try:
        # Stop monitoring and get results
        results = monitoring_service.stop_survey_monitoring(force_id, session_id)
        if results:
            return jsonify({
                'message': 'Survey emotion monitoring ended successfully',
                'emotion_data': results
            }), 200
        else:
            return jsonify({
                'error': 'Failed to end survey monitoring or no data collected'
            }), 500
    except Exception as e:
        logging.error(f"Error in end_survey_monitoring: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500

@image_bp.route('/model-status', methods=['GET'])
def get_model_status():
    """Get comprehensive face recognition model status"""
    try:
        status = face_recognition_service.get_comprehensive_model_status()
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@image_bp.route('/refresh-model', methods=['POST'])
def refresh_model():
    """Manually refresh the face recognition model"""
    try:
        from services.model_refresh_service import get_model_refresh_service
        refresh_service = get_model_refresh_service()
        result = refresh_service.force_refresh()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@image_bp.route('/validate-model', methods=['GET'])
def validate_model():
    """Validate model integrity and database consistency"""
    try:
        # Get integrity check
        integrity = face_recognition_service.model_manager.validate_model_integrity()
        
        # Get database consistency check
        db_consistency = face_recognition_service.validate_model_vs_database()
        
        return jsonify({
            'integrity_check': integrity,
            'database_consistency': db_consistency,
            'overall_valid': integrity.get('valid', False) and db_consistency.get('consistent', False)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# FACE MODEL MANAGEMENT ENDPOINTS
# ============================================================================

@image_bp.route('/soldier-training-status/<force_id>', methods=['GET'])
def get_soldier_training_status(force_id):
    """Get training status for a specific soldier"""
    try:
        # Get from trained_soldiers table
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT trained_at, model_version 
            FROM trained_soldiers 
            WHERE force_id = %s
        """, (force_id,))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result:
            # Count encodings in PKL
            model_manager = FaceModelManager()
            encodings, force_ids = model_manager.load_model_with_validation()
            encodings_count = force_ids.count(force_id) if force_ids else 0
            
            return jsonify({
                'force_id': force_id,
                'trained': True,
                'trained_at': result[0].isoformat() if result[0] else None,
                'model_version': result[1],
                'encodings_count': encodings_count
            })
        else:
            return jsonify({
                'force_id': force_id,
                'trained': False,
                'encodings_count': 0
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@image_bp.route('/delete-soldier/<force_id>', methods=['DELETE'])
def delete_soldier_face_data(force_id):
    """Delete soldier's face data from both PKL and database"""
    try:
        # First check if soldier exists in the system
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM users WHERE force_id = %s", (force_id,))
        user_exists = cursor.fetchone()
        
        if not user_exists:
            cursor.close()
            conn.close()
            return jsonify({'error': f'Soldier {force_id} not found in system'}), 404
        
        cursor.close()
        conn.close()
        
        # Delete from PKL file
        model_manager = FaceModelManager()
        
        # Load current model
        encodings, force_ids = model_manager.load_model_with_validation()
        removed_count = 0
        
        if encodings and force_ids:
            # Remove soldier's encodings
            new_encodings = []
            new_force_ids = []
            
            for i, fid in enumerate(force_ids):
                if fid == force_id:
                    removed_count += 1
                else:
                    new_encodings.append(encodings[i])
                    new_force_ids.append(fid)
            
            # Save updated model only if there were changes
            if removed_count > 0:
                if not model_manager.atomic_save_model(new_encodings, new_force_ids):
                    return jsonify({'error': 'Failed to update PKL model'}), 500
                
                # Force refresh the model cache after PKL update
                try:
                    from services.model_refresh_service import get_model_refresh_service
                    refresh_service = get_model_refresh_service()
                    refresh_service.force_refresh()
                    logging.info(f"Model cache refreshed after deleting soldier {force_id}")
                except Exception as e:
                    logging.warning(f"Failed to refresh model cache: {str(e)}")
                    # Don't fail the deletion if cache refresh fails
        
        # Complete system-wide deletion from ALL tables
        conn = get_connection()
        cursor = conn.cursor()
        
        # Get user_id first (needed for some tables)
        cursor.execute("SELECT user_id FROM users WHERE force_id = %s", (force_id,))
        user_result = cursor.fetchone()
        user_id = user_result[0] if user_result else None
        
        # Get all session_ids for this user first
        cursor.execute("SELECT session_id FROM weekly_sessions WHERE force_id = %s", (force_id,))
        session_ids = [row[0] for row in cursor.fetchall()]
        
        # Delete from all tables in the correct order (respecting foreign keys)
        
        # 1. Delete question_responses and mental_state_responses (via session_ids)
        if session_ids:
            session_placeholders = ','.join(['%s'] * len(session_ids))
            cursor.execute(f"DELETE FROM question_responses WHERE session_id IN ({session_placeholders})", session_ids)
            cursor.execute(f"DELETE FROM mental_state_responses WHERE session_id IN ({session_placeholders})", session_ids)
        
        # 2. Delete weekly_sessions
        cursor.execute("DELETE FROM weekly_sessions WHERE force_id = %s", (force_id,))
        
        # 3. Delete CCTV related data
        cursor.execute("DELETE FROM cctv_detections WHERE force_id = %s", (force_id,))
        
        # 4. Delete aggregated scores
        cursor.execute("DELETE FROM daily_depression_scores WHERE force_id = %s", (force_id,))
        cursor.execute("DELETE FROM weekly_aggregated_scores WHERE force_id = %s", (force_id,))
        
        # 5. Delete notifications (table might not exist, use try-catch)
        try:
            cursor.execute("DELETE FROM notifications WHERE force_id = %s", (force_id,))
        except:
            pass  # Table might not exist
        
        # 6. Delete user-specific settings (if user_id exists and tables exist)
        if user_id:
            try:
                cursor.execute("DELETE FROM notification_settings WHERE user_id = %s", (user_id,))
            except:
                pass  # Table might not exist
            try:
                cursor.execute("DELETE FROM user_preferences WHERE user_id = %s", (user_id,))
            except:
                pass  # Table might not exist
        
        # 7. Delete training data
        cursor.execute("DELETE FROM trained_soldiers WHERE force_id = %s", (force_id,))
        
        # 8. Finally delete the main user record
        cursor.execute("DELETE FROM users WHERE force_id = %s", (force_id,))
        
        # Note: audit_logs will automatically set user_id to NULL due to ON DELETE SET NULL
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Delete training images if they exist
        training_folder = os.path.join('storage', 'uploads', force_id)
        if os.path.exists(training_folder):
            shutil.rmtree(training_folder)
        
        return jsonify({
            'message': f'Soldier {force_id} completely deleted from system',
            'removed_encodings': removed_count,
            'deleted_from_database': True
        })
        
    except Exception as e:
        logging.error(f"Error in delete_soldier_face_data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@image_bp.route('/batch-delete-soldiers', methods=['DELETE'])
def batch_delete_soldiers():
    """Delete multiple soldiers' face data"""
    try:
        data = request.get_json()
        if not data or 'force_ids' not in data:
            return jsonify({'error': 'Missing force_ids in request'}), 400
        
        force_ids_to_delete = data['force_ids']
        if not isinstance(force_ids_to_delete, list):
            return jsonify({'error': 'force_ids must be a list'}), 400
        
        model_manager = FaceModelManager()
        
        # Load current model
        encodings, force_ids = model_manager.load_model_with_validation()
        if not encodings or not force_ids:
            return jsonify({'error': 'No model data found'}), 404
        
        # Remove soldiers' encodings
        new_encodings = []
        new_force_ids = []
        removed_counts = {}
        
        for i, fid in enumerate(force_ids):
            if fid in force_ids_to_delete:
                removed_counts[fid] = removed_counts.get(fid, 0) + 1
            else:
                new_encodings.append(encodings[i])
                new_force_ids.append(fid)
        
        if not removed_counts:
            return jsonify({'error': 'None of the specified soldiers found in model'}), 404
        
        # Save updated model
        if not model_manager.atomic_save_model(new_encodings, new_force_ids):
            return jsonify({'error': 'Failed to update model'}), 500
        
        # Force refresh the model cache after PKL update
        try:
            from services.model_refresh_service import get_model_refresh_service
            refresh_service = get_model_refresh_service()
            refresh_service.force_refresh()
            logging.info(f"Model cache refreshed after batch deleting soldiers {force_ids_to_delete}")
        except Exception as e:
            logging.warning(f"Failed to refresh model cache: {str(e)}")
            # Don't fail the deletion if cache refresh fails
        
        # Complete system-wide deletion from ALL tables
        conn = get_connection()
        cursor = conn.cursor()
        
        placeholders = ','.join(['%s'] * len(force_ids_to_delete))
        
        # Get user_ids and session_ids first (needed for some tables)
        cursor.execute(f"SELECT user_id, force_id FROM users WHERE force_id IN ({placeholders})", force_ids_to_delete)
        user_mappings = cursor.fetchall()
        user_ids = [row[0] for row in user_mappings] if user_mappings else []
        
        # Get all session_ids for these users
        cursor.execute(f"SELECT session_id FROM weekly_sessions WHERE force_id IN ({placeholders})", force_ids_to_delete)
        session_ids = [row[0] for row in cursor.fetchall()]
        
        # Delete from all tables in the correct order (respecting foreign keys)
        
        # 1. Delete question_responses and mental_state_responses (via session_ids)
        if session_ids:
            session_placeholders = ','.join(['%s'] * len(session_ids))
            cursor.execute(f"DELETE FROM question_responses WHERE session_id IN ({session_placeholders})", session_ids)
            cursor.execute(f"DELETE FROM mental_state_responses WHERE session_id IN ({session_placeholders})", session_ids)
        
        # 2. Delete weekly_sessions
        cursor.execute(f"DELETE FROM weekly_sessions WHERE force_id IN ({placeholders})", force_ids_to_delete)
        
        # 3. Delete CCTV related data
        cursor.execute(f"DELETE FROM cctv_detections WHERE force_id IN ({placeholders})", force_ids_to_delete)
        
        # 4. Delete aggregated scores
        cursor.execute(f"DELETE FROM daily_depression_scores WHERE force_id IN ({placeholders})", force_ids_to_delete)
        cursor.execute(f"DELETE FROM weekly_aggregated_scores WHERE force_id IN ({placeholders})", force_ids_to_delete)
        
        # 5. Delete notifications (table might not exist, use try-catch)
        try:
            cursor.execute(f"DELETE FROM notifications WHERE force_id IN ({placeholders})", force_ids_to_delete)
        except:
            pass  # Table might not exist
        
        # 6. Delete user-specific settings (if user_ids exist and tables exist)
        if user_ids:
            user_placeholders = ','.join(['%s'] * len(user_ids))
            try:
                cursor.execute(f"DELETE FROM notification_settings WHERE user_id IN ({user_placeholders})", user_ids)
            except:
                pass  # Table might not exist
            try:
                cursor.execute(f"DELETE FROM user_preferences WHERE user_id IN ({user_placeholders})", user_ids)
            except:
                pass  # Table might not exist
        
        # 7. Delete training data
        cursor.execute(f"DELETE FROM trained_soldiers WHERE force_id IN ({placeholders})", force_ids_to_delete)
        
        # 8. Finally delete the main user records
        cursor.execute(f"DELETE FROM users WHERE force_id IN ({placeholders})", force_ids_to_delete)
        
        # Note: audit_logs will automatically set user_id to NULL due to ON DELETE SET NULL
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Delete training images and profile pictures
        for force_id in force_ids_to_delete:
            # Delete training images folder
            training_folder = os.path.join('storage', 'uploads', force_id)
            if os.path.exists(training_folder):
                shutil.rmtree(training_folder)
        
        return jsonify({
            'message': f'{len(force_ids_to_delete)} soldiers deleted successfully',
            'deleted_soldiers': list(removed_counts.keys()),
            'removed_encodings': removed_counts,
            'remaining_soldiers': len(set(new_force_ids))
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@image_bp.route('/export-face-model', methods=['GET'])
def export_face_model():
    """Export the face recognition model file"""
    try:
        model_path = os.path.join('storage', 'models', 'face_recognition_model.pkl')
        if not os.path.exists(model_path):
            return jsonify({'error': 'Model file not found'}), 404
        
        return send_file(
            model_path,
            as_attachment=True,
            download_name=f'face_model_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pkl',
            mimetype='application/octet-stream'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500