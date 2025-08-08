from flask import Blueprint, jsonify, request
from services.enhanced_face_recognition_service import EnhancedFaceRecognitionService
from services.model_refresh_service import get_model_refresh_service
from services.enhanced_emotion_detection_service import EnhancedEmotionDetectionService
from db.connection import get_connection
import logging
from datetime import datetime, timedelta

monitor_bp = Blueprint('monitor', __name__)

@monitor_bp.route('/face-model/status', methods=['GET'])
def get_face_model_status():
    """Get comprehensive face model status"""
    try:
        service = EnhancedFaceRecognitionService()
        status = service.get_comprehensive_model_status()
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/face-model/refresh', methods=['POST'])
def refresh_face_model():
    """Manually refresh face recognition model"""
    try:
        refresh_service = get_model_refresh_service()
        result = refresh_service.force_refresh()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/face-model/auto-refresh/status', methods=['GET'])
def get_auto_refresh_status():
    """Get auto refresh service status"""
    try:
        refresh_service = get_model_refresh_service()
        status = refresh_service.get_model_status()
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/face-model/auto-refresh/configure', methods=['POST'])
def configure_auto_refresh():
    """Configure auto refresh settings"""
    try:
        data = request.get_json()
        refresh_service = get_model_refresh_service()
        
        if data.get('enabled') == False:
            refresh_service.stop_auto_refresh()
            return jsonify({'message': 'Auto refresh disabled'}), 200
        
        interval = data.get('interval', 300)
        refresh_service.stop_auto_refresh()
        refresh_service.start_auto_refresh(interval)
        
        return jsonify({
            'message': 'Auto refresh configured successfully',
            'interval': interval,
            'enabled': True
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/face-model/integrity', methods=['GET'])
def check_model_integrity():
    """Check model file integrity"""
    try:
        service = EnhancedFaceRecognitionService()
        integrity = service.model_manager.validate_model_integrity()
        return jsonify(integrity), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/face-model/database-sync', methods=['GET'])
def check_database_sync():
    """Check synchronization between PKL model and database"""
    try:
        service = EnhancedFaceRecognitionService()
        sync_status = service.validate_model_vs_database()
        return jsonify(sync_status), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/face-model/backup', methods=['POST'])
def create_model_backup():
    """Create a manual backup of the face model"""
    try:
        service = EnhancedFaceRecognitionService()
        data = request.get_json() or {}
        version = data.get('version')
        
        success = service.model_manager.create_backup(version)
        
        if success:
            return jsonify({'message': 'Backup created successfully'}), 200
        else:
            return jsonify({'error': 'Failed to create backup'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/face-model/soldiers', methods=['GET'])
def get_model_soldiers():
    """Get list of soldiers in the model"""
    try:
        refresh_service = get_model_refresh_service()
        status = refresh_service.get_model_status()
        
        return jsonify({
            'soldiers': status.get('force_ids', []),
            'count': status.get('soldier_count', 0),
            'model_version': status.get('model_version'),
            'last_refresh': status.get('last_refresh')
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/face-model/remove-soldier', methods=['POST'])
def remove_soldier_from_model():
    """Remove a soldier from the face recognition model"""
    try:
        data = request.get_json()
        force_id = data.get('force_id')
        
        if not force_id:
            return jsonify({'error': 'force_id is required'}), 400
        
        service = EnhancedFaceRecognitionService()
        success = service.model_manager.remove_soldiers([force_id])
        
        if success:
            # Also remove from trained_soldiers table
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM trained_soldiers WHERE force_id = %s", (force_id,))
            conn.commit()
            conn.close()
            
            return jsonify({'message': f'Soldier {force_id} removed successfully'}), 200
        else:
            return jsonify({'error': 'Failed to remove soldier'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/emotion-model/status', methods=['GET'])
def get_emotion_model_status():
    """Get emotion detection model status"""
    try:
        service = EnhancedEmotionDetectionService()
        status = service.get_model_status()
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/system/health', methods=['GET'])
def get_system_health():
    """Get overall system health status"""
    try:
        # Check face recognition system
        face_service = EnhancedFaceRecognitionService()
        face_status = face_service.get_comprehensive_model_status()
        
        # Check emotion detection system
        emotion_service = EnhancedEmotionDetectionService()
        emotion_status = emotion_service.get_model_status()
        
        # Check database connectivity
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            conn.close()
            db_status = True
        except:
            db_status = False
        
        # Overall health
        overall_healthy = (
            face_status.get('model_operational', False) and
            emotion_status.get('system_operational', False) and
            db_status
        )
        
        return jsonify({
            'overall_health': 'HEALTHY' if overall_healthy else 'ISSUES',
            'face_recognition': face_status,
            'emotion_detection': emotion_status,
            'database_connected': db_status,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/training/history', methods=['GET'])
def get_training_history():
    """Get training history from database"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get training history
        cursor.execute("""
            SELECT force_id, model_version, trained_at
            FROM trained_soldiers
            ORDER BY trained_at DESC
            LIMIT 100
        """)
        history = cursor.fetchall()
        
        # Get statistics
        cursor.execute("SELECT COUNT(*) as total_trained FROM trained_soldiers")
        total = cursor.fetchone()['total_trained']
        
        # Get recent training (last 7 days)
        cursor.execute("""
            SELECT COUNT(*) as recent_trained 
            FROM trained_soldiers 
            WHERE trained_at >= %s
        """, (datetime.now() - timedelta(days=7),))
        recent = cursor.fetchone()['recent_trained']
        
        conn.close()
        
        return jsonify({
            'training_history': history,
            'statistics': {
                'total_trained': total,
                'recent_trained': recent,
                'last_training': history[0]['trained_at'].isoformat() if history else None
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@monitor_bp.route('/logs/recent', methods=['GET'])
def get_recent_logs():
    """Get recent log entries (last 50 lines from each log file)"""
    try:
        logs = {}
        log_files = [
            'face_model_manager.log',
            'model_refresh_service.log',
            'enhanced_emotion_detection.log',
            'enhanced_face_recognition_training.log'
        ]
        
        for log_file in log_files:
            try:
                with open(log_file, 'r') as f:
                    lines = f.readlines()
                    # Get last 50 lines
                    logs[log_file] = lines[-50:] if len(lines) > 50 else lines
            except FileNotFoundError:
                logs[log_file] = ['Log file not found']
            except Exception as e:
                logs[log_file] = [f'Error reading log: {str(e)}']
        
        return jsonify({
            'logs': logs,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
