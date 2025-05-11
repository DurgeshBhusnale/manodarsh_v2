from db.connection import get_connection, release_connection
from datetime import datetime, timedelta

# Sample force_ids used in dummy users
dummy_soldiers = ["100000001", "100000002", "100000003"]
admin_id = "200000001"

def insert_dummy_data():
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Users with correct hashes
        users = [
            ("200000001", "$2b$12$/ut9lTTVvcqj7XmR5l71b.huCLg6lLUhDSYQOWFOnL3X2lC3SzjSm", "admin"),       # admin123
            ("100000001", "$2b$12$xDOSBxFahty99A9c.Kosp.Ndw6.S5m8yuUiv/I0ZrE6zqo6pL6GiC", "soldier"),  # soldier123
            ("100000002", "$2b$12$OQL7ugJsrZT/1rgREvcx5OwiA9FppvdQYkdVgt5qyVwQ4/Ylwyr36", "soldier"),  # soldier234
            ("100000003", "$2b$12$JyzHO5suCGnjD4D.1y799.A0wTcnAdvDB50QuP0SXbJbculDLBMT6", "soldier")   # soldier345
        ]

        # First, delete existing users to avoid conflicts
        cursor.execute("DELETE FROM users")
        
        # Then insert users with new hashes
        for force_id, hashed_pw, role in users:
            cursor.execute(
                """
                INSERT INTO users (force_id, password_hash, user_type, created_at)
                VALUES (%s, %s, %s, NOW())
                """, (force_id, hashed_pw, role)
            )

        # Questionnaires
        cursor.execute("""
            INSERT INTO questionnaires (title, description, status, created_at)
            VALUES ('Weekly Mental Health Check', 'Standard weekly assessment for emotional well-being.', 'Active', NOW())
        """)

        cursor.execute("SELECT LAST_INSERT_ID()")
        questionnaire_id = cursor.fetchone()[0]

        # Questions
        questions = [
            "How do you feel today?",
            "Did you experience any stress this week?",
            "Are you sleeping well?",
            "Do you feel emotionally supported?"
        ]

        question_ids = []
        for q in questions:
            cursor.execute("""
                INSERT INTO questions (questionnaire_id, question_text, created_at)
                VALUES (%s, %s, NOW())
            """, (questionnaire_id, q))
            cursor.execute("SELECT LAST_INSERT_ID()")
            question_ids.append(cursor.fetchone()[0])

        # Weekly Sessions + Question Responses
        for i, force_id in enumerate(dummy_soldiers):
            session_start = datetime.now() - timedelta(days=7 * (i + 1))
            cursor.execute("""
                INSERT INTO weekly_sessions (force_id, questionnaire_id, year, start_timestamp, completion_timestamp, status, nlp_avg_score, image_avg_score, combined_avg_score)
                VALUES (%s, %s, %s, %s, %s, 'completed', 0.6, 0.7, 0.65)
            """, (force_id, questionnaire_id, session_start.year, session_start, session_start + timedelta(minutes=5)))

            cursor.execute("SELECT LAST_INSERT_ID()")
            session_id = cursor.fetchone()[0]

            for question_id in question_ids:
                cursor.execute("""
                    INSERT INTO question_responses (session_id, question_id, answer_text, nlp_depression_score, image_depression_score, combined_depression_score)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    session_id,
                    question_id,
                    "I am feeling okay.",
                    0.5,
                    0.6,
                    0.55
                ))

        # CCTV Daily Monitoring
        for i in range(3):
            day = datetime.now().date() - timedelta(days=i)
            cursor.execute("""
                INSERT INTO cctv_daily_monitoring (date, start_time, end_time, status)
                VALUES (%s, %s, %s, %s)
            """, (day, "08:00:00", "18:00:00", "completed"))

            cursor.execute("SELECT LAST_INSERT_ID()")
            monitoring_id = cursor.fetchone()[0]

            for force_id in dummy_soldiers:
                cursor.execute("""
                    INSERT INTO cctv_detections (monitoring_id, force_id, detection_timestamp, depression_score)
                    VALUES (%s, %s, %s, %s)
                """, (
                    monitoring_id,
                    force_id,
                    datetime.now() - timedelta(hours=1),
                    0.65
                ))

        # Daily Depression Scores
        for force_id in dummy_soldiers:
            cursor.execute("""
                INSERT INTO daily_depression_scores (force_id, date, avg_depression_score, detection_count)
                VALUES (%s, %s, %s, %s)
            """, (force_id, datetime.now().date(), 0.68, 5))

        # Weekly Aggregated Scores
        for force_id in dummy_soldiers:
            cursor.execute("""
                INSERT INTO weekly_aggregated_scores (force_id, year, questionnaire_score, cctv_score, combined_weekly_score, risk_level)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (force_id, datetime.now().year, 0.6, 0.7, 0.65, 'medium'))

        conn.commit()
        print("✅ Dummy data inserted successfully with correct password hashes.")

    except Exception as e:
        print("❌ Error inserting dummy data:", e)
        conn.rollback()
    finally:
        cursor.close()
        release_connection(conn)

if __name__ == '__main__':
    insert_dummy_data()
# This script inserts dummy data into the database for testing purposes.
