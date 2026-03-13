
from flask import Blueprint, request, jsonify, send_file
from db.connection import get_connection
from services.translation_service import translate_to_hindi, translate_to_english
from services.model_preloader_service import ModelPreloaderService
from fpdf import FPDF
import logging
from datetime import datetime
import io

# Set up logging
logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)

# PHASE 2 OPTIMIZATION: Model preloader status endpoint
@admin_bp.route('/model-preloader-status', methods=['GET'])
def get_model_preloader_status():
    """Get current status of model preloader service"""
    try:
        model_preloader = ModelPreloaderService.get_instance()
        status = model_preloader.get_status()
        return jsonify(status), 200
    except Exception as e:
        logger.error(f"Error getting model preloader status: {e}")
        return jsonify({'error': str(e)}), 500


# Translation endpoint for question (English to Hindi)
@admin_bp.route('/translate-question', methods=['POST'])
def translate_question():
    try:
        data = request.json
        english_text = data.get('question_text', '')
        
        if not english_text:
            return jsonify({'error': 'No question_text provided'}), 400
        
        if not english_text.strip():
            return jsonify({'error': 'Empty question_text provided'}), 400
        
        # Attempt translation with timeout and error handling
        try:
            hindi_text = translate_to_hindi(english_text)
            
            # Validate translation result
            if not hindi_text:
                logger.error(f"Translation service returned empty result for: {english_text}")
                return jsonify({
                    'error': 'Translation service failed to generate result',
                    'error_type': 'TRANSLATION_EMPTY'
                }), 500
            
            if not hindi_text.strip():
                logger.error(f"Translation service returned whitespace-only result for: {english_text}")
                return jsonify({
                    'error': 'Translation service returned invalid result',
                    'error_type': 'TRANSLATION_INVALID'
                }), 500
                
            # Log successful translation for monitoring
            logger.info(f"Successfully translated: '{english_text}' -> '{hindi_text}'")
            
            return jsonify({'hindi_text': hindi_text}), 200
            
        except ConnectionError as e:
            logger.error(f"Network error during translation: {e}")
            return jsonify({
                'error': 'Network connection failed. Please check your internet connection.',
                'error_type': 'NETWORK_ERROR'
            }), 503
            
        except TimeoutError as e:
            logger.error(f"Timeout error during translation: {e}")
            return jsonify({
                'error': 'Translation request timed out. Please try again.',
                'error_type': 'TIMEOUT_ERROR'
            }), 504
            
        except Exception as translation_error:
            logger.error(f"Translation service error: {translation_error}")
            return jsonify({
                'error': 'Translation service is temporarily unavailable.',
                'error_type': 'SERVICE_ERROR',
                'details': str(translation_error) if logger.level <= logging.DEBUG else None
            }), 500
            
    except Exception as e:
        logger.error(f"Unexpected error in translate_question endpoint: {e}")
        return jsonify({
            'error': 'An unexpected error occurred during translation.',
            'error_type': 'SYSTEM_ERROR'
        }), 500


