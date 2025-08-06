from db.connection import get_connection

db = get_connection()
cursor = db.cursor()

try:
    cursor.execute("SELECT force_id, mental_state_score, completion_timestamp FROM weekly_sessions WHERE force_id = '100000001' ORDER BY completion_timestamp DESC LIMIT 5")
    results = cursor.fetchall()
    print('Mental state data for soldier 100000001:')
    for row in results:
        print(f'Force ID: {row[0]}, Mental State Score: {row[1]}, Date: {row[2]}')
        
    # Also check all recent mental state scores
    print('\nAll recent mental state scores:')
    cursor.execute("SELECT force_id, mental_state_score, completion_timestamp FROM weekly_sessions WHERE mental_state_score IS NOT NULL ORDER BY completion_timestamp DESC LIMIT 10")
    results = cursor.fetchall()
    for row in results:
        print(f'Force ID: {row[0]}, Mental State Score: {row[1]}, Date: {row[2]}')
finally:
    cursor.close()
    db.close()
