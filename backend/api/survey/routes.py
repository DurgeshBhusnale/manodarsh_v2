from flask import Blueprint, request, jsonify
from db.connection import get_connection
from services.sentiment_analysis_service import analyze_sentiment, calculate_average_score, calculate_peak_weighted_nlp_average
from services.cctv_monitoring_service import CCTVMonitoringService
from config.settings import Settings
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Initialize settings
settings = Settings()

def get_dynamic_settings():
    """Get current settings from database with fallback to config defaults"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get NLP and emotion weights from database
        cursor.execute("""
            SELECT setting_name, setting_value 
            FROM system_settings 
            WHERE setting_name IN ('nlp_weight', 'emotion_weight')
        """)
        
        db_settings = cursor.fetchall()
        setting_values = {}
        
        for setting in db_settings:
            setting_values[setting['setting_name']] = float(setting['setting_value'])
        
        # Use database values if available, otherwise use config defaults
        nlp_weight = setting_values.get('nlp_weight', settings.NLP_WEIGHT)
        emotion_weight = setting_values.get('emotion_weight', settings.EMOTION_WEIGHT)
        
        conn.close()
        logger.info(f"Dynamic settings loaded - NLP Weight: {nlp_weight}, Emotion Weight: {emotion_weight}")
        return nlp_weight, emotion_weight
        
    except Exception as e:
        logger.error(f"Error retrieving dynamic settings: {e}")
        # Fallback to config defaults
        logger.info(f"Using config defaults - NLP Weight: {settings.NLP_WEIGHT}, Emotion Weight: {settings.EMOTION_WEIGHT}")
        return settings.NLP_WEIGHT, settings.EMOTION_WEIGHT

def calculate_dynamic_combined_score(nlp_score, emotion_score):
    """Calculate weighted combined depression score using database settings"""
    nlp_weight, emotion_weight = get_dynamic_settings()
    
    if nlp_score is not None and emotion_score is not None:
        return (nlp_score * nlp_weight) + (emotion_score * emotion_weight)
    elif nlp_score is not None:
        return nlp_score
    elif emotion_score is not None:
        return emotion_score
    else:
        return 0.0

def get_dynamic_risk_thresholds():
    """Get current risk thresholds from database with fallback to config defaults"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get risk thresholds from database
        cursor.execute("""
            SELECT setting_name, setting_value 
            FROM system_settings 
            WHERE setting_name IN ('risk_low_threshold', 'risk_medium_threshold', 'risk_high_threshold', 'risk_critical_threshold')
        """)
        
        db_settings = cursor.fetchall()
        setting_values = {}
        
        for setting in db_settings:
            setting_values[setting['setting_name']] = float(setting['setting_value'])
        
        # Use database values if available, otherwise use config defaults
        risk_thresholds = {
            'LOW': setting_values.get('risk_low_threshold', settings.RISK_THRESHOLDS['LOW']),
            'MEDIUM': setting_values.get('risk_medium_threshold', settings.RISK_THRESHOLDS['MEDIUM']),
            'HIGH': setting_values.get('risk_high_threshold', settings.RISK_THRESHOLDS['HIGH']),
            'CRITICAL': setting_values.get('risk_critical_threshold', settings.RISK_THRESHOLDS['CRITICAL'])
        }
        
        conn.close()
        return risk_thresholds
        
    except Exception as e:
        logger.error(f"Error retrieving dynamic risk thresholds: {e}")
        # Fallback to config defaults
        return settings.RISK_THRESHOLDS

def get_mental_state_analysis(score):
    """Determine mental state based on combined score using dynamic thresholds from database"""
    
    # Get current risk thresholds from database
    risk_thresholds = get_dynamic_risk_thresholds()
    
    if score <= risk_thresholds['LOW']:
        return {
            'state': 'EXCELLENT MENTAL HEALTH',
            'level': 'GREEN',
            'description': 'Positive emotional state, no concerns',
            'recommendation': 'Continue normal duties'
        }
    elif score <= risk_thresholds['MEDIUM']:
        return {
            'state': 'GOOD MENTAL HEALTH',
            'level': 'GREEN',
            'description': 'Stable emotional state with minor stress indicators',
            'recommendation': 'Continue normal duties, light monitoring'
        }
    elif score <= risk_thresholds['HIGH']:
        return {
            'state': 'MILD CONCERN',
            'level': 'YELLOW',
            'description': 'Moderate stress/negative mood detected',
            'recommendation': 'Weekly check-ins, monitor closely'
        }
    elif score <= risk_thresholds['CRITICAL']:
        return {
            'state': 'MODERATE DEPRESSION',
            'level': 'ORANGE',
            'description': 'Significant negative emotional indicators',
            'recommendation': 'Counseling recommended, bi-weekly assessments'
        }
    else:
        return {
            'state': 'CRITICAL MENTAL HEALTH',
            'level': 'CRITICAL',
            'description': 'Severe depression/distress indicators',
            'recommendation': 'URGENT: Immediate professional intervention required'
        }

