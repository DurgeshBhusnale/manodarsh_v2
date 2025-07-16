from flask import Blueprint, jsonify, request
import logging
from services.image_collection import ImageCollectionService
from services.face_recognition_service import FaceRecognitionService
from services.emotion_detection_service import EmotionDetectionService
from services.cctv_monitoring_service import CCTVMonitoringService
from datetime import datetime

image_bp = Blueprint('image', __name__)
image_collection_service = ImageCollectionService()
face_recognition_service = FaceRecognitionService()
monitoring_service = CCTVMonitoringService()

@image_bp.route('/collect', methods=['POST'])
def collect_images():
    """Handle image collection for a soldier"""
    data = request.get_json()
    
    if not data or 'force_id' not in data:
        return jsonify({
            'error': 'Missing required field: force_id'
        }), 400
        
    force_id = data['force_id']
    
    # Validate force_id format
    if not force_id.isdigit() or len(force_id) != 9:
        return jsonify({
            'error': 'Invalid force ID format. Must be 9 digits.'
        }), 400
    
    try:
        folder_path = image_collection_service.collect_images(force_id)
        return jsonify({
            'message': 'Image collection successful',
            'folder_path': folder_path
        }), 200
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@image_bp.route('/train', methods=['POST'])
def train_model():
    """Train the face recognition model on new soldiers"""
    try:
        result = face_recognition_service.train_model()
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@image_bp.route('/start-monitoring', methods=['POST'])
def start_monitoring():
    """Start CCTV emotion monitoring for a day"""
    data = request.get_json()
    if not data or 'date' not in data:
        return jsonify({
            'error': 'Missing required field: date'
        }), 400
        
    date = data['date']
    try:
        if monitoring_service.start_monitoring(date):
            return jsonify({
                'message': 'Monitoring started successfully'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to start monitoring: Could not initialize camera or database'
            }), 500
    except Exception as e:
        logging.error(f"Error in start_monitoring: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500

@image_bp.route('/end-monitoring', methods=['POST'])
def end_monitoring():
    """End CCTV emotion monitoring for a day"""
    data = request.get_json()
    if not data or 'date' not in data:
        return jsonify({
            'error': 'Missing required field: date'
        }), 400
        
    date = data['date']
    try:
        # Stop monitoring
        if monitoring_service.stop_monitoring():
            # Calculate daily scores
            if monitoring_service.calculate_daily_scores(date):
                return jsonify({
                    'message': 'Monitoring ended and scores calculated successfully'
                }), 200
            else:
                return jsonify({
                    'error': 'Failed to calculate daily scores'
                }), 500
        else:
            return jsonify({
                'error': 'Failed to stop monitoring'
            }), 500
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@image_bp.route('/process-frame', methods=['POST'])
def process_frame():
    """Process a single frame from CCTV feed"""
    try:
        result = monitoring_service.process_frame()
        if result:
            return jsonify(result), 200
        else:
            return jsonify({
                'message': 'No face detected or not recognized'
            }), 200
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

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
        # Start monitoring for this specific soldier
        if monitoring_service.start_survey_monitoring(force_id):
            return jsonify({
                'message': 'Survey emotion monitoring started successfully',
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