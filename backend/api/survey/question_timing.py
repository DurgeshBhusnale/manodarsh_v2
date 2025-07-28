"""
Question timing tracking for emotion monitoring per question
"""
from flask import Blueprint, request, jsonify
from services.cctv_monitoring_service import CCTVMonitoringService
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

question_timing_bp = Blueprint('question_timing', __name__)

@question_timing_bp.route('/question-answered', methods=['POST'])
def track_question_answered():
    """Track when a question is answered to correlate with emotion data"""
    try:
        data = request.json
        question_id = data.get('question_id')
        force_id = data.get('force_id')
        
        if not question_id or not force_id:
            return jsonify({"error": "question_id and force_id are required"}), 400
        
        # Get current emotion data from monitoring service
        monitoring_service = CCTVMonitoringService()
        
        # For now, we'll track this in the survey detections with question metadata
        if hasattr(monitoring_service, 'survey_detections') and hasattr(monitoring_service, 'survey_monitoring'):
            if monitoring_service.survey_monitoring:
                # Add a marker in the detections to indicate this question was answered
                marker = {
                    'timestamp': datetime.now().isoformat(),
                    'type': 'question_marker',
                    'question_id': question_id,
                    'force_id': force_id
                }
                monitoring_service.survey_detections.append(marker)
                logger.info(f"Marked question {question_id} answered for soldier {force_id}")
                
                return jsonify({"message": "Question timing tracked successfully"}), 200
        
        return jsonify({"message": "No active monitoring session"}), 200
        
    except Exception as e:
        logger.error(f"Error tracking question timing: {e}")
        return jsonify({"error": str(e)}), 500