survey_bp = Blueprint('survey', __name__)

@survey_bp.route('/survey-initialization', methods=['GET'])
def get_survey_initialization_data():
    """Optimized endpoint to get all survey initialization data in a single request"""
    db = get_connection()
    cursor = db.cursor()

    try:
        # OPTIMIZATION: Batch multiple queries in single connection
        
        # Query 1: Get active questionnaire
        cursor.execute("""
            SELECT questionnaire_id, title, description, total_questions
            FROM questionnaires
            WHERE status = 'Active'
            LIMIT 1
        """)
        questionnaire = cursor.fetchone()

        if not questionnaire:
            return jsonify({"error": "No active questionnaire found"}), 404

        questionnaire_id, title, description, total_questions = questionnaire

        # Query 2: Get questions for this questionnaire
        cursor.execute("""
            SELECT question_id, question_text, question_text_hindi
            FROM questions
            WHERE questionnaire_id = %s
            ORDER BY created_at ASC
        """, (questionnaire_id,))
        
        questions = [
            {
                "id": row[0],
                "question_text": row[1],
                "question_text_hindi": row[2]
            }
            for row in cursor.fetchall()
        ]

        # Query 3: Get webcam settings (commonly needed for survey)
        cursor.execute("""
            SELECT setting_name, setting_value 
            FROM system_settings 
            WHERE setting_name IN ('webcam_enabled', 'detection_interval', 'camera_width', 'camera_height')
        """)
        
        settings = {}
        for setting_name, setting_value in cursor.fetchall():
            if setting_name == 'webcam_enabled':
                settings[setting_name] = setting_value.lower() == 'true'
            elif setting_name in ['detection_interval', 'camera_width', 'camera_height']:
                settings[setting_name] = int(setting_value)
            else:
                settings[setting_name] = setting_value

        # Default settings if not found
        settings.setdefault('webcam_enabled', True)
        settings.setdefault('detection_interval', 30)
        settings.setdefault('camera_width', 640)
        settings.setdefault('camera_height', 480)

        return jsonify({
            "questionnaire": {
                "id": questionnaire_id,
                "title": title,
                "description": description,
                "total_questions": total_questions
            },
            "questions": questions,
            "settings": settings,
            "initialization_optimized": True
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@survey_bp.route('/active-questionnaire', methods=['GET'])
def get_active_questionnaire():
    db = get_connection()
    cursor = db.cursor()

    try:
        # Get the active questionnaire
        cursor.execute("""
            SELECT questionnaire_id, title, description, total_questions
            FROM questionnaires
            WHERE status = 'Active'
            LIMIT 1
        """)
        questionnaire = cursor.fetchone()

        if not questionnaire:
            return jsonify({"error": "No active questionnaire found"}), 404

        questionnaire_id, title, description, total_questions = questionnaire

        # Get the questions for this questionnaire (include Hindi text)
        cursor.execute("""
            SELECT question_id, question_text, question_text_hindi
            FROM questions
            WHERE questionnaire_id = %s
            ORDER BY created_at ASC
        """, (questionnaire_id,))
        
        questions = [
            {
                "id": row[0],
                "question_text": row[1],
                "question_text_hindi": row[2]
            }
            for row in cursor.fetchall()
        ]

        return jsonify({
            "questionnaire": {
                "id": questionnaire_id,
                "title": title,
                "description": description,
                "total_questions": total_questions
            },
            "questions": questions
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@survey_bp.route('/start-survey-monitoring', methods=['POST'])
def start_survey_monitoring():
    """Start enhanced emotion monitoring for survey session"""
    try:
        data = request.json
        force_id = data.get('force_id')
        
        if not force_id:
            return jsonify({"error": "force_id is required"}), 400
            
        logger.info(f"Starting enhanced survey monitoring for soldier: {force_id}")
        
        # Initialize monitoring service - USE SINGLETON to prevent camera conflicts
        from services.cctv_monitoring_service import get_monitoring_service_instance
        monitoring_service = get_monitoring_service_instance()
        
        # Configure for survey mode with optimal camera resolution
        monitoring_service.configure_survey_mode(force_id)
        
        # Start survey monitoring
        success = monitoring_service.start_survey_monitoring(force_id)
        
        if success:
            logger.info(f"Survey monitoring started successfully for {force_id}")
            return jsonify({
                "success": True,
                "message": "Survey monitoring started with optimal camera resolution",
                "force_id": force_id
            }), 200
        else:
            logger.error(f"Failed to start survey monitoring for {force_id}")
            return jsonify({
                "success": False,
                "error": "Failed to start survey monitoring"
            }), 500
            
    except Exception as e:
        logger.error(f"Error starting survey monitoring: {str(e)}")
        # Try to cleanup in case of error
        try:
            from services.cctv_monitoring_service import get_monitoring_service_instance
            monitoring_service = get_monitoring_service_instance()
            monitoring_service.force_camera_cleanup()
        except:
            pass
        return jsonify({
            "success": False,
            "error": f"Error starting survey monitoring: {str(e)}"
        }), 500

@survey_bp.route('/force-camera-cleanup', methods=['POST'])
def force_camera_cleanup():
    """Force cleanup camera resources if they get stuck"""
    try:
        from services.cctv_monitoring_service import get_monitoring_service_instance
        monitoring_service = get_monitoring_service_instance()
        
        success = monitoring_service.force_camera_cleanup()
        
        if success:
            logger.info("Force camera cleanup successful")
            return jsonify({
                "success": True,
                "message": "Camera resources forcefully cleaned up"
            }), 200
        else:
            logger.warning("Force camera cleanup failed")
            return jsonify({
                "success": False,
                "message": "Camera cleanup failed"
            }), 500
            
    except Exception as e:
        logger.error(f"Error during force camera cleanup: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Error during cleanup: {str(e)}"
        }), 500

@survey_bp.route('/submit', methods=['POST'])
def submit_survey():
    db = get_connection()
    cursor = db.cursor()

    try:
        data = request.json
        questionnaire_id = data['questionnaire_id']
        responses = data['responses']
        
        # AUTHENTICATION ALREADY DONE AT LOGIN - Just verify required fields
        force_id = data.get('force_id')
        
        if not force_id:
            return jsonify({
                "error": "Soldier force_id is required for survey submission"
            }), 400
        
        # REMOVED: Credential verification (already done at login)
        # Additional validation: Verify soldier exists in database
        cursor.execute("SELECT user_type FROM users WHERE force_id = %s", (force_id,))
        user_result = cursor.fetchone()
        
        if not user_result or user_result[0] != 'soldier':
            return jsonify({
                "error": "Invalid soldier ID - soldier not found in system"
            }), 400

        logger.info(f"Survey submission for authenticated soldier: {force_id}")

        # Extract mental state data
        mental_state_rating = data.get('mental_state_rating')
        mental_state_emoji = data.get('mental_state_emoji')
        mental_state_text_en = data.get('mental_state_text_en')
        mental_state_text_hi = data.get('mental_state_text_hi')

        # Create a new weekly session
        cursor.execute("""
            INSERT INTO weekly_sessions 
            (force_id, questionnaire_id, year, start_timestamp, completion_timestamp, status, nlp_avg_score, image_avg_score, combined_avg_score)
            VALUES (%s, %s, YEAR(NOW()), NOW(), NOW(), 'completed', %s, %s, %s)
        """, (force_id, questionnaire_id, 0, 0, 0))
        session_id = cursor.lastrowid

        # IMPORTANT: Get emotion monitoring data BEFORE processing responses
        image_avg_score = 0
        emotion_results = None
        try:
            from services.cctv_monitoring_service import get_monitoring_service_instance
            monitoring_service = get_monitoring_service_instance()
            emotion_results = monitoring_service.stop_survey_monitoring(force_id, session_id)
            
            logger.info(f"Emotion monitoring results: {emotion_results}")
            
            if emotion_results and 'avg_depression_score' in emotion_results:
                image_avg_score = emotion_results['avg_depression_score']
                logger.info(f"Retrieved emotion monitoring data: avg_score={image_avg_score:.2f}")
            elif emotion_results and 'detection_count' in emotion_results:
                logger.warning(f"No avg_depression_score in results. Detection count: {emotion_results['detection_count']}")
            else:
                logger.warning("No emotion data retrieved from monitoring service")
                
        except Exception as e:
            logger.error(f"Error getting emotion data: {e}")
            # Continue without emotion data

        # Process responses and analyze sentiment
        nlp_scores = []
        
        # SIMPLE APPROACH: Use the overall average emotion score for all questions
        # This ensures no NULL values in image_depression_score
        logger.info(f"Using emotion monitoring average score: {image_avg_score:.2f} for all questions")
        
        # Insert responses and analyze sentiment
        for response in responses:
            answer_text = response['answer_text']
            question_id = response['question_id']
            
            # Calculate depression score using sentiment analysis
            nlp_depression_score = None
            if answer_text and answer_text.strip():
                depression_score, sentiment_label = analyze_sentiment(answer_text)
                nlp_depression_score = depression_score
                nlp_scores.append(depression_score)
                logger.info(f"Question {question_id} - Sentiment: {sentiment_label}, Score: {depression_score:.2f}")
            
            # Use the overall emotion monitoring average for this question
            # Store the actual score even if it's 0 (no more NULL values!)
            question_emotion_score = image_avg_score
            
            # Calculate WEIGHTED combined depression score using dynamic database settings
            combined_depression_score = None
            if nlp_depression_score is not None and question_emotion_score >= 0:
                # Both scores available - use weighted combination
                nlp_weight, emotion_weight = get_dynamic_settings()
                combined_depression_score = calculate_dynamic_combined_score(nlp_depression_score, question_emotion_score)
                logger.info(f"Question {question_id}: Weighted Combined = ({nlp_depression_score:.2f} * {nlp_weight}) + ({question_emotion_score:.2f} * {emotion_weight}) = {combined_depression_score:.3f}")
            elif nlp_depression_score is not None:
                # Only NLP score available
                combined_depression_score = nlp_depression_score
                logger.info(f"Question {question_id}: Using NLP score only = {combined_depression_score:.2f}")
            elif question_emotion_score >= 0:
                # Only emotion score available
                combined_depression_score = question_emotion_score
                logger.info(f"Question {question_id}: Using emotion score only = {combined_depression_score:.2f}")
            else:
                combined_depression_score = 0
                logger.info(f"Question {question_id}: No scores available, defaulting to 0")
            
            logger.info(f"Question {question_id}: NLP={nlp_depression_score}, Emotion={question_emotion_score:.2f}, Weighted Combined={combined_depression_score:.3f}")
            
            # Insert response with sentiment score AND emotion monitoring score
            cursor.execute("""
                INSERT INTO question_responses 
                (session_id, question_id, answer_text, nlp_depression_score, image_depression_score, combined_depression_score)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                session_id,
                question_id,
                answer_text,
                nlp_depression_score,
                question_emotion_score,  # Always store the emotion score (even if 0, no more NULL!)
                combined_depression_score
            ))
        
        # Calculate and update peak-weighted average NLP score in the session
        avg_nlp_score = 0
        if nlp_scores:
            avg_nlp_score = calculate_peak_weighted_nlp_average(nlp_scores)
            logger.info(f"Session {session_id} - Peak-Weighted NLP Depression Score: {avg_nlp_score:.2f}")
            logger.info(f"NLP Score Distribution: min={min(nlp_scores):.2f}, max={max(nlp_scores):.2f}, count={len(nlp_scores)}")
        
        # Calculate WEIGHTED final combined score using dynamic settings
        nlp_weight, emotion_weight = get_dynamic_settings()
        final_combined_score = 0
        if avg_nlp_score > 0 and image_avg_score > 0:
            # Both scores available - use weighted combination
            final_combined_score = (avg_nlp_score * nlp_weight) + (image_avg_score * emotion_weight)
            logger.info(f"Session {session_id} - Weighted Combined Score: Peak-weighted NLP({avg_nlp_score:.2f} * {nlp_weight}) + Peak-weighted Emotion({image_avg_score:.2f} * {emotion_weight}) = {final_combined_score:.3f}")
        elif avg_nlp_score > 0:
            # Only NLP score available
            final_combined_score = avg_nlp_score
            logger.info(f"Session {session_id} - Using peak-weighted NLP score only: {final_combined_score:.2f}")
        elif image_avg_score > 0:
            # Only emotion score available
            final_combined_score = image_avg_score
            logger.info(f"Session {session_id} - Using emotion score only: {final_combined_score:.2f}")
        
        # Get mental state analysis
        mental_state = get_mental_state_analysis(final_combined_score)
        
        # Comprehensive console logging with mental state analysis
        logger.info("="*80)
        logger.info(f"[ASSESSMENT] MENTAL HEALTH ASSESSMENT COMPLETE - Session {session_id}")
        logger.info("="*80)
        logger.info(f"[SOLDIER] {force_id}")
        logger.info(f"[SCORES] BREAKDOWN:")
        logger.info(f"   [NLP] Peak-Weighted Score (70%):     {avg_nlp_score:.3f}")
        logger.info(f"   [EMOTION] Peak-Weighted Score (30%): {image_avg_score:.3f}")
        logger.info(f"   [FINAL] WEIGHTED COMBINED:           {final_combined_score:.3f}")
        logger.info(f"")
        logger.info(f"[ENHANCED_SCORING] PEAK-WEIGHTED AVERAGING ACTIVE:")
        logger.info(f"   NLP: High-risk responses (>0.65) amplified for suicide/crisis detection")
        logger.info(f"   Emotion: Non-neutral emotions amplified for military personnel sensitivity")
        logger.info(f"")
        logger.info(f"[MENTAL_STATE] ANALYSIS:")
        logger.info(f"   State:          {mental_state['state']}")
        logger.info(f"   Alert Level:    {mental_state['level']}")
        logger.info(f"   Description:    {mental_state['description']}")
        logger.info(f"   Recommendation: {mental_state['recommendation']}")
        logger.info(f"")
        if emotion_results:
            logger.info(f"[EMOTION_MONITORING] DETAILS:")
            logger.info(f"   Total Detections: {emotion_results.get('detection_count', 0)}")
            logger.info(f"   Dominant Emotion: {emotion_results.get('dominant_emotion', 'Unknown')}")
        logger.info("="*80)
        
        # Save mental state response if provided
        if mental_state_rating is not None:
            try:
                cursor.execute("""
                    INSERT INTO mental_state_responses 
                    (session_id, mental_state_rating, mental_state_emoji, mental_state_text_en, mental_state_text_hi)
                    VALUES (%s, %s, %s, %s, %s)
                """, (session_id, mental_state_rating, mental_state_emoji, mental_state_text_en, mental_state_text_hi))
                logger.info(f"[MENTAL_STATE] Mental state saved: {mental_state_text_en} (Rating: {mental_state_rating}/7)")
            except Exception as e:
                logger.error(f"Error saving mental state: {e}")
                # Don't fail the entire survey if mental state fails to save
            
        # Update the weekly session with the calculated average scores AND mental state
        cursor.execute("""
            UPDATE weekly_sessions
            SET nlp_avg_score = %s, 
                image_avg_score = %s,
                combined_avg_score = %s,
                mental_state_score = %s
            WHERE session_id = %s
        """, (avg_nlp_score if avg_nlp_score > 0 else None, 
              image_avg_score,  # Always store image score (even if 0)
              final_combined_score, 
              mental_state_rating,  # Add mental state rating to weekly_sessions table
              session_id))
        
        db.commit()
        return jsonify({
            "message": "Survey submitted successfully with weighted sentiment analysis and emotion monitoring",
            "session_id": session_id,
            "scores": {
                "nlp_avg_score": avg_nlp_score if avg_nlp_score > 0 else 0,
                "emotion_avg_score": image_avg_score,
                "combined_avg_score": final_combined_score,
                "weighting": "NLP: 70%, Emotion: 30%"
            },
            "mental_state": {
                "state": mental_state['state'],
                "level": mental_state['level'],
                "description": mental_state['description'],
                "recommendation": mental_state['recommendation']
            },
            "emotion_details": {
                "detection_count": emotion_results.get('detection_count', 0) if emotion_results else 0,
                "dominant_emotion": emotion_results.get('dominant_emotion', 'Unknown') if emotion_results else 'Unknown'
            },
            "mental_state": {
                "rating": mental_state_rating,
                "emoji": mental_state_emoji,
                "text_en": mental_state_text_en,
                "text_hi": mental_state_text_hi
            } if mental_state_rating is not None else None
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@survey_bp.route('/admin/questionnaires/<int:questionnaire_id>/activate', methods=['POST'])
def activate_questionnaire(questionnaire_id):
    db = get_connection()
    cursor = db.cursor()
    try:
        # Set all questionnaires to inactive
        cursor.execute("UPDATE questionnaires SET status = 'Inactive'")
        # Set the selected questionnaire to active
        cursor.execute("UPDATE questionnaires SET status = 'Active' WHERE questionnaire_id = %s", (questionnaire_id,))
        db.commit()
        return jsonify({"success": True, "activated_id": questionnaire_id}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()
