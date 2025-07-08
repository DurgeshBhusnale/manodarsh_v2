from flask import Blueprint, request, jsonify
from db.connection import get_connection
from services.translation_service import translate_to_hindi

admin_bp = Blueprint('admin', __name__)


# Translation endpoint for question (English to Hindi)
@admin_bp.route('/translate-question', methods=['POST'])
def translate_question():
    try:
        data = request.json
        english_text = data.get('question_text', '')
        if not english_text:
            return jsonify({'error': 'No question_text provided'}), 400
        hindi_text = translate_to_hindi(english_text)
        return jsonify({'hindi_text': hindi_text}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Translation endpoint for answer (Hindi to English)
@admin_bp.route('/translate-answer', methods=['POST'])
def translate_answer():
    try:
        data = request.json
        hindi_text = data.get('answer_text', '')
        if not hindi_text:
            return jsonify({'error': 'No answer_text provided'}), 400
        from services.translation_service import translate_to_english
        english_text = translate_to_english(hindi_text)
        return jsonify({'english_text': english_text}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
from flask import Blueprint, request, jsonify
from db.connection import get_connection


@admin_bp.route('/create-questionnaire', methods=['POST'])
def create_questionnaire():
    db = get_connection()
    cursor = db.cursor()

    try:
        data = request.json
        title = data['title']
        description = data['description']
        is_active = data['isActive']
        number_of_questions = data['numberOfQuestions']

        # If the new questionnaire is active, mark all other questionnaires as inactive
        if is_active:
            cursor.execute("""
                UPDATE questionnaires
                SET status = 'Inactive'
                WHERE status = 'Active'
            """)

        # Insert the questionnaire
        cursor.execute("""
            INSERT INTO questionnaires (title, description, status, total_questions, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (title, description, 'Active' if is_active else 'Inactive', number_of_questions))
        
        questionnaire_id = cursor.lastrowid
        db.commit()

        return jsonify({
            "message": "Questionnaire created successfully",
            "id": questionnaire_id
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@admin_bp.route('/add-question', methods=['POST'])
def add_question():
    db = get_connection()
    cursor = db.cursor()

    try:
        data = request.json
        questionnaire_id = data['questionnaire_id']
        question_text = data['question_text']
        # Accept question_text_hindi if provided, else default to empty string or duplicate English
        question_text_hindi = data.get('question_text_hindi', '')
        if not question_text_hindi:
            question_text_hindi = question_text  # fallback to English if Hindi not provided

        # Insert the question
        cursor.execute("""
            INSERT INTO questions (questionnaire_id, question_text, question_text_hindi, created_at)
            VALUES (%s, %s, %s, NOW())
        """, (questionnaire_id, question_text, question_text_hindi))
        
        question_id = cursor.lastrowid
        db.commit()

        return jsonify({
            "message": "Question added successfully",
            "id": question_id
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()
