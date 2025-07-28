from flask import Blueprint, request, jsonify
from db.connection import get_connection
from services.sentiment_analysis_service import analyze_sentiment, calculate_average_score
from config.settings import Settings
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Initialize settings
settings = Settings()

def get_mental_state_analysis(score):
    """Determine mental state based on combined score using configurable thresholds"""
    
    if score <= settings.RISK_THRESHOLDS['LOW']:
        return {
            'state': 'EXCELLENT MENTAL HEALTH',
            'level': 'GREEN',
            'description': 'Positive emotional state, no concerns',
            'recommendation': 'Continue normal duties'
        }
    elif score <= settings.RISK_THRESHOLDS['MEDIUM']:
        return {
            'state': 'GOOD MENTAL HEALTH',
            'level': 'GREEN',
            'description': 'Stable emotional state with minor stress indicators',
            'recommendation': 'Continue normal duties, light monitoring'
        }
    elif score <= settings.RISK_THRESHOLDS['HIGH']:
        return {
            'state': 'MILD CONCERN',
            'level': 'YELLOW',
            'description': 'Moderate stress/negative mood detected',
            'recommendation': 'Weekly check-ins, monitor closely'
        }
    elif score <= settings.RISK_THRESHOLDS['CRITICAL']:
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

@survey_bp.route('/submit', methods=['POST'])
def submit_survey():
    db = get_connection()
    cursor = db.cursor()

    try:
        data = request.json
        questionnaire_id = data['questionnaire_id']
        responses = data['responses']
        
        # REQUIRE soldier credentials for survey submission
        force_id = data.get('force_id')
        password = data.get('password')
        
        if not force_id or not password:
            return jsonify({
                "error": "Soldier force_id and password are required for survey submission"
            }), 400
        
        # Verify soldier credentials
        from services.auth_service import AuthService
        auth_service = AuthService()
        user = auth_service.verify_login(force_id, password)
        
        if not user or user['role'] != 'soldier':
            return jsonify({
                "error": "Invalid soldier credentials"
            }), 401

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
            from services.cctv_monitoring_service import CCTVMonitoringService
            monitoring_service = CCTVMonitoringService()
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
            
            # Calculate WEIGHTED combined depression score using configurable weights
            combined_depression_score = None
            if nlp_depression_score is not None and question_emotion_score >= 0:
                # Both scores available - use weighted combination
                combined_depression_score = settings.calculate_combined_score(nlp_depression_score, question_emotion_score)
                logger.info(f"Question {question_id}: Weighted Combined = ({nlp_depression_score:.2f} * {settings.NLP_WEIGHT}) + ({question_emotion_score:.2f} * {settings.EMOTION_WEIGHT}) = {combined_depression_score:.3f}")
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
        
        # Calculate and update average NLP score in the session
        avg_nlp_score = 0
        if nlp_scores:
            avg_nlp_score = calculate_average_score(nlp_scores)
            logger.info(f"Session {session_id} - Average NLP Depression Score: {avg_nlp_score:.2f}")
        
        # Calculate WEIGHTED final combined score (70% NLP + 30% Image)
        final_combined_score = 0
        if avg_nlp_score > 0 and image_avg_score > 0:
            # Both scores available - use weighted combination
            final_combined_score = (avg_nlp_score * 0.7) + (image_avg_score * 0.3)
            logger.info(f"Session {session_id} - Weighted Combined Score: ({avg_nlp_score:.2f} * 0.7) + ({image_avg_score:.2f} * 0.3) = {final_combined_score:.3f}")
        elif avg_nlp_score > 0:
            # Only NLP score available
            final_combined_score = avg_nlp_score
            logger.info(f"Session {session_id} - Using NLP score only: {final_combined_score:.2f}")
        elif image_avg_score > 0:
            # Only emotion score available
            final_combined_score = image_avg_score
            logger.info(f"Session {session_id} - Using emotion score only: {final_combined_score:.2f}")
        
        # Get mental state analysis
        mental_state = get_mental_state_analysis(final_combined_score)
        
        # Comprehensive console logging with mental state analysis
        logger.info("="*80)
        logger.info(f"🎯 MENTAL HEALTH ASSESSMENT COMPLETE - Session {session_id}")
        logger.info("="*80)
        logger.info(f"👤 Soldier: {force_id}")
        logger.info(f"📊 SCORES BREAKDOWN:")
        logger.info(f"   📝 NLP Average Score (70%):     {avg_nlp_score:.3f}")
        logger.info(f"   📷 Emotion Average Score (30%): {image_avg_score:.3f}")
        logger.info(f"   🎯 FINAL WEIGHTED COMBINED:     {final_combined_score:.3f}")
        logger.info(f"")
        logger.info(f"🧠 MENTAL STATE ANALYSIS:")
        logger.info(f"   State:          {mental_state['state']}")
        logger.info(f"   Alert Level:    {mental_state['level']}")
        logger.info(f"   Description:    {mental_state['description']}")
        logger.info(f"   Recommendation: {mental_state['recommendation']}")
        logger.info(f"")
        if emotion_results:
            logger.info(f"📹 EMOTION MONITORING DETAILS:")
            logger.info(f"   Total Detections: {emotion_results.get('detection_count', 0)}")
            logger.info(f"   Dominant Emotion: {emotion_results.get('dominant_emotion', 'Unknown')}")
        logger.info("="*80)
            
        # Update the weekly session with the calculated average scores
        cursor.execute("""
            UPDATE weekly_sessions
            SET nlp_avg_score = %s, 
                image_avg_score = %s,
                combined_avg_score = %s
            WHERE session_id = %s
        """, (avg_nlp_score if avg_nlp_score > 0 else None, 
              image_avg_score,  # Always store image score (even if 0)
              final_combined_score, 
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
            }
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()
