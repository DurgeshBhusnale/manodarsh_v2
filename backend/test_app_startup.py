#!/usr/bin/env python3
"""
Simple Flask app startup test
"""

def test_app_startup():
    try:
        print("🚀 Testing Flask app startup...")
        
        # Import and create app
        from app import create_app
        app = create_app()
        print("✅ Flask app created successfully")
        
        # Test if questionnaires route is registered
        with app.app_context():
            routes = []
            for rule in app.url_map.iter_rules():
                routes.append(f"{rule.methods} {rule.rule}")
            
            questionnaire_routes = [r for r in routes if 'questionnaire' in r.lower()]
            print(f"📋 Found questionnaire routes: {questionnaire_routes}")
            
            admin_routes = [r for r in routes if '/api/admin' in r]
            print(f"🔧 Admin routes: {admin_routes[:5]}...")  # Show first 5
            
        print("✅ App startup test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error during app startup: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_app_startup()
