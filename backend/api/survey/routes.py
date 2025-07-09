from flask import Blueprint, request, jsonify
from db.connection import get_connection
from services.sentiment_analysis_service import analyze_sentiment, calculate_average_score
import logging

# Set up logging
logger = logging.getLogger(__name__)

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
        # Use a dummy force_id for now (replace with real authentication later)
        # Try to get force_id from data, or fallback to dummy for now
        force_id = data.get('force_id')
        if not force_id:
            force_id = '100000001'

        # Create a new weekly session
        cursor.execute("""
            INSERT INTO weekly_sessions 
            (force_id, questionnaire_id, year, start_timestamp, completion_timestamp, status, nlp_avg_score, image_avg_score, combined_avg_score)
            VALUES (%s, %s, YEAR(NOW()), NOW(), NOW(), 'completed', %s, %s, %s)
        """, (force_id, questionnaire_id, 0, 0, 0))
        session_id = cursor.lastrowid

        # Process responses and analyze sentiment
        nlp_scores = []
        
        # Insert responses and analyze sentiment
        for response in responses:
            answer_text = response['answer_text']
            
            # Calculate depression score using sentiment analysis
            nlp_depression_score = None
            if answer_text and answer_text.strip():
                depression_score, sentiment_label = analyze_sentiment(answer_text)
                nlp_depression_score = depression_score
                nlp_scores.append(depression_score)
                logger.info(f"Question {response['question_id']} - Sentiment: {sentiment_label}, Score: {depression_score:.2f}")
            
            # Insert response with sentiment score
            cursor.execute("""
                INSERT INTO question_responses 
                (session_id, question_id, answer_text, nlp_depression_score, image_depression_score, combined_depression_score)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                session_id,
                response['question_id'],
                answer_text,
                nlp_depression_score,
                None,  # image_depression_score (to be implemented later)
                nlp_depression_score  # For now, combined score is same as NLP score
            ))
        
        # Calculate and update average NLP score in the session
        avg_nlp_score = 0
        if nlp_scores:
            avg_nlp_score = calculate_average_score(nlp_scores)
            logger.info(f"Session {session_id} - Average Depression Score: {avg_nlp_score:.2f}")
            
            # Update the weekly session with the calculated average scores
            cursor.execute("""
                UPDATE weekly_sessions
                SET nlp_avg_score = %s, combined_avg_score = %s
                WHERE session_id = %s
            """, (avg_nlp_score, avg_nlp_score, session_id))  # For now, combined score is same as NLP score
        
        db.commit()
        return jsonify({
            "message": "Survey submitted successfully with sentiment analysis",
            "session_id": session_id,
            "avg_depression_score": avg_nlp_score
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()
