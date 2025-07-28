#!/usr/bin/env python3
"""
Debug Flask app and test questionnaires API endpoint
"""

import sys
import traceback

def test_flask_app():
    """Test Flask app startup and questionnaires endpoint"""
    try:
        print("🚀 Testing Flask app startup...")
        
        # Test imports first
        print("📦 Testing imports...")
        from flask import Flask
        from flask_cors import CORS
        print("  ✅ Flask imports successful")
        
        from api.admin.routes import admin_bp
        print("  ✅ Admin blueprint import successful")
        
        from config.settings import settings
        print("  ✅ Settings import successful")
        
        # Create Flask app
        print("🔧 Creating Flask app...")
        app = Flask(__name__)
        
        # Configure CORS
        CORS(app, resources={
            r"/api/*": {
                "origins": [settings.FRONTEND_URL],
                "methods": ["GET", "POST", "PUT", "DELETE"],
                "allow_headers": ["Content-Type"]
            }
        })
        print("  ✅ CORS configured")
        
        # Register blueprints
        print("📋 Registering blueprints...")
        app.register_blueprint(admin_bp, url_prefix='/api/admin')
        print("  ✅ Admin blueprint registered")
        
        # Test questionnaires endpoint
        print("🧪 Testing questionnaires endpoint...")
        with app.test_client() as client:
            print("  📡 Making GET request to /api/admin/questionnaires...")
            response = client.get('/api/admin/questionnaires')
            
            print(f"  📊 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.get_json()
                    if data and 'questionnaires' in data:
                        count = len(data['questionnaires'])
                        print(f"  ✅ Success! Found {count} questionnaires")
                        
                        # Show first questionnaire as sample
                        if count > 0:
                            first_q = data['questionnaires'][0]
                            print(f"  📋 Sample questionnaire: {first_q.get('title')} ({first_q.get('status')})")
                    else:
                        print(f"  ⚠️  Unexpected response format: {data}")
                except Exception as e:
                    print(f"  ❌ Error parsing JSON: {e}")
                    print(f"  📄 Raw response: {response.get_data(as_text=True)}")
            else:
                print(f"  ❌ HTTP Error {response.status_code}")
                print(f"  📄 Response: {response.get_data(as_text=True)}")
        
        print("\n🎉 Flask app test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error in Flask app test: {e}")
        traceback.print_exc()
        return False

def test_direct_function():
    """Test the get_questionnaires function directly"""
    try:
        print("\n🔬 Testing get_questionnaires function directly...")
        
        from api.admin.routes import get_questionnaires
        from flask import Flask
        
        app = Flask(__name__)
        with app.app_context():
            with app.test_request_context():
                result = get_questionnaires()
                
                if isinstance(result, tuple):
                    response_data, status_code = result
                    print(f"  📊 Status Code: {status_code}")
                    
                    if hasattr(response_data, 'get_json'):
                        data = response_data.get_json()
                        if data and 'questionnaires' in data:
                            count = len(data['questionnaires'])
                            print(f"  ✅ Direct function test successful! Found {count} questionnaires")
                        else:
                            print(f"  ⚠️  Unexpected response format: {data}")
                    else:
                        print(f"  📄 Response: {response_data}")
                else:
                    print(f"  📄 Unexpected result format: {result}")
                    
    except Exception as e:
        print(f"❌ Error in direct function test: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    print("🐛 Debug Script for CRPF Mental Health System")
    print("=" * 50)
    
    # Test Flask app
    app_success = test_flask_app()
    
    # Test direct function
    test_direct_function()
    
    print("\n" + "=" * 50)
    if app_success:
        print("✅ All tests passed! The Flask app should work correctly.")
        print("💡 If frontend still shows 404, check:")
        print("   1. Backend server is running on port 5000")
        print("   2. Frontend is making requests to http://localhost:5000")
        print("   3. No firewall blocking the connection")
    else:
        print("❌ Tests failed. Check the errors above.")