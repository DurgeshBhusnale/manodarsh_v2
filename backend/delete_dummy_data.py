from db.connection import get_connection, release_connection
from datetime import datetime, timedelta

# Sample force_ids used in dummy users
dummy_soldiers = ["100000001", "100000002", "100000003"]
admin_id = "200000001"

def delete_dummy_data():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        print("Deleting dummy data...")

        # Delete in dependency order
        cursor.execute("DELETE FROM weekly_aggregated_scores WHERE force_id IN (%s, %s, %s)", dummy_soldiers)
        cursor.execute("DELETE FROM daily_depression_scores WHERE force_id IN (%s, %s, %s)", dummy_soldiers)
        cursor.execute("DELETE FROM cctv_detections WHERE force_id IN (%s, %s, %s)", dummy_soldiers)
        cursor.execute("DELETE FROM cctv_daily_monitoring")

        cursor.execute("DELETE FROM question_responses")
        cursor.execute("DELETE FROM weekly_sessions WHERE force_id IN (%s, %s, %s)", dummy_soldiers)
        cursor.execute("DELETE FROM questions")
        cursor.execute("DELETE FROM questionnaires")
        cursor.execute("DELETE FROM users WHERE force_id IN (%s, %s, %s, %s)", (admin_id, *dummy_soldiers))

        conn.commit()
        print("✅ Dummy data deleted successfully.")
    except Exception as e:
        print("❌ Error deleting dummy data:", e)
        conn.rollback()
    finally:
        cursor.close()
        release_connection(conn)

if __name__ == '__main__':
    delete_dummy_data()
