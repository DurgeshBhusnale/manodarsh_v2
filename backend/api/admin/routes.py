from flask import Blueprint, request, jsonify
from db.connection import get_connection
from services.translation_service import translate_to_hindi, translate_to_english
import logging

# Set up logging
logger = logging.getLogger(__name__)

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
            'questionnaire_id': questionnaire_id
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
import logging
from datetime import datetime
import io

# Set up logging
logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)

def get_mental_state_analysis(score):
    """Determine mental state based on combined depression score (0-3 scale)"""
    if score <= 0.5:
        return {
            'state': 'EXCELLENT MENTAL HEALTH',
            'level': 'GREEN',
            'description': 'Positive emotional state, no concerns',
            'recommendation': 'Continue normal duties'
        }
    elif score <= 1.0:
        return {
            'state': 'GOOD MENTAL HEALTH',  
            'level': 'GREEN',
            'description': 'Stable emotional state with minor stress indicators',
            'recommendation': 'Continue normal duties, light monitoring'
        }
    elif score <= 1.5:
        return {
            'state': 'MILD CONCERN',
            'level': 'YELLOW',
            'description': 'Moderate stress/negative mood detected',
            'recommendation': 'Weekly check-ins, monitor closely'
        }
    elif score <= 2.0:
        return {
            'state': 'MODERATE DEPRESSION',
            'level': 'ORANGE', 
            'description': 'Significant negative emotional indicators',
            'recommendation': 'Counseling recommended, bi-weekly assessments'
        }
    elif score <= 2.5:
        return {
            'state': 'HIGH DEPRESSION',
            'level': 'RED',
            'description': 'Strong depression indicators, requires attention',
            'recommendation': 'Immediate counseling, modified duties'
        }
    else:
        return {
            'state': 'CRITICAL MENTAL HEALTH',
            'level': 'CRITICAL',
            'description': 'Severe depression/distress indicators',
            'recommendation': 'URGENT: Immediate professional intervention required'
        }


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


@admin_bp.route('/soldiers-report', methods=['GET'])
def get_soldiers_report():
    """Get real soldiers report data from database with filtering and pagination"""
    db = get_connection()
    cursor = db.cursor()
    
    try:
        # Get query parameters for filtering
        risk_level = request.args.get('risk_level', 'all')  # all, low, mid, high, critical
        days_filter = request.args.get('days', '7')  # 3, 7, 30, 180
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Calculate offset for pagination
        offset = (page - 1) * per_page
        
        # Build date filter condition
        date_conditions = {
            '3': 'ws.completion_timestamp >= DATE_SUB(NOW(), INTERVAL 3 DAY)',
            '7': 'ws.completion_timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
            '30': 'ws.completion_timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
            '180': 'ws.completion_timestamp >= DATE_SUB(NOW(), INTERVAL 180 DAY)'
        }
        date_condition = date_conditions.get(days_filter, date_conditions['7'])
        
        # Build risk level filter
        risk_conditions = {
            'low': 'latest_scores.combined_avg_score <= 1.0',
            'mid': 'latest_scores.combined_avg_score > 1.0 AND latest_scores.combined_avg_score <= 2.0',
            'high': 'latest_scores.combined_avg_score > 2.0 AND latest_scores.combined_avg_score <= 2.5',
            'critical': 'latest_scores.combined_avg_score > 2.5'
        }
        
        # Simplified and more robust query approach
        # First, let's get all soldiers and then join with their latest sessions
        
        # Get all soldiers first
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
            
            # Get latest session for this soldier within date range
            session_query = f"""
            SELECT 
                ws.session_id,
                ws.combined_avg_score,
                ws.nlp_avg_score,
                ws.image_avg_score,
                ws.completion_timestamp,
                q.title as questionnaire_title
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
            
            # Determine risk level
            if combined_score <= 1.0:
                risk_level_calc = 'LOW'
            elif combined_score <= 2.0:
                risk_level_calc = 'MID'
            elif combined_score <= 2.5:
                risk_level_calc = 'HIGH'
            else:
                risk_level_calc = 'CRITICAL'
            
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
                "recommendation": mental_state['recommendation']
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
                "days": days_filter
            },
            "message": "Real soldiers data fetched successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching soldiers report: {e}")
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
        
        # 1. Total Soldiers
        cursor.execute("SELECT COUNT(*) FROM users WHERE user_type = 'soldier'")
        total_soldiers = cursor.fetchone()[0] or 0
        
        # 2. Active Questionnaires
        cursor.execute("SELECT COUNT(*) FROM questionnaires WHERE status = 'Active'")
        active_surveys = cursor.fetchone()[0] or 0
        
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
        
        for soldier in soldiers_data:
            score = float(soldier[1])
            if score > 0:  # Only count soldiers with actual scores
                total_score += score
                scored_soldiers += 1
                
                risk_level = settings.get_risk_level(score)
                if risk_level == 'HIGH':
                    high_risk_count += 1
                elif risk_level == 'CRITICAL':
                    critical_alerts += 1
                    high_risk_count += 1  # Critical is also high risk
        
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
        
        # Prepare response
        dashboard_stats = {
            'totalSoldiers': total_soldiers,
            'activeSurveys': active_surveys,
            'highRiskSoldiers': high_risk_count,
            'criticalAlerts': critical_alerts,
            'surveyCompletionRate': round(completion_rate, 1),
            'averageMentalHealthScore': round(avg_mental_health_score, 3),
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
