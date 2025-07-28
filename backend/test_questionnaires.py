#!/usr/bin/env python3
"""
Quick test script to check questionnaires in the database
"""

from db.connection import get_connection
import json

def test_questionnaires():
    """Test the questionnaires endpoint functionality"""
    try:
        print("🔍 Testing questionnaires database access...")
        
        # Get database connection
        db = get_connection()
        if not db:
            print("❌ Failed to connect to database")
            return
            
        cursor = db.cursor()
        
        # Check if questionnaires table exists
        cursor.execute("SHOW TABLES LIKE 'questionnaires'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("❌ Questionnaires table does not exist")
            return
        
        print("✅ Questionnaires table exists")
        
        # Check questionnaires count
        cursor.execute("SELECT COUNT(*) FROM questionnaires")
        count = cursor.fetchone()[0]
        print(f"📊 Total questionnaires in database: {count}")
        
        if count == 0:
            print("⚠️  No questionnaires found in database")
            print("🔧 You need to run insert_dummy_data.py first")
            return
        
        # Test the exact query used in the API
        cursor.execute("""
            SELECT questionnaire_id, title, description, status, total_questions, created_at
            FROM questionnaires
            ORDER BY created_at DESC
        """)
        
        results = cursor.fetchall()
        print(f"🎯 Found {len(results)} questionnaires:")
        
        questionnaires = []
        for row in results:
            questionnaire = {
                "id": row[0],
                "title": row[1],
                "description": row[2],
                "status": row[3],
                "total_questions": row[4],
                "created_at": row[5].strftime("%Y-%m-%d %H:%M:%S") if row[5] else None
            }
            questionnaires.append(questionnaire)
            print(f"  - {questionnaire['id']}: {questionnaire['title']} ({questionnaire['status']})")
        
        # Test JSON serialization (same as API response)
        api_response = {"questionnaires": questionnaires}
        json_response = json.dumps(api_response, indent=2)
        print(f"\n📋 API Response would be:")
        print(json_response[:500] + "..." if len(json_response) > 500 else json_response)
        
        print("\n✅ Database test completed successfully!")
        
    except Exception as e:
        print(f"❌ Error testing questionnaires: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    test_questionnaires()