# Translation endpoint for answer (Hindi to English)
@admin_bp.route('/translate-answer', methods=['POST'])
def translate_answer():
    try:
        data = request.json
        hindi_text = data.get('answer_text', '')
        if not hindi_text:
            return jsonify({'error': 'No answer_text provided'}), 400
        
        english_text = translate_to_english(hindi_text)
        return jsonify({'english_text': english_text}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
            cursor.execute("UPDATE questionnaires SET status = 'Inactive'")

        # Insert the new questionnaire
        cursor.execute("""
            INSERT INTO questionnaires (title, description, status, total_questions, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (title, description, 'Active' if is_active else 'Inactive', number_of_questions))
        
        questionnaire_id = cursor.lastrowid
        db.commit()

        return jsonify({
            'message': 'Questionnaire created successfully',
            'id': questionnaire_id
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/questionnaires', methods=['GET'])
def get_questionnaires():
    db = get_connection()
    cursor = db.cursor()

    try:
        cursor.execute("""
            SELECT questionnaire_id, title, description, status, total_questions, created_at
            FROM questionnaires
            ORDER BY created_at DESC
        """)
        
        questionnaires = [
            {
                "id": row[0],
                "title": row[1],
                "description": row[2],
                "status": row[3],
                "total_questions": row[4],
                "created_at": row[5].strftime("%Y-%m-%d %H:%M:%S") if row[5] else None
            }
            for row in cursor.fetchall()
        ]

        return jsonify({"questionnaires": questionnaires}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/questionnaires/<int:questionnaire_id>', methods=['GET'])
def get_questionnaire_details(questionnaire_id):
    """Get detailed information about a specific questionnaire including its questions"""
    db = get_connection()
    cursor = db.cursor()

    try:
        # Get questionnaire details
        cursor.execute("""
            SELECT questionnaire_id, title, description, status, total_questions, created_at
            FROM questionnaires
            WHERE questionnaire_id = %s
        """, (questionnaire_id,))
        
        questionnaire_data = cursor.fetchone()
        
        if not questionnaire_data:
            return jsonify({"error": "Questionnaire not found"}), 404
        
        questionnaire = {
            "id": questionnaire_data[0],
            "title": questionnaire_data[1],
            "description": questionnaire_data[2],
            "status": questionnaire_data[3],
            "total_questions": questionnaire_data[4],
            "created_at": questionnaire_data[5].strftime("%Y-%m-%d %H:%M:%S") if questionnaire_data[5] else None
        }
        
        # Get questions for this questionnaire
        cursor.execute("""
            SELECT question_id, question_text, question_text_hindi, created_at
            FROM questions
            WHERE questionnaire_id = %s
            ORDER BY question_id ASC
        """, (questionnaire_id,))
        
        questions_data = cursor.fetchall()
        questions = []
        
        for q_data in questions_data:
            questions.append({
                "id": q_data[0],
                "question_text": q_data[1],
                "question_text_hindi": q_data[2],
                "created_at": q_data[3].strftime("%Y-%m-%d %H:%M:%S") if q_data[3] else None
            })
        
        questionnaire["questions"] = questions
        
        return jsonify({"questionnaire": questionnaire}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/questionnaires/<int:questionnaire_id>', methods=['DELETE'])
def delete_questionnaire(questionnaire_id):
    """Delete a questionnaire and all its associated data"""
    db = get_connection()
    cursor = db.cursor()
    
    try:
        # Get force_delete parameter from request
        data = request.get_json() or {}
        force_delete = data.get('force_delete', False)
        
        # Check if questionnaire exists
        cursor.execute("""
            SELECT questionnaire_id, status FROM questionnaires 
            WHERE questionnaire_id = %s
        """, (questionnaire_id,))
        
        questionnaire = cursor.fetchone()
        
        if not questionnaire:
            return jsonify({"error": "Questionnaire not found"}), 404
        
        # Check if it's the active questionnaire
        if questionnaire[1] == 'Active':
            return jsonify({"error": "Cannot delete the active questionnaire. Please activate another questionnaire first."}), 400
        
        # Check if there are any survey responses for this questionnaire
        cursor.execute("""
            SELECT COUNT(*) FROM weekly_sessions 
            WHERE questionnaire_id = %s
        """, (questionnaire_id,))
        
        session_count = cursor.fetchone()[0]
        
        # If there are responses and force_delete is not set, return warning
        if session_count > 0 and not force_delete:
            return jsonify({
                "warning": True,
                "session_count": session_count,
                "message": f"The questionnaire has {session_count} survey responses. Deleting the questionnaire will delete those responses too. Do you want to proceed?"
            }), 200
        
        # If force_delete is True or no sessions exist, proceed with deletion
        if session_count > 0:
            # Get all session IDs for this questionnaire
            cursor.execute("""
                SELECT session_id FROM weekly_sessions 
                WHERE questionnaire_id = %s
            """, (questionnaire_id,))
            
            session_ids = [row[0] for row in cursor.fetchall()]
            
            if session_ids:
                # Delete mental state responses
                session_ids_str = ','.join(map(str, session_ids))
                cursor.execute(f"""
                    DELETE FROM mental_state_responses 
                    WHERE session_id IN ({session_ids_str})
                """)
                
                # Delete question responses
                cursor.execute(f"""
                    DELETE FROM question_responses 
                    WHERE session_id IN ({session_ids_str})
                """)
                
                # Delete weekly sessions
                cursor.execute("""
                    DELETE FROM weekly_sessions 
                    WHERE questionnaire_id = %s
                """, (questionnaire_id,))
        
        # Delete all questions associated with this questionnaire
        cursor.execute("""
            DELETE FROM questions WHERE questionnaire_id = %s
        """, (questionnaire_id,))
        
        # Delete the questionnaire
        cursor.execute("""
            DELETE FROM questionnaires WHERE questionnaire_id = %s
        """, (questionnaire_id,))
        
        db.commit()
        
        return jsonify({
            "success": True, 
            "message": f"Questionnaire deleted successfully{f' along with {session_count} survey responses' if session_count > 0 else ''}",
            "deleted_id": questionnaire_id,
            "deleted_responses": session_count
        }), 200
        
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


# Add soldier endpoint for admin
@admin_bp.route('/add-soldier', methods=['POST'])
def add_soldier():
    import bcrypt
    data = request.get_json()
    force_id = data.get('force_id')
    password = data.get('password')
    if not force_id or not password:
        return jsonify({'error': 'User ID and password required'}), 400
    # Hash the password using bcrypt
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password_bytes, salt)
    db = get_connection()
    cursor = db.cursor()
    try:
        cursor.execute("INSERT INTO users (force_id, password_hash, user_type) VALUES (%s, %s, 'soldier')", (force_id, password_hash))
        db.commit()
        return jsonify({'message': 'Soldier added successfully!'}), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        db.close()

@admin_bp.route('/create-question', methods=['POST'])
def create_question():
    db = get_connection()
    cursor = db.cursor()

    try:
        data = request.json
        questionnaire_id = data['questionnaire_id']
        question_text = data['question_text']
        question_text_hindi = data.get('question_text_hindi', '')

        # Insert the new question
        cursor.execute("""
            INSERT INTO questions (questionnaire_id, question_text, question_text_hindi, created_at)
            VALUES (%s, %s, %s, NOW())
        """, (questionnaire_id, question_text, question_text_hindi))
        
        question_id = cursor.lastrowid
        db.commit()

        return jsonify({
            'message': 'Question created successfully',
            'question_id': question_id
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        db.close()

def get_mental_state_analysis(score):
    """Determine mental state based on combined score using dynamic thresholds from database"""
    from api.survey.routes import get_dynamic_risk_thresholds
    
    # Get current risk thresholds from database
    risk_thresholds = get_dynamic_risk_thresholds()
    
    if score >= risk_thresholds['CRITICAL']:
        return {
            'state': 'CRITICAL MENTAL HEALTH',
            'level': 'CRITICAL',
            'description': 'Severe depression/distress indicators',
            'recommendation': 'URGENT: Immediate professional intervention required'
        }
    elif score >= risk_thresholds['HIGH']:
        return {
            'state': 'MODERATE DEPRESSION',
            'level': 'ORANGE',
            'description': 'Significant negative emotional indicators',
            'recommendation': 'Counseling recommended, bi-weekly assessments'
        }
    elif score >= risk_thresholds['MEDIUM']:
        return {
            'state': 'MILD CONCERN',
            'level': 'YELLOW',
            'description': 'Moderate stress/negative mood detected',
            'recommendation': 'Weekly check-ins, monitor closely'
        }
    elif score >= risk_thresholds['LOW']:
        return {
            'state': 'GOOD MENTAL HEALTH',
            'level': 'GREEN',
            'description': 'Stable emotional state with minor stress indicators',
            'recommendation': 'Continue normal duties, light monitoring'
        }
    else:
        return {
            'state': 'EXCELLENT MENTAL HEALTH',
            'level': 'GREEN',
            'description': 'Positive emotional state, no concerns',
            'recommendation': 'Continue normal duties'
        }


@admin_bp.route('/add-question', methods=['POST'])
def add_question():
    db = get_connection()
    cursor = db.cursor()

    try:
        data = request.json
        questionnaire_id = data['questionnaire_id']
        question_text = data['question_text']
        
        # Get Hindi translation if not provided
        question_text_hindi = data.get('question_text_hindi', '')
        if not question_text_hindi:
            # Automatically translate English to Hindi
            question_text_hindi = translate_to_hindi(question_text)

        # Insert the question with both English and Hindi versions
        cursor.execute("""
            INSERT INTO questions (questionnaire_id, question_text, question_text_hindi, created_at)
            VALUES (%s, %s, %s, NOW())
        """, (questionnaire_id, question_text, question_text_hindi))
        
        question_id = cursor.lastrowid
        db.commit()

        return jsonify({
            "message": "Question added successfully",
            "id": question_id,
            "question_text": question_text,
            "question_text_hindi": question_text_hindi
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/questions/<int:question_id>', methods=['PUT'])
def update_question(question_id):
    """Update an existing question (English text and auto-translate to Hindi)"""
    db = get_connection()
    cursor = db.cursor()

    try:
        data = request.json
        question_text = data.get('question_text', '').strip()
        
        if not question_text:
            return jsonify({"error": "Question text is required"}), 400
        
        # Check if question exists and get its questionnaire_id
        cursor.execute("""
            SELECT q.question_id, q.questionnaire_id, qn.status 
            FROM questions q
            JOIN questionnaires qn ON q.questionnaire_id = qn.questionnaire_id
            WHERE q.question_id = %s
        """, (question_id,))
        
        question_data = cursor.fetchone()
        
        if not question_data:
            return jsonify({"error": "Question not found"}), 404
        
        questionnaire_status = question_data[2]
        
        # Check if questionnaire is active (don't allow editing active questionnaire questions)
        if questionnaire_status == 'Active':
            return jsonify({
                "error": "Cannot edit questions from an active questionnaire. Please deactivate it first."
            }), 400
        
        # Auto-translate to Hindi
        try:
            question_text_hindi = translate_to_hindi(question_text)
        except Exception as translation_error:
            logger.error(f"Translation error during question update: {translation_error}")
            return jsonify({
                "error": "Translation service failed. Please try again.",
                "error_type": "TRANSLATION_ERROR"
            }), 500
        
        # Update the question
        cursor.execute("""
            UPDATE questions 
            SET question_text = %s, question_text_hindi = %s
            WHERE question_id = %s
        """, (question_text, question_text_hindi, question_id))
        
        db.commit()
        
        return jsonify({
            "message": "Question updated successfully",
            "id": question_id,
            "question_text": question_text,
            "question_text_hindi": question_text_hindi
        }), 200

    except Exception as e:
        db.rollback()
        logger.error(f"Error updating question: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/questions/<int:question_id>', methods=['DELETE'])
def delete_question(question_id):
    """Delete an individual question from a questionnaire"""
    db = get_connection()
    cursor = db.cursor()

    try:
        # Check if question exists and get its questionnaire info
        cursor.execute("""
            SELECT q.question_id, q.questionnaire_id, qn.status, qn.total_questions
            FROM questions q
            JOIN questionnaires qn ON q.questionnaire_id = qn.questionnaire_id
            WHERE q.question_id = %s
        """, (question_id,))
        
        question_data = cursor.fetchone()
        
        if not question_data:
            return jsonify({"error": "Question not found"}), 404
        
        questionnaire_id = question_data[1]
        questionnaire_status = question_data[2]
        total_questions = question_data[3]
        
        # Check if questionnaire is active
        if questionnaire_status == 'Active':
            return jsonify({
                "error": "Cannot delete questions from an active questionnaire. Please deactivate it first."
            }), 400
        
        # Prevent deletion if it's the only question
        if total_questions <= 1:
            return jsonify({
                "error": "Cannot delete the only question. A questionnaire must have at least one question."
            }), 400
        
        # Delete the question (CASCADE will handle related responses)
        cursor.execute("DELETE FROM questions WHERE question_id = %s", (question_id,))
        
        # Update the total_questions count in questionnaires table
        cursor.execute("""
            UPDATE questionnaires 
            SET total_questions = total_questions - 1
            WHERE questionnaire_id = %s
        """, (questionnaire_id,))
        
        db.commit()
        
        return jsonify({
            "message": "Question deleted successfully",
            "questionnaire_id": questionnaire_id
        }), 200

    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting question: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/soldiers-report', methods=['GET'])
def get_soldiers_report():
    """Get real soldiers report data from database with filtering and pagination"""
    db = get_connection()
    cursor = db.cursor()
    
    try:
        # Get query parameters for filtering
        risk_level = request.args.get('risk_level', 'all')  # all, low, mid, high, critical
        date_filter = request.args.get('date', '')  # specific date in YYYY-MM-DD format
        force_id_filter = request.args.get('force_id', '')  # specific force ID filter
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Calculate offset for pagination
        offset = (page - 1) * per_page
        
        # Build date filter condition - if no date provided, use today's date
        if date_filter:
            date_condition = f"DATE(ws.completion_timestamp) = '{date_filter}'"
        else:
            date_condition = "DATE(ws.completion_timestamp) = CURDATE()"
        
        # Note: Risk level filtering is now done in Python after data retrieval
        # to ensure consistency with dynamic thresholds from database settings
        
        # Simplified and more robust query approach
        # First, let's get all soldiers and then join with their latest sessions
        
        # Get all soldiers first (with optional force_id filter)
        if force_id_filter.strip():
            soldiers_query = """
            SELECT force_id, user_type, created_at 
            FROM users 
            WHERE user_type = 'soldier' AND force_id LIKE %s
            """
            cursor.execute(soldiers_query, (f'%{force_id_filter}%',))
        else:
            soldiers_query = """
            SELECT force_id, user_type, created_at 
            FROM users 
            WHERE user_type = 'soldier'
            """
            cursor.execute(soldiers_query)
        all_soldiers = cursor.fetchall()
        
        soldiers_report = []
        
        for soldier in all_soldiers:
            force_id = soldier[0]
            
            # Get latest session for this soldier on the specified date
            session_query = f"""
            SELECT 
                ws.session_id,
                ws.combined_avg_score,
                ws.nlp_avg_score,
                ws.image_avg_score,
                ws.completion_timestamp,
                q.title as questionnaire_title,
                ws.mental_state_score
            FROM weekly_sessions ws
            LEFT JOIN questionnaires q ON ws.questionnaire_id = q.questionnaire_id
            WHERE ws.force_id = %s 
            AND {date_condition}
            ORDER BY ws.completion_timestamp DESC
            LIMIT 1
            """
            
            cursor.execute(session_query, (force_id,))
            session_data = cursor.fetchone()
            
            # Get CCTV stats for this soldier
            cctv_query = f"""
            SELECT COUNT(*) as total_detections, AVG(ws.image_avg_score) as avg_score
            FROM weekly_sessions ws
            WHERE ws.force_id = %s 
            AND {date_condition}
            AND ws.image_avg_score > 0
            """
            
            cursor.execute(cctv_query, (force_id,))
            cctv_data = cursor.fetchone()
            
            # Calculate scores and mental state
            combined_score = session_data[1] if session_data and session_data[1] else 0
            nlp_score = session_data[2] if session_data and session_data[2] else 0
            image_score = session_data[3] if session_data and session_data[3] else 0
            mental_state_score = session_data[6] if session_data and session_data[6] else None
            
            # Determine risk level using dynamic thresholds from database
            from api.survey.routes import get_dynamic_risk_thresholds
            risk_thresholds = get_dynamic_risk_thresholds()
            
            if combined_score >= risk_thresholds['CRITICAL']:
                risk_level_calc = 'CRITICAL'
            elif combined_score >= risk_thresholds['HIGH']:
                risk_level_calc = 'HIGH'
            elif combined_score >= risk_thresholds['MEDIUM']:
                risk_level_calc = 'MID'
            else:
                risk_level_calc = 'LOW'
            
            mental_state = get_mental_state_analysis(combined_score)
            
            soldiers_report.append({
                "force_id": force_id,
                "name": f"Soldier {force_id}",
                "latest_session_id": session_data[0] if session_data else None,
                "combined_score": round(combined_score, 3),
                "nlp_score": round(nlp_score, 3),
                "image_score": round(image_score, 3),
                "last_survey_date": session_data[4].strftime("%Y-%m-%d %H:%M") if session_data and session_data[4] else None,
                "questionnaire_title": session_data[5] if session_data else "No Survey",
                "risk_level": risk_level_calc,
                "total_cctv_detections": int(cctv_data[0]) if cctv_data and cctv_data[0] else 0,
                "avg_cctv_score": round(cctv_data[1], 3) if cctv_data and cctv_data[1] else 0,
                "mental_state": mental_state['state'],
                "alert_level": mental_state['level'],
                "recommendation": mental_state['recommendation'],
                "mental_state_score": mental_state_score
            })
        
        # Apply risk level filtering
        if risk_level != 'all' and risk_level in ['low', 'mid', 'high', 'critical']:
            risk_filter_map = {'low': 'LOW', 'mid': 'MID', 'high': 'HIGH', 'critical': 'CRITICAL'}
            soldiers_report = [s for s in soldiers_report if s['risk_level'] == risk_filter_map[risk_level]]
        
        # Apply pagination
        total_count = len(soldiers_report)
        start_idx = offset
        end_idx = offset + per_page
        paginated_soldiers = soldiers_report[start_idx:end_idx]
        
        # Calculate pagination info
        total_pages = (total_count + per_page - 1) // per_page
        
        return jsonify({
            "soldiers": paginated_soldiers,
            "pagination": {
                "current_page": page,
                "per_page": per_page,
                "total_count": total_count,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            },
            "filters": {
                "risk_level": risk_level,
                "date": date_filter if date_filter else datetime.now().strftime('%Y-%m-%d'),
                "force_id": force_id_filter
            },
            "message": "Real users data fetched successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching soldiers report: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/soldiers/<string:force_id>/survey-history', methods=['GET'])
def get_soldier_survey_history(force_id):
    """Get all survey responses for a specific soldier"""
    db = get_connection()
    cursor = db.cursor()
    
    try:
        # Verify soldier exists
        cursor.execute("SELECT force_id FROM users WHERE force_id = %s", (force_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Soldier not found"}), 404
        
        # Get all completed surveys for this soldier with questionnaire details
        query = """
        SELECT 
            ws.session_id,
            ws.completion_timestamp,
            ws.nlp_avg_score,
            ws.image_avg_score,
            ws.combined_avg_score,
            ws.mental_state_score,
            q.title as questionnaire_title,
            q.questionnaire_id
        FROM weekly_sessions ws
        LEFT JOIN questionnaires q ON ws.questionnaire_id = q.questionnaire_id
        WHERE ws.force_id = %s 
        AND ws.status = 'completed'
        AND ws.completion_timestamp IS NOT NULL
        ORDER BY ws.completion_timestamp DESC
        """
        
        cursor.execute(query, (force_id,))
        surveys = cursor.fetchall()
        
        survey_history = []
        for survey in surveys:
            # Compute risk level using dynamic thresholds (same logic as soldiers-report)
            from api.survey.routes import get_dynamic_risk_thresholds

            combined_score_val = survey[4] if survey[4] is not None else 0
            risk_thresholds = get_dynamic_risk_thresholds()

            if combined_score_val >= risk_thresholds.get('CRITICAL', 0.85):
                risk_level_calc = 'CRITICAL'
            elif combined_score_val >= risk_thresholds.get('HIGH', 0.7):
                risk_level_calc = 'HIGH'
            elif combined_score_val >= risk_thresholds.get('MEDIUM', 0.5):
                risk_level_calc = 'MID'
            else:
                risk_level_calc = 'LOW'

            survey_history.append({
                'session_id': survey[0],
                'completion_date': survey[1].strftime("%Y-%m-%d %H:%M:%S") if survey[1] else None,
                'nlp_score': round(survey[2], 2) if survey[2] else 0,
                'emotion_score': round(survey[3], 2) if survey[3] else 0,
                'combined_score': round(combined_score_val, 2) if combined_score_val else 0,
                'mental_state_score': survey[5],
                'questionnaire_title': survey[6] or 'Unknown',
                'questionnaire_id': survey[7],
                'risk_level': risk_level_calc
            })
        
        return jsonify({
            'force_id': force_id,
            'survey_history': survey_history,
            'total_surveys': len(survey_history)
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching survey history for {force_id}: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/soldiers/<string:force_id>/survey-history/download-pdf', methods=['GET'])
def download_soldier_history_pdf(force_id):
    """Download PDF of soldier's survey history"""
    db = get_connection()
    cursor = db.cursor()
    
    try:
        # Get survey history
        query = """
        SELECT 
            ws.completion_timestamp,
            ws.nlp_avg_score,
            ws.image_avg_score,
            ws.combined_avg_score,
            q.title as questionnaire_title
        FROM weekly_sessions ws
        LEFT JOIN questionnaires q ON ws.questionnaire_id = q.questionnaire_id
        WHERE ws.force_id = %s 
        AND ws.status = 'completed'
        AND ws.completion_timestamp IS NOT NULL
        ORDER BY ws.completion_timestamp DESC
        """
        
        cursor.execute(query, (force_id,))
        surveys = cursor.fetchall()
        
        if not surveys:
            return jsonify({"error": "No survey history found"}), 404
        
        # Create PDF with enhanced design (match users report styling)
        pdf = FPDF()
        pdf.add_page()

        # Header background
        pdf.set_fill_color(41, 128, 185)  # Professional blue
        pdf.rect(10, 10, 190, 25, 'F')

        # Title
        pdf.set_text_color(255, 255, 255)
        pdf.set_font('Arial', 'B', 18)
        pdf.set_xy(10, 18)
        pdf.cell(190, 10, "Survey History Report", 0, 1, 'C')

        # Reset text color
        pdf.set_text_color(0, 0, 0)
        pdf.ln(10)

        # Metadata box
        pdf.set_font('Arial', 'B', 10)
        pdf.set_fill_color(245, 245, 245)
        pdf.rect(10, pdf.get_y(), 190, 15, 'F')
        pdf.cell(95, 5, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 0, 0)
        pdf.cell(95, 5, f"Total Surveys: {len(surveys)}", 0, 1)
        pdf.ln(12)

        # Table headers
        pdf.set_font('Arial', 'B', 9)
        col_widths = [40, 55, 28, 32, 35]  # Total = 190
        headers = ['Date', 'Questionnaire', 'Text Score', 'Emotion Score', 'Combined Score']

        pdf.set_fill_color(52, 73, 94)
        pdf.set_text_color(255, 255, 255)
        for i, header in enumerate(headers):
            pdf.cell(col_widths[i], 10, header, 1, 0, 'C', True)
        pdf.ln()

        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Arial', '', 8)

        # Table rows
        for i, survey in enumerate(surveys):
            date_str = survey[0].strftime("%Y-%m-%d %H:%M") if survey[0] else 'N/A'
            questionnaire = (survey[4] or 'Unknown')[:30]
            text_score = f"{survey[1]:.2f}" if survey[1] else '0.00'
            emotion_score = f"{survey[2]:.2f}" if survey[2] else '0.00'
            combined_score = f"{survey[3]:.2f}" if survey[3] else '0.00'

            # Alternating row colors
            if i % 2 == 0:
                pdf.set_fill_color(249, 249, 249)
            else:
                pdf.set_fill_color(255, 255, 255)

            row_data = [date_str, questionnaire, text_score, emotion_score, combined_score]
            for j, cell_data in enumerate(row_data):
                pdf.cell(col_widths[j], 8, cell_data, 1, 0, 'C', fill=True)
            pdf.ln()

        # Summary section
        pdf.ln(10)
        pdf.set_font('Arial', 'B', 14)
        pdf.set_fill_color(52, 152, 219)
        pdf.set_text_color(255, 255, 255)
        pdf.rect(10, pdf.get_y(), 190, 10, 'F')
        pdf.cell(0, 10, "Summary Statistics", 0, 1, 'C')
        pdf.set_text_color(0, 0, 0)
        pdf.ln(2)

        total_surveys = len(surveys)
        total_combined = 0
        valid_scores = 0
        for survey in surveys:
            combined_val = survey[3]
            if combined_val:
                total_combined += combined_val
                valid_scores += 1
        avg_combined = total_combined / valid_scores if valid_scores > 0 else 0

        pdf.set_font('Arial', 'B', 11)
        pdf.set_fill_color(240, 248, 255)
        pdf.rect(10, pdf.get_y(), 190, 6, 'F')
        pdf.cell(0, 6, f"User ID: {force_id}", 0, 1)

        pdf.set_font('Arial', '', 10)
        pdf.set_fill_color(240, 248, 255)
        pdf.rect(10, pdf.get_y(), 190, 5, 'F')
        pdf.cell(0, 5, f"Total Surveys: {total_surveys}", 0, 1)

        pdf.set_fill_color(240, 248, 255)
        pdf.rect(10, pdf.get_y(), 190, 5, 'F')
        pdf.cell(0, 5, f"Average Combined Score: {avg_combined:.3f}", 0, 1)
        
        # Output PDF to BytesIO
        pdf_output = io.BytesIO()
        pdf_bytes = pdf.output()
        
        # Handle both bytes and str output
        if isinstance(pdf_bytes, str):
            pdf_output.write(pdf_bytes.encode('latin1'))
        else:
            pdf_output.write(pdf_bytes)
        
        pdf_output.seek(0)
        
        return send_file(
            pdf_output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'survey_history_{force_id}.pdf'
        )
        
    except Exception as e:
        logger.error(f"Error generating PDF for {force_id}: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/soldiers/<string:force_id>/survey-history/download-csv', methods=['GET'])
def download_soldier_history_csv(force_id):
    """Download CSV of soldier's survey history"""
    db = get_connection()
    cursor = db.cursor()
    
    try:
        # Get survey history
        query = """
        SELECT 
            ws.completion_timestamp,
            ws.nlp_avg_score,
            ws.image_avg_score,
            ws.combined_avg_score,
            q.title as questionnaire_title
        FROM weekly_sessions ws
        LEFT JOIN questionnaires q ON ws.questionnaire_id = q.questionnaire_id
        WHERE ws.force_id = %s 
        AND ws.status = 'completed'
        AND ws.completion_timestamp IS NOT NULL
        ORDER BY ws.completion_timestamp DESC
        """
        
        cursor.execute(query, (force_id,))
        surveys = cursor.fetchall()
        
        if not surveys:
            return jsonify({"error": "No survey history found"}), 404
        
        # Create CSV
        output = io.StringIO()
        output.write('Date,Questionnaire,Text Score,Emotion Score,Combined Score\n')
        
        for survey in surveys:
            date_str = survey[0].strftime("%Y-%m-%d %H:%M") if survey[0] else 'N/A'
            questionnaire = (survey[4] or 'Unknown').replace(',', ';')
            nlp = f"{survey[1]:.1f}" if survey[1] else '0.0'
            emotion = f"{survey[2]:.1f}" if survey[2] else '0.0'
            combined = f"{survey[3]:.1f}" if survey[3] else '0.0'
            output.write(f'{date_str},{questionnaire},{nlp},{emotion},{combined}\n')
        
        # Convert to bytes
        csv_bytes = io.BytesIO(output.getvalue().encode('utf-8'))
        
        return send_file(
            csv_bytes,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'survey_history_{force_id}.csv'
        )
        
    except Exception as e:
        logger.error(f"Error generating CSV for {force_id}: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/soldiers/<string:force_id>/sessions/<int:session_id>', methods=['DELETE'])
def delete_soldier_session(force_id, session_id):
    """Delete a specific survey session and all related data"""
    db = get_connection()
    cursor = db.cursor()
    
    try:
        # Verify the session exists and belongs to this soldier
        cursor.execute("""
            SELECT session_id, force_id 
            FROM weekly_sessions 
            WHERE session_id = %s AND force_id = %s
        """, (session_id, force_id))
        
        session = cursor.fetchone()
        
        if not session:
            return jsonify({"error": "Session not found or does not belong to this soldier"}), 404
        
        # Delete the session - CASCADE will automatically delete:
        # - question_responses (FK: session_id)
        # - mental_state_responses (FK: session_id)
        cursor.execute("DELETE FROM weekly_sessions WHERE session_id = %s", (session_id,))
        
        db.commit()
        
        logger.info(f"Deleted session {session_id} for soldier {force_id}")
        
        return jsonify({
            "message": "Survey record deleted successfully",
            "session_id": session_id
        }), 200
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting session {session_id} for {force_id}: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """Get real dashboard statistics from database"""
    db = get_connection()
    cursor = db.cursor()
    
    try:
        timeframe = request.args.get('timeframe', '7d')  # 7d, 30d, 90d
        
        # Calculate date range based on timeframe
        from datetime import datetime, timedelta
        today = datetime.now()
        
        if timeframe == '30d':
            start_date = today - timedelta(days=30)
        elif timeframe == '90d':
            start_date = today - timedelta(days=90)
        else:  # default 7d
            start_date = today - timedelta(days=7)
        
        # 1. Total Soldiers (unchanged - meaningful stat)
        cursor.execute("SELECT COUNT(*) FROM users WHERE user_type = 'soldier'")
        total_soldiers = cursor.fetchone()[0] or 0
        
        # 2. REMOVED Active surveys count (always 1, not meaningful)
        # Instead: Get current active survey for completion tracking
        cursor.execute("""
            SELECT questionnaire_id, created_at, title 
            FROM questionnaires 
            WHERE status = 'Active' 
            ORDER BY created_at DESC 
            LIMIT 1
        """)
        active_survey = cursor.fetchone()
        
        # 3. Current Survey Response Statistics (NEW - meaningful replacement)
        current_survey_responses = 0
        current_survey_title = "No Active Survey"
        current_survey_completion_rate = 0
        pending_responses = 0
        
        if active_survey:
            questionnaire_id, activation_date, survey_title = active_survey
            current_survey_title = survey_title
            
            # Count soldiers who completed THIS survey AFTER it was activated
            cursor.execute("""
                SELECT COUNT(DISTINCT ws.force_id)
                FROM weekly_sessions ws
                WHERE ws.questionnaire_id = %s 
                AND ws.status = 'completed'
                AND ws.completion_timestamp >= %s
            """, (questionnaire_id, activation_date))
            
            current_survey_responses = cursor.fetchone()[0] or 0
            
            # Calculate completion percentage and pending responses
            current_survey_completion_rate = (current_survey_responses / total_soldiers * 100) if total_soldiers > 0 else 0
            pending_responses = max(0, total_soldiers - current_survey_responses)
        
        # 3. Get soldiers with their latest mental health scores
        cursor.execute("""
            SELECT u.force_id, 
                   COALESCE(ws.combined_avg_score, 0) as latest_score,
                   ws.completion_timestamp
            FROM users u
            LEFT JOIN (
                SELECT force_id, 
                       combined_avg_score,
                       completion_timestamp,
                       ROW_NUMBER() OVER (PARTITION BY force_id ORDER BY completion_timestamp DESC) as rn
                FROM weekly_sessions 
                WHERE completion_timestamp IS NOT NULL
                  AND questionnaire_id = (
                      SELECT questionnaire_id
                      FROM questionnaires
                      WHERE status = 'Active'
                      ORDER BY created_at DESC
                      LIMIT 1
                  )
            ) ws ON u.force_id = ws.force_id AND ws.rn = 1
            WHERE u.user_type = 'soldier'
        """)
        soldiers_data = cursor.fetchall()
        
        # Calculate risk levels based on current settings
        from config.settings import settings
        high_risk_count = 0
        critical_alerts = 0
        total_score = 0
        scored_soldiers = 0
        
        # Initialize risk distribution counters
        risk_distribution = {
            'low': 0,
            'medium': 0,
            'high': 0,
            'critical': 0,
            'noData': 0
        }
        
        for soldier in soldiers_data:
            score = float(soldier[1])
            if score > 0:  # Only count soldiers with actual scores
                total_score += score
                scored_soldiers += 1
                
                risk_level = settings.get_risk_level(score)
                if risk_level == 'HIGH':
                    high_risk_count += 1
                    risk_distribution['high'] += 1
                elif risk_level == 'CRITICAL':
                    critical_alerts += 1
                    high_risk_count += 1  # Critical is also high risk
                    risk_distribution['critical'] += 1
                elif risk_level == 'MEDIUM':
                    risk_distribution['medium'] += 1
                elif risk_level == 'LOW':
                    risk_distribution['low'] += 1
            else:
                # Soldier has no score data
                risk_distribution['noData'] += 1
        
        # 4. Survey completion rate (within timeframe)
        cursor.execute("""
            SELECT 
                COUNT(*) as total_sessions,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions
            FROM weekly_sessions 
            WHERE start_timestamp >= %s
        """, (start_date,))
        
        completion_data = cursor.fetchone()
        total_sessions = completion_data[0] or 0
        completed_sessions = completion_data[1] or 0
        completion_rate = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        # 5. Average mental health score
        avg_mental_health_score = (total_score / scored_soldiers) if scored_soldiers > 0 else 0
        
        # 6. Trends data for the past week
        cursor.execute("""
            SELECT 
                DATE(ws.completion_timestamp) as date,
                COUNT(*) as total,
                SUM(CASE WHEN ws.combined_avg_score <= %s THEN 1 ELSE 0 END) as low,
                SUM(CASE WHEN ws.combined_avg_score > %s AND ws.combined_avg_score <= %s THEN 1 ELSE 0 END) as medium,
                SUM(CASE WHEN ws.combined_avg_score > %s AND ws.combined_avg_score <= %s THEN 1 ELSE 0 END) as high,
                SUM(CASE WHEN ws.combined_avg_score > %s THEN 1 ELSE 0 END) as critical
            FROM weekly_sessions ws
            WHERE ws.completion_timestamp >= %s 
            AND ws.completion_timestamp IS NOT NULL
            GROUP BY DATE(ws.completion_timestamp)
            ORDER BY date
        """, (
            settings.RISK_THRESHOLDS['LOW'],
            settings.RISK_THRESHOLDS['LOW'], settings.RISK_THRESHOLDS['MEDIUM'],
            settings.RISK_THRESHOLDS['MEDIUM'], settings.RISK_THRESHOLDS['HIGH'],
            settings.RISK_THRESHOLDS['HIGH'],
            start_date
        ))
        
        trends_raw = cursor.fetchall()
        
        # Format trends data
        labels = []
        low_counts = []
        medium_counts = []
        high_counts = []
        critical_counts = []
        
        # Fill in the last 7 days even if no data
        for i in range(7):
            date = (today - timedelta(days=6-i)).date()
            labels.append(date.strftime('%a'))
            
            # Find data for this date
            found = False
            for trend in trends_raw:
                if trend[0] == date:
                    low_counts.append(int(trend[2]))
                    medium_counts.append(int(trend[3]))
                    high_counts.append(int(trend[4]))
                    critical_counts.append(int(trend[5]))
                    found = True
                    break
            
            if not found:
                low_counts.append(0)
                medium_counts.append(0)
                high_counts.append(0)
                critical_counts.append(0)
        
        # Prepare response with improved meaningful statistics
        dashboard_stats = {
            'totalSoldiers': total_soldiers,
            # REMOVED: 'activeSurveys' (not meaningful - always 1)
            
            # NEW: Current Survey Statistics (meaningful replacement)
            'currentSurveyResponses': current_survey_responses,
            'currentSurveyTitle': current_survey_title,
            'currentSurveyCompletionRate': round(current_survey_completion_rate, 1),
            'pendingResponses': pending_responses,
            
            # Existing meaningful stats (unchanged)
            'highRiskSoldiers': high_risk_count,
            'criticalAlerts': critical_alerts,
            'surveyCompletionRate': round(completion_rate, 1),  # Overall completion rate
            'averageMentalHealthScore': round(avg_mental_health_score, 3),
            'riskDistribution': risk_distribution,
            'trendsData': {
                'labels': labels,
                'riskLevels': {
                    'low': low_counts,
                    'medium': medium_counts,
                    'high': high_counts,
                    'critical': critical_counts
                }
            },
            'timeframe': timeframe,
            'lastUpdated': datetime.now().isoformat()
        }
        
        return jsonify(dashboard_stats), 200
        
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/search-soldiers', methods=['POST'])
def search_soldiers():
    """Advanced search functionality for soldiers"""
    db = get_connection()
    cursor = db.cursor()
    
    try:
        data = request.json
        search_term = data.get('searchTerm', '')
        filters = data.get('filters', {})
        
        # Build the base query
        query = """
            SELECT DISTINCT s.force_id, s.name, s.rank, s.unit, s.created_at,
                   COALESCE(AVG(sv.combined_depression_score), 0) as avg_score,
                   COUNT(sv.survey_id) as survey_count,
                   MAX(sv.created_at) as last_survey_date
            FROM soldiers s
            LEFT JOIN surveys sv ON s.force_id = sv.force_id
            WHERE 1=1
        """
        params = []
        
        # Add search term filter
        if search_term:
            query += " AND (s.force_id LIKE %s OR s.name LIKE %s OR s.unit LIKE %s)"
            search_pattern = f"%{search_term}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        # Add risk level filter
        risk_levels = filters.get('riskLevels', [])
        if risk_levels:
            # We'll filter based on average score ranges
            risk_conditions = []
            for risk in risk_levels:
                if risk == 'LOW':
                    risk_conditions.append("COALESCE(AVG(sv.combined_depression_score), 0) <= 0.3")
                elif risk == 'MEDIUM':
                    risk_conditions.append("COALESCE(AVG(sv.combined_depression_score), 0) BETWEEN 0.3 AND 0.5")
                elif risk == 'HIGH':
                    risk_conditions.append("COALESCE(AVG(sv.combined_depression_score), 0) BETWEEN 0.5 AND 0.7")
                elif risk == 'CRITICAL':
                    risk_conditions.append("COALESCE(AVG(sv.combined_depression_score), 0) > 0.7")
            
            if risk_conditions:
                query += f" AND ({' OR '.join(risk_conditions)})"
        
        # Add unit filter
        units = filters.get('units', [])
        if units:
            placeholders = ','.join(['%s'] * len(units))
            query += f" AND s.unit IN ({placeholders})"
            params.extend(units)
        
        # Add date range filter
        start_date = filters.get('startDate')
        end_date = filters.get('endDate')
        if start_date:
            query += " AND sv.created_at >= %s"
            params.append(start_date)
        if end_date:
            query += " AND sv.created_at <= %s"
            params.append(end_date)
        
        # Group by soldier
        query += " GROUP BY s.force_id, s.name, s.rank, s.unit, s.created_at"
        
        # Add score range filter (after GROUP BY)
        score_min = filters.get('scoreMin')
        score_max = filters.get('scoreMax')
        having_conditions = []
        
        if score_min is not None:
            having_conditions.append("COALESCE(AVG(sv.combined_depression_score), 0) >= %s")
            params.append(score_min)
        
        if score_max is not None:
            having_conditions.append("COALESCE(AVG(sv.combined_depression_score), 0) <= %s")
            params.append(score_max)
        
        if having_conditions:
            query += f" HAVING {' AND '.join(having_conditions)}"
        
        # Add sorting
        sort_by = filters.get('sortBy', 'created_at')
        sort_order = filters.get('sortOrder', 'desc')
        
        if sort_by == 'name':
            query += f" ORDER BY s.name {sort_order.upper()}"
        elif sort_by == 'unit':
            query += f" ORDER BY s.unit {sort_order.upper()}"
        elif sort_by == 'score':
            query += f" ORDER BY avg_score {sort_order.upper()}"
        elif sort_by == 'last_survey':
            query += f" ORDER BY last_survey_date {sort_order.upper()}"
        else:
            query += f" ORDER BY s.created_at {sort_order.upper()}"
        
        # Add pagination
        page = filters.get('page', 1)
        page_size = filters.get('pageSize', 20)
        offset = (page - 1) * page_size
        
        query += " LIMIT %s OFFSET %s"
        params.extend([page_size, offset])
        
        # Execute search query
        cursor.execute(query, params)
        results = cursor.fetchall()
        
        # Format results
        soldiers = []
        for row in results:
            # Determine risk level based on average score
            avg_score = float(row[5])
            if avg_score <= 0.3:
                risk_level = 'LOW'
            elif avg_score <= 0.5:
                risk_level = 'MEDIUM'
            elif avg_score <= 0.7:
                risk_level = 'HIGH'
            else:
                risk_level = 'CRITICAL'
            
            soldiers.append({
                'force_id': row[0],
                'name': row[1],
                'rank': row[2],
                'unit': row[3],
                'created_at': row[4].isoformat() if row[4] else None,
                'avg_score': avg_score,
                'risk_level': risk_level,
                'survey_count': int(row[6]),
                'last_survey_date': row[7].isoformat() if row[7] else None
            })
        
        # Get total count for pagination
        count_query = """
            SELECT COUNT(DISTINCT s.force_id)
            FROM soldiers s
            LEFT JOIN surveys sv ON s.force_id = sv.force_id
            WHERE 1=1
        """
        count_params = []
        
        # Apply same filters for count (without pagination and sorting)
        if search_term:
            count_query += " AND (s.force_id LIKE %s OR s.name LIKE %s OR s.unit LIKE %s)"
            search_pattern = f"%{search_term}%"
            count_params.extend([search_pattern, search_pattern, search_pattern])
        
        if units:
            placeholders = ','.join(['%s'] * len(units))
            count_query += f" AND s.unit IN ({placeholders})"
            count_params.extend(units)
        
        if start_date:
            count_query += " AND sv.created_at >= %s"
            count_params.append(start_date)
        if end_date:
            count_query += " AND sv.created_at <= %s"
            count_params.append(end_date)
        
        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()[0]
        
        return jsonify({
            'soldiers': soldiers,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        }), 200
        
    except Exception as e:
        logger.error(f"Error searching soldiers: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()


@admin_bp.route('/download-soldiers-pdf', methods=['POST'])
def download_soldiers_pdf():
    """Generate and download PDF report from provided soldiers data (no DB access)"""
    try:
        data = request.json
        soldiers_data = data.get('soldiers', [])
        filters = data.get('filters', {})
        report_title = data.get('report_title', 'Users Survey Report')
        
        if not soldiers_data:
            return jsonify({'error': 'No Users data provided'}), 400
        
        # Create PDF with enhanced design
        pdf = FPDF()
        pdf.add_page()
        
        # Add header background rectangle
        pdf.set_fill_color(41, 128, 185)  # Professional blue background
        pdf.rect(10, 10, 190, 25, 'F')
        
        # Title with white text on blue background
        pdf.set_text_color(255, 255, 255)  # White text
        pdf.set_font('Arial', 'B', 18)
        pdf.set_xy(10, 18)
        pdf.cell(190, 10, report_title, 0, 1, 'C')
        
        # Reset text color to black
        pdf.set_text_color(0, 0, 0)
        pdf.ln(10)
        
        # Report metadata with enhanced styling
        pdf.set_font('Arial', 'B', 10)
        pdf.set_fill_color(245, 245, 245)  # Light gray background
        pdf.rect(10, pdf.get_y(), 190, 15, 'F')
        pdf.cell(95, 5, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 0, 0)
        pdf.cell(95, 5, f"Total Records: {len(soldiers_data)}", 0, 1)
        pdf.ln(15)
        
        # Applied filters with enhanced styling
        if filters:
            pdf.set_font('Arial', 'B', 12)
            pdf.set_fill_color(52, 152, 219)  # Blue background
            pdf.set_text_color(255, 255, 255)  # White text
            pdf.rect(10, pdf.get_y(), 190, 8, 'F')
            pdf.cell(0, 8, "Applied Filters:", 0, 1, 'C')
            pdf.set_text_color(0, 0, 0)  # Reset to black
            pdf.set_font('Arial', '', 10)
            
            if filters.get('risk_level') and filters.get('risk_level') != 'all':
                pdf.cell(0, 5, f"Risk Level: {filters.get('risk_level', '').upper()}", 0, 1)
            if filters.get('days'):
                pdf.cell(0, 5, f"Time Period: Last {filters.get('days')} days", 0, 1)
            if filters.get('force_id'):
                pdf.cell(0, 5, f"User ID Filter: {filters.get('force_id')}", 0, 1)
            pdf.ln(3)
        
        # Table headers with enhanced design
        pdf.set_font('Arial', 'B', 9)
        
        # Updated header row - adjusted widths to fit within page (total = 190)
        col_widths = [25, 22, 28, 23, 25, 30, 37]  # Total = 190 (fits page width)
        headers = ['User ID', 'Risk Level', 'Combined Score', 'NLP Score', 'Image Score', 'Last Survey', 'Questionnaire']
        
        # Header background
        pdf.set_fill_color(52, 73, 94)  # Dark blue-gray background
        pdf.set_text_color(255, 255, 255)  # White text
        
        for i, header in enumerate(headers):
            pdf.cell(col_widths[i], 10, header, 1, 0, 'C', True)
        pdf.ln()
        
        # Reset text color for data rows
        pdf.set_text_color(0, 0, 0)
        
        # Data rows with enhanced styling
        pdf.set_font('Arial', '', 8)
        
        for i, soldier in enumerate(soldiers_data):
            # Handle potential None values and format data
            force_id = str(soldier.get('force_id', 'N/A'))[:12]  # Fit in 25 width
            risk_level = str(soldier.get('risk_level', 'N/A'))[:10]  # Fit in 22 width
            
            # Better formatting for combined score with proper wrapping
            combined_score_val = soldier.get('combined_score', 0)
            combined_score = f"{combined_score_val:.3f}"
            
            nlp_score = f"{soldier.get('nlp_score', 0):.3f}"
            image_score = f"{soldier.get('image_score', 0):.3f}"
            last_survey = str(soldier.get('last_survey_date', 'N/A'))[:12] if soldier.get('last_survey_date') else 'N/A'
            questionnaire = str(soldier.get('questionnaire_title', 'N/A'))[:22] if soldier.get('questionnaire_title') else 'N/A'  # Fit in 37 width
            
            # Alternating row colors for better readability
            if i % 2 == 0:
                pdf.set_fill_color(249, 249, 249)  # Very light gray
            else:
                pdf.set_fill_color(255, 255, 255)  # White
            
            # Risk level specific highlighting
            if risk_level == 'CRITICAL':
                pdf.set_fill_color(255, 235, 238)  # Light red
            elif risk_level == 'HIGH':
                pdf.set_fill_color(255, 243, 224)  # Light orange
            elif risk_level == 'MID':
                pdf.set_fill_color(255, 251, 230)  # Light yellow
            elif risk_level == 'LOW':
                pdf.set_fill_color(236, 253, 245)  # Light green
            
            # Add row data - removed name and mental_state, added questionnaire
            row_data = [force_id, risk_level, combined_score, nlp_score, image_score, last_survey, questionnaire]
            
            # Use proper cell heights for better text fitting
            cell_height = 8
            for j, cell_data in enumerate(row_data):
                # Special handling for combined score to prevent overflow
                if j == 2:  # Combined score column
                    pdf.cell(col_widths[j], cell_height, cell_data, 1, 0, 'C', fill=True)
                else:
                    pdf.cell(col_widths[j], cell_height, cell_data, 1, 0, 'C', fill=True)
            pdf.ln()
        
        # Enhanced Summary statistics
        pdf.ln(10)
        
        # Summary header with background
        pdf.set_font('Arial', 'B', 14)
        pdf.set_fill_color(52, 152, 219)  # Blue background
        pdf.set_text_color(255, 255, 255)  # White text
        pdf.rect(10, pdf.get_y(), 190, 10, 'F')
        pdf.cell(0, 10, "Summary Statistics", 0, 1, 'C')
        pdf.set_text_color(0, 0, 0)  # Reset to black
        pdf.ln(2)
        
        # Calculate statistics
        total_soldiers = len(soldiers_data)
        risk_counts = {'LOW': 0, 'MID': 0, 'HIGH': 0, 'CRITICAL': 0}
        total_combined_score = 0
        valid_scores = 0
        
        for soldier in soldiers_data:
            risk_level = soldier.get('risk_level', 'LOW')
            if risk_level in risk_counts:
                risk_counts[risk_level] += 1
            
            combined_score = soldier.get('combined_score', 0)
            if combined_score > 0:
                total_combined_score += combined_score
                valid_scores += 1
        
        avg_score = total_combined_score / valid_scores if valid_scores > 0 else 0
        
        # Display statistics in a structured format
        pdf.set_font('Arial', 'B', 11)
        
        # Total soldiers
        pdf.set_fill_color(240, 248, 255)  # Light blue background
        pdf.rect(10, pdf.get_y(), 190, 6, 'F')
        pdf.cell(0, 6, f"Total Users: {total_soldiers}", 0, 1)
        
        # Risk distribution
        pdf.set_font('Arial', '', 10)
        
        # Low Risk
        pdf.set_fill_color(236, 253, 245)  # Light green
        pdf.rect(10, pdf.get_y(), 190, 5, 'F')
        pdf.cell(0, 5, f"Low Risk: {risk_counts['LOW']} ({risk_counts['LOW']/total_soldiers*100:.1f}%)", 0, 1)
        
        # Medium Risk
        pdf.set_fill_color(255, 251, 230)  # Light yellow
        pdf.rect(10, pdf.get_y(), 190, 5, 'F')
        pdf.cell(0, 5, f"Medium Risk: {risk_counts['MID']} ({risk_counts['MID']/total_soldiers*100:.1f}%)", 0, 1)
        
        # High Risk
        pdf.set_fill_color(255, 243, 224)  # Light orange
        pdf.rect(10, pdf.get_y(), 190, 5, 'F')
        pdf.cell(0, 5, f"High Risk: {risk_counts['HIGH']} ({risk_counts['HIGH']/total_soldiers*100:.1f}%)", 0, 1)
        
        # Critical Risk
        pdf.set_fill_color(255, 235, 238)  # Light red
        pdf.rect(10, pdf.get_y(), 190, 5, 'F')
        pdf.cell(0, 5, f"Critical Risk: {risk_counts['CRITICAL']} ({risk_counts['CRITICAL']/total_soldiers*100:.1f}%)", 0, 1)
        
        # Average score
        pdf.set_fill_color(240, 248, 255)  # Light blue background
        pdf.rect(10, pdf.get_y(), 190, 6, 'F')
        pdf.set_font('Arial', 'B', 10)
        pdf.cell(0, 6, f"Average Combined Score: {avg_score:.3f}", 0, 1)
        
        # Enhanced Footer
        pdf.ln(15)
        pdf.set_font('Arial', 'I', 9)
        pdf.set_fill_color(245, 245, 245)  # Light gray background
        pdf.rect(10, pdf.get_y(), 190, 8, 'F')
        pdf.cell(0, 8, "This report contains sensitive health information. Handle with appropriate confidentiality.", 0, 1, 'C')
        
        # Create in-memory file
        pdf_output = io.BytesIO()
        pdf_content = pdf.output(dest='S')
        if isinstance(pdf_content, str):
            pdf_content = pdf_content.encode('latin-1')
        pdf_output.write(pdf_content)
        pdf_output.seek(0)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"Users_report_{timestamp}.pdf"
        
        return send_file(
            pdf_output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"Error generating PDF report: {e}")
        return jsonify({"error": f"Failed to generate PDF: {str(e)}"}), 500


@admin_bp.route('/download-soldiers-csv', methods=['POST'])
def download_soldiers_csv():
    """Generate and download CSV report from provided soldiers data (no DB access)"""
    try:
        import csv
        
        data = request.json
        soldiers_data = data.get('soldiers', [])
        filters = data.get('filters', {})
        
        if not soldiers_data:
            return jsonify({'error': 'No Users data provided'}), 400
        
        # Create CSV content with updated field names (removed: name, total_cctv_detections, avg_cctv_score, mental_state, alert_level, recommendation)
        csv_output = io.StringIO()
        fieldnames = [
            'user_id', 'risk_level', 'combined_score', 'nlp_score',
            'image_score', 'last_survey_date', 'questionnaire_title'
        ]
        
        writer = csv.DictWriter(csv_output, fieldnames=fieldnames)
        
        # Write header
        writer.writeheader()
        
        # Write data rows with only the required fields
        for soldier in soldiers_data:
            # Create a clean row with only the required fields
            row = {
                'user_id': soldier.get('force_id', ''),
                'risk_level': soldier.get('risk_level', ''),
                'combined_score': soldier.get('combined_score', 0),
                'nlp_score': soldier.get('nlp_score', 0),
                'image_score': soldier.get('image_score', 0),
                'last_survey_date': soldier.get('last_survey_date', ''),
                'questionnaire_title': soldier.get('questionnaire_title', '')
            }
            writer.writerow(row)
        
        # Convert to bytes for download
        csv_bytes = io.BytesIO()
        csv_bytes.write(csv_output.getvalue().encode('utf-8'))
        csv_bytes.seek(0)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"users_report_{timestamp}.csv"
        
        return send_file(
            csv_bytes,
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"Error generating CSV report: {e}")
        return jsonify({"error": f"Failed to generate CSV: {str(e)}"}), 500

# ============================================================================
# SOLDIERS ENDPOINT FOR FACE MODEL MANAGEMENT
# ============================================================================

@admin_bp.route('/soldiers', methods=['GET'])
def get_all_soldiers():
    """Get all soldiers from the users table (simplified structure)"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Query with actual table structure
        cursor.execute("""
            SELECT u.force_id, u.created_at
            FROM users u 
            WHERE u.user_type = 'soldier'
            ORDER BY u.force_id
        """)
        
        soldiers = []
        for row in cursor.fetchall():
            soldiers.append({
                'force_id': row[0],
                'name': 'N/A',  # Not available in current schema
                'unit': 'N/A',  # Not available in current schema
                'rank': 'N/A',  # Not available in current schema
                'created_at': row[1].isoformat() if row[1] else None
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'soldiers': soldiers,
            'total_count': len(soldiers)
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching soldiers: {e}")
        return jsonify({'error': str(e)}), 500
