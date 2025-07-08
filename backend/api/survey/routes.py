from flask import Blueprint, request, jsonify
from db.connection import get_connection

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

        # Insert responses
        for response in responses:
            # Fill all NOT NULL columns with defaults if not provided
            # nlp_depression_score, image_depression_score, combined_depression_score are nullable, so pass None
            cursor.execute("""
                INSERT INTO question_responses 
                (session_id, question_id, answer_text, nlp_depression_score, image_depression_score, combined_depression_score)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                session_id,
                response['question_id'],
                response['answer_text'],
                None,  # nlp_depression_score
                None,  # image_depression_score
                None   # combined_depression_score
            ))

        db.commit()
        return jsonify({"message": "Survey submitted successfully"}), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()
